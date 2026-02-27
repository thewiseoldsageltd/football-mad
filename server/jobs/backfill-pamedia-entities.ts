import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { articles } from "@shared/schema";
import { syncArticleEntitiesFromTags } from "../lib/article-entity-sync";
import { ARTICLE_SOURCE_PA_MEDIA } from "../lib/sources";

export interface BackfillPaMediaEntitiesResult {
  ok: boolean;
  processed: number;
  updated: number;
  skippedInvalidDate: number;
  insertedCompetitions: number;
  insertedTeams: number;
  insertedPlayers: number;
  insertedManagers: number;
  createdPlayersFromPa: number;
  createdManagersFromPa: number;
  error?: string;
}

function toValidDate(value: unknown): Date | null {
  if (value == null) return null;
  const d = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function runBackfillPaMediaEntities(days: number): Promise<BackfillPaMediaEntitiesResult> {
  try {
    const safeDays = Number.isFinite(days) && days > 0 ? days : 7;
    const cutoff = toValidDate(Date.now() - safeDays * 24 * 60 * 60 * 1000) ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        tags: articles.tags,
        publishedAt: articles.publishedAt,
      })
      .from(articles)
      .where(
        and(
          eq(articles.source, ARTICLE_SOURCE_PA_MEDIA),
          gte(articles.publishedAt, cutoff),
          sql`coalesce(array_length(${articles.tags}, 1), 0) > 0`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(1000);

    let updated = 0;
    let skippedInvalidDate = 0;
    let insertedCompetitions = 0;
    let insertedTeams = 0;
    let insertedPlayers = 0;
    let insertedManagers = 0;
    let createdPlayersFromPa = 0;
    let createdManagersFromPa = 0;

    for (const row of rows) {
      const publishedAt = toValidDate(row.publishedAt);
      if (!publishedAt) {
        skippedInvalidDate += 1;
        console.warn(`[backfill-pamedia-entities] skip invalid publishedAt articleId=${row.id} slug=${row.slug}`);
        continue;
      }
      const stats = await syncArticleEntitiesFromTags(row.id, (row.tags as string[] | null) ?? [], {
        allowPaPeopleFallback: true,
      });
      const insertedTotal =
        stats.insertedCompetitions +
        stats.insertedTeams +
        stats.insertedPlayers +
        stats.insertedManagers;
      if (insertedTotal > 0) updated += 1;
      insertedCompetitions += stats.insertedCompetitions;
      insertedTeams += stats.insertedTeams;
      insertedPlayers += stats.insertedPlayers;
      insertedManagers += stats.insertedManagers;
      createdPlayersFromPa += stats.createdPlayersFromPa;
      createdManagersFromPa += stats.createdManagersFromPa;
    }

    return {
      ok: true,
      processed: rows.length,
      updated,
      skippedInvalidDate,
      insertedCompetitions,
      insertedTeams,
      insertedPlayers,
      insertedManagers,
      createdPlayersFromPa,
      createdManagersFromPa,
    };
  } catch (error) {
    return {
      ok: false,
      processed: 0,
      updated: 0,
      skippedInvalidDate: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      createdPlayersFromPa: 0,
      createdManagersFromPa: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
