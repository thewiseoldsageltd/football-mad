import type { Response } from "express";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "../db";
import { competitions, managers, paEntityAliasMap, players } from "@shared/schema";
import { ARTICLE_SOURCE_PA_MEDIA } from "./sources";
import { MvpGraphBoundary } from "./mvp-graph-boundary";
import { computeMvpIndexable } from "./mvp-indexing";
import { storage } from "../storage";

const X_ROBOTS_NON_MVP = "noindex, follow";

export async function resolveCompetitionIdForRequestSlug(norm: string): Promise<string | null> {
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

export async function resolvePlayerIdForRequestSlug(norm: string): Promise<string | null> {
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(eq(players.slug, norm))
    .limit(2);
  if (rows.length === 1) return rows[0].id;
  if (rows.length > 1) return null;

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
  return aliasRows[0].entityId;
}

export async function resolveManagerIdForRequestSlug(norm: string): Promise<string | null> {
  const rows = await db
    .select({ id: managers.id })
    .from(managers)
    .where(eq(managers.slug, norm))
    .limit(2);
  if (rows.length === 1) return rows[0].id;
  if (rows.length > 1) return null;

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
  return aliasRows[0].entityId;
}

/**
 * When serving the SPA shell for a public entity URL, if the entity exists in DB but is outside
 * the MVP graph, instruct crawlers not to index (entity pages remain reachable for users).
 */
export async function maybeApplyNonMvpEntityNoindexHeader(
  res: Response,
  entityType: "team" | "competition" | "player" | "manager",
  urlSlug: string,
): Promise<void> {
  const slug = String(urlSlug ?? "").trim();
  if (!slug) return;

  const boundary = new MvpGraphBoundary();
  let entityId: string | null = null;

  if (entityType === "team") {
    const team = await storage.getTeamBySlug(slug);
    entityId = team?.id ?? null;
  } else if (entityType === "competition") {
    entityId = await resolveCompetitionIdForRequestSlug(slug);
  } else if (entityType === "player") {
    entityId = await resolvePlayerIdForRequestSlug(slug);
  } else {
    entityId = await resolveManagerIdForRequestSlug(slug);
  }

  if (!entityId) return;
  const mvpIndexable = await computeMvpIndexable(boundary, { entityType, entityId });
  if (!mvpIndexable) {
    res.setHeader("X-Robots-Tag", X_ROBOTS_NON_MVP);
  }
}
