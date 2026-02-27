import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { articles } from "@shared/schema";
import { syncArticleEntitiesFromTags } from "../lib/article-entity-sync";

const PA_SOURCE = "pa_media";

export interface BackfillPaMediaEntitiesResult {
  ok: boolean;
  processed: number;
  updated: number;
  insertedCompetitions: number;
  insertedTeams: number;
  insertedPlayers: number;
  insertedManagers: number;
  error?: string;
}

export async function runBackfillPaMediaEntities(days: number): Promise<BackfillPaMediaEntitiesResult> {
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db
      .select({
        id: articles.id,
        slug: articles.slug,
        tags: articles.tags,
      })
      .from(articles)
      .where(
        and(
          eq(articles.source, PA_SOURCE),
          gte(articles.publishedAt, cutoff),
          sql`coalesce(array_length(${articles.tags}, 1), 0) > 0`,
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(1000);

    let updated = 0;
    let insertedCompetitions = 0;
    let insertedTeams = 0;
    let insertedPlayers = 0;
    let insertedManagers = 0;

    for (const row of rows) {
      const stats = await syncArticleEntitiesFromTags(row.id, (row.tags as string[] | null) ?? []);
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
    }

    return {
      ok: true,
      processed: rows.length,
      updated,
      insertedCompetitions,
      insertedTeams,
      insertedPlayers,
      insertedManagers,
    };
  } catch (error) {
    return {
      ok: false,
      processed: 0,
      updated: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
