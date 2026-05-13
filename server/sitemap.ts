import type { Express, Request, Response } from "express";
import { desc, eq, inArray } from "drizzle-orm";
import { articles, competitions, managers, players, teams } from "@shared/schema";
import { db } from "./db";
import { MvpGraphBoundary } from "./lib/mvp-graph-boundary";

/** Production canonical origin for sitemap URLs only (not derived from request host). */
const SITEMAP_BASE = "https://footballmad.co.uk";
const MAX_ARTICLES = 5000;
const PLAYER_ID_CHUNK = 1000;

const STATIC_PATHS = ["/", "/news", "/matches", "/tables", "/teams"] as const;

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absoluteLoc(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, SITEMAP_BASE).href;
}

function urlEntry(loc: string, lastmod?: Date | null): string {
  const inner = [`<loc>${escapeXml(loc)}</loc>`];
  if (lastmod && !Number.isNaN(lastmod.getTime())) {
    inner.push(`<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>`);
  }
  return `<url>${inner.join("")}</url>`;
}

function competitionPublicSlug(row: { slug: string | null; canonicalSlug: string | null }): string | null {
  const canon = String(row.canonicalSlug ?? "").trim();
  if (canon) return canon;
  const s = String(row.slug ?? "").trim();
  return s || null;
}

export function registerSitemapRoute(app: Express): void {
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const chunks: string[] = [];
      const boundary = new MvpGraphBoundary();

      for (const p of STATIC_PATHS) {
        chunks.push(urlEntry(absoluteLoc(p)));
      }

      const articleRows = await db
        .select({
          slug: articles.slug,
          publishedAt: articles.publishedAt,
          updatedAt: articles.updatedAt,
        })
        .from(articles)
        .orderBy(desc(articles.publishedAt))
        .limit(MAX_ARTICLES);

      for (const row of articleRows) {
        const slug = String(row.slug ?? "").trim();
        if (!slug) continue;
        chunks.push(
          urlEntry(absoluteLoc(`/news/${slug}`), row.updatedAt ?? row.publishedAt ?? null),
        );
      }

      const mvpTeamIdList = Array.from(await boundary.getMvpTeamIds());
      if (mvpTeamIdList.length > 0) {
        const mvpTeamRows = await db
          .select({ slug: teams.slug })
          .from(teams)
          .where(inArray(teams.id, mvpTeamIdList));
        for (const row of mvpTeamRows) {
          const slug = String(row.slug ?? "").trim();
          if (!slug) continue;
          chunks.push(urlEntry(absoluteLoc(`/teams/${slug}`)));
        }
      }

      const mvpCompRows = await db
        .select({
          slug: competitions.slug,
          canonicalSlug: competitions.canonicalSlug,
          createdAt: competitions.createdAt,
        })
        .from(competitions)
        .where(eq(competitions.isPriority, true));
      for (const row of mvpCompRows) {
        const pub = competitionPublicSlug(row);
        if (!pub) continue;
        chunks.push(urlEntry(absoluteLoc(`/competitions/${pub}`), row.createdAt ?? null));
      }

      if (mvpTeamIdList.length > 0) {
        const managerRows = await db
          .select({ slug: managers.slug })
          .from(managers)
          .where(inArray(managers.currentTeamId, mvpTeamIdList));
        for (const row of managerRows) {
          const slug = String(row.slug ?? "").trim();
          if (!slug) continue;
          chunks.push(urlEntry(absoluteLoc(`/managers/${slug}`)));
        }
      }

      const allPlayers = await db.select({ id: players.id, slug: players.slug }).from(players);
      for (let i = 0; i < allPlayers.length; i += PLAYER_ID_CHUNK) {
        const slice = allPlayers.slice(i, i + PLAYER_ID_CHUNK);
        const allowed = await boundary.filterPlayerIds(slice.map((p) => p.id));
        for (const p of slice) {
          if (!allowed.has(p.id)) continue;
          const slug = String(p.slug ?? "").trim();
          if (!slug) continue;
          chunks.push(urlEntry(absoluteLoc(`/players/${slug}`)));
        }
      }

      const xml =
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
        chunks.join("") +
        `</urlset>`;

      res.setHeader("Cache-Control", "public, max-age=3600");
      res.type("application/xml").send(xml);
    } catch (err) {
      console.error("[sitemap.xml]", err);
      res.status(500).type("text/plain").send("Internal Server Error");
    }
  });
}
