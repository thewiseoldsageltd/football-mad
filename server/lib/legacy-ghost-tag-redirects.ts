import type { Express, Request, Response } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { competitions, managers, paEntityAliasMap, players, teams } from "@shared/schema";
import { ARTICLE_SOURCE_PA_MEDIA } from "./sources";
import { MvpGraphBoundary } from "./mvp-graph-boundary";
import { computeMvpIndexable } from "./mvp-indexing";
import { resolveCanonicalCompetitionSlug, resolveCanonicalTeamPublicSlug } from "./canonical-entity-slugs";

/** Allowlist for query strings preserved on 301 from legacy Ghost tag URLs. */
function harmlessQuerySuffix(originalUrl: string): string {
  const qIndex = originalUrl.indexOf("?");
  if (qIndex < 0) return "";
  const params = new URLSearchParams(originalUrl.slice(qIndex + 1));
  const out = new URLSearchParams();
  for (const [key, value] of Array.from(params.entries())) {
    const kl = key.toLowerCase();
    if (kl.startsWith("utm_") || kl === "gclid" || kl === "fbclid") {
      out.set(key, value);
    }
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

function normalizeGhostTagSlug(raw: string | undefined): string | null {
  if (raw == null) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  const t = decoded.trim().toLowerCase();
  if (!t || t.includes("/") || t.includes("..")) return null;
  return t;
}

async function findCompetitionIdForLegacyTag(norm: string): Promise<string | null> {
  const rows = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(or(eq(competitions.canonicalSlug, norm), eq(competitions.slug, norm)))
    .limit(2);
  if (rows.length === 1) return rows[0].id;
  if (rows.length > 1) return null;

  const aliasRows = await db
    .select({ id: competitions.id })
    .from(paEntityAliasMap)
    .innerJoin(competitions, eq(paEntityAliasMap.entityId, competitions.id))
    .where(
      and(
        eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
        inArray(paEntityAliasMap.entityType, ["competition", "competitions"]),
        eq(paEntityAliasMap.publicSlug, norm),
      ),
    )
    .limit(2);
  if (aliasRows.length !== 1) return null;
  return aliasRows[0].id;
}

async function findTeamIdForLegacyTag(norm: string): Promise<string | null> {
  const internalRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, norm))
    .limit(2);
  if (internalRows.length === 1) return internalRows[0].id;
  if (internalRows.length > 1) return null;

  const aliasRows = await db
    .select({ entityId: paEntityAliasMap.entityId })
    .from(paEntityAliasMap)
    .where(
      and(
        eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
        inArray(paEntityAliasMap.entityType, ["team", "teams"]),
        eq(paEntityAliasMap.publicSlug, norm),
      ),
    )
    .limit(2);
  if (aliasRows.length !== 1) return null;
  return aliasRows[0].entityId;
}

async function findPlayerForLegacyTag(norm: string): Promise<{ id: string; urlSlug: string } | null> {
  const bySlug = await db
    .select({ id: players.id, slug: players.slug })
    .from(players)
    .where(eq(players.slug, norm))
    .limit(2);
  if (bySlug.length === 1) {
    const s = bySlug[0].slug?.trim();
    if (!s) return null;
    return { id: bySlug[0].id, urlSlug: s };
  }
  if (bySlug.length > 1) return null;

  const aliasRows = await db
    .select({ entityId: paEntityAliasMap.entityId })
    .from(paEntityAliasMap)
    .where(
      and(
        eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
        inArray(paEntityAliasMap.entityType, ["player", "players"]),
        eq(paEntityAliasMap.publicSlug, norm),
      ),
    )
    .limit(2);
  if (aliasRows.length !== 1) return null;
  const [p] = await db
    .select({ id: players.id, slug: players.slug })
    .from(players)
    .where(eq(players.id, aliasRows[0].entityId))
    .limit(1);
  const s = p?.slug?.trim();
  if (!p || !s) return null;
  return { id: p.id, urlSlug: s };
}

