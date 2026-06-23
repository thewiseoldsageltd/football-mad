import type { Express, Request, Response } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { competitions, managers, paEntityAliasMap, players, teams } from "@shared/schema";
import { ARTICLE_SOURCE_PA_MEDIA } from "./sources";
import { MvpGraphBoundary } from "./mvp-graph-boundary";
import { computeMvpIndexable } from "./mvp-indexing";
import { resolveCanonicalCompetitionSlug, resolveCanonicalTeamPublicSlug } from "./canonical-entity-slugs";

import { harmlessRedirectQuerySuffix } from "./harmless-redirect-query";

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

/** Ghost URL slug → normalized tag name (`inter-milan` → `inter milan`). */
function normalizedTagNameFromSlug(norm: string): string {
  return norm.replace(/-/g, " ");
}

/** One entity_id when all alias rows agree; null if ambiguous or empty. */
function uniqueEntityIdFromAliasMatches(rows: { entityId: string }[]): string | null {
  const ids = Array.from(new Set(rows.map((r) => r.entityId.trim()).filter(Boolean)));
  if (ids.length === 1) return ids[0];
  return null;
}

async function findAliasEntityId(
  norm: string,
  entityTypes: ["competition", "competitions"] | ["team", "teams"] | ["player", "players"] | ["manager", "managers"],
): Promise<string | null> {
  const baseWhere = and(
    eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
    inArray(paEntityAliasMap.entityType, entityTypes),
  );

  const byPublicSlug = await db
    .select({ entityId: paEntityAliasMap.entityId })
    .from(paEntityAliasMap)
    .where(and(baseWhere, eq(paEntityAliasMap.publicSlug, norm)));

  const fromPublicSlug = uniqueEntityIdFromAliasMatches(byPublicSlug);
  if (fromPublicSlug) return fromPublicSlug;

  const byNormalizedName = await db
    .select({ entityId: paEntityAliasMap.entityId })
    .from(paEntityAliasMap)
    .where(and(baseWhere, eq(paEntityAliasMap.paTagNameNormalized, normalizedTagNameFromSlug(norm))));

  return uniqueEntityIdFromAliasMatches(byNormalizedName);
}

async function findCompetitionIdForLegacyTag(norm: string): Promise<string | null> {
  const rows = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(or(eq(competitions.canonicalSlug, norm), eq(competitions.slug, norm)))
    .limit(2);
  if (rows.length === 1) return rows[0].id;
  if (rows.length > 1) return null;

  const entityId = await findAliasEntityId(norm, ["competition", "competitions"]);
  if (!entityId) return null;

  const [competition] = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.id, entityId))
    .limit(1);
  return competition?.id ?? null;
}

async function findTeamIdForLegacyTag(norm: string): Promise<string | null> {
  const internalRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.slug, norm))
    .limit(2);
  if (internalRows.length === 1) return internalRows[0].id;
  if (internalRows.length > 1) return null;

  return findAliasEntityId(norm, ["team", "teams"]);
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

  const entityId = await findAliasEntityId(norm, ["player", "players"]);
  if (!entityId) return null;

  const [p] = await db
    .select({ id: players.id, slug: players.slug })
    .from(players)
    .where(eq(players.id, entityId))
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

  const entityId = await findAliasEntityId(norm, ["manager", "managers"]);
  if (!entityId) return null;

  const [m] = await db
    .select({ id: managers.id, slug: managers.slug })
    .from(managers)
    .where(eq(managers.id, entityId))
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

  const qs = harmlessRedirectQuerySuffix(req.originalUrl || "");
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
