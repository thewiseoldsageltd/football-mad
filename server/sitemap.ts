import type { Express, Request, Response } from "express";
import { desc } from "drizzle-orm";
import { articles, teams } from "@shared/schema";
import { db } from "./db";

/** Production canonical origin for sitemap URLs only (not derived from request host). */
const SITEMAP_BASE = "https://footballmad.co.uk";
const MAX_ARTICLES = 5000;

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

export function registerSitemapRoute(app: Express): void {
  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    try {
      const chunks: string[] = [];

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

      const teamRows = await db.select({ slug: teams.slug }).from(teams);
      for (const row of teamRows) {
        const slug = String(row.slug ?? "").trim();
        if (!slug) continue;
        chunks.push(urlEntry(absoluteLoc(`/teams/${slug}`)));
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