async function findManagerForLegacyTag(norm: string): Promise<{ id: string; urlSlug: string } | null> {
  const bySlug = await db
    .select({ id: managers.id, slug: managers.slug })
    .from(managers)
    .where(eq(managers.slug, norm))
    .limit(2);
  if (bySlug.length === 1) {
    const s = bySlug[0].slug?.trim();
    if (!s) return null;
    return { id: bySlug[0].id, urlSlug: s };
  }
  if (bySlug.length > 1) return null;

  const aliasRows = await db
    .select({ entityId: paEntityAliasMap.entityId })
    .from(paEntityAliasMap)
    .where(
      and(
        eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
        inArray(paEntityAliasMap.entityType, ["manager", "managers"]),
        eq(paEntityAliasMap.publicSlug, norm),
      ),
    )
    .limit(2);
  if (aliasRows.length !== 1) return null;
  const [m] = await db
    .select({ id: managers.id, slug: managers.slug })
    .from(managers)
    .where(eq(managers.id, aliasRows[0].entityId))
    .limit(1);
  const s = m?.slug?.trim();
  if (!m || !s) return null;
  return { id: m.id, urlSlug: s };
}

async function handleLegacyGhostTag(req: Request, res: Response): Promise<void> {
  const norm = normalizeGhostTagSlug(req.params.slug);
  if (!norm) {
    res.sendStatus(404);
    return;
  }

  const qs = harmlessQuerySuffix(req.originalUrl || "");
  const boundary = new MvpGraphBoundary();

  const competitionId = await findCompetitionIdForLegacyTag(norm);
  if (competitionId) {
    const mvpIndexable = await computeMvpIndexable(boundary, {
      entityType: "competition",
      entityId: competitionId,
    });
    if (!mvpIndexable) {
      res.sendStatus(404);
      return;
    }
    const pathSlug = (await resolveCanonicalCompetitionSlug(norm)) ?? norm;
    res.redirect(301, `/competitions/${pathSlug}${qs}`);
    return;
  }

  const teamId = await findTeamIdForLegacyTag(norm);
  if (teamId) {
    const mvpIndexable = await computeMvpIndexable(boundary, {
      entityType: "team",
      entityId: teamId,
    });
    if (!mvpIndexable) {
      res.sendStatus(404);
      return;
    }
    const pathSlug = (await resolveCanonicalTeamPublicSlug(norm)) ?? norm;
    res.redirect(301, `/teams/${pathSlug}${qs}`);
    return;
  }

  const player = await findPlayerForLegacyTag(norm);
  if (player) {
    const mvpIndexable = await computeMvpIndexable(boundary, {
      entityType: "player",
      entityId: player.id,
    });
    if (!mvpIndexable) {
      res.sendStatus(404);
      return;
    }
    res.redirect(301, `/players/${player.urlSlug}${qs}`);
    return;
  }

  const manager = await findManagerForLegacyTag(norm);
  if (manager) {
    const mvpIndexable = await computeMvpIndexable(boundary, {
      entityType: "manager",
      entityId: manager.id,
    });
    if (!mvpIndexable) {
      res.sendStatus(404);
      return;
    }
    res.redirect(301, `/managers/${manager.urlSlug}${qs}`);
    return;
  }

  res.sendStatus(404);
}

/**
 * GET /tag/:slug and /tag/:slug/ — legacy Ghost tag URLs → canonical entity paths (301), gated by MVP indexability.
 * Must be registered before the SPA catch-all.
 */
export function registerLegacyGhostTagRedirects(app: Express): void {
  const handler = async (req: Request, res: Response) => {
    try {
      await handleLegacyGhostTag(req, res);
    } catch (e) {
      console.error("[legacy-ghost-tag-redirect]", e);
      res.status(500).send("Internal Server Error");
    }
  };
  app.get("/tag/:slug", handler);
  app.get("/tag/:slug/", handler);
}
