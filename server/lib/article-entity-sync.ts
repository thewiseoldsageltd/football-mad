import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { articleCompetitions, articleManagers, articlePlayers, articleTeams, paEntityAliasMap } from "@shared/schema";
import { ARTICLE_SOURCE_PA_MEDIA } from "./sources";

export interface EntitySyncStats {
  tagsPassed: number;
  resolved: number;
  insertedCompetitions: number;
  insertedTeams: number;
  insertedPlayers: number;
  insertedManagers: number;
  createdPlayersFromPa: number;
  createdManagersFromPa: number;
}

export function normalizePaTagForAliasLookup(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/^tag:\s*/, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeMappedEntityType(entityType: string): "competition" | "team" | "player" | "manager" | null {
  const clean = entityType.toLowerCase().trim();
  if (clean === "competition" || clean === "competitions") return "competition";
  if (clean === "team" || clean === "teams") return "team";
  if (clean === "player" || clean === "players") return "player";
  if (clean === "manager" || clean === "managers") return "manager";
  return null;
}

export async function syncArticleEntitiesFromTags(
  articleId: string,
  tags: string[],
): Promise<EntitySyncStats> {
  await db.delete(articleCompetitions).where(eq(articleCompetitions.articleId, articleId));
  await db.delete(articleTeams).where(eq(articleTeams.articleId, articleId));
  await db.delete(articlePlayers).where(eq(articlePlayers.articleId, articleId));
  await db.delete(articleManagers).where(eq(articleManagers.articleId, articleId));

  const competitionIds = new Set<string>();
  const teamIds = new Set<string>();
  const playerIds = new Set<string>();
  const managerIds = new Set<string>();
  const rawTagNames: string[] = (tags ?? [])
    .map((t: unknown) => (typeof t === "string" ? t : ((t as any)?.name ?? (t as any)?.label ?? (t as any)?.value ?? "")))
    .filter(Boolean);

  const normalizedTags: string[] = Array.from(
    new Set(
      rawTagNames
        .map((t) => normalizePaTagForAliasLookup(t))
        .filter((t) => t.length > 0),
    ),
  );

  const aliasRows = normalizedTags.length
    ? await db
      .select({
        entityType: paEntityAliasMap.entityType,
        entityId: paEntityAliasMap.entityId,
      })
      .from(paEntityAliasMap)
      .where(
        and(
          eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
          inArray(paEntityAliasMap.paTagNameNormalized, normalizedTags),
        ),
      )
    : [];

  let resolved = 0;
  for (const row of aliasRows) {
    const entityType = normalizeMappedEntityType(row.entityType);
    if (!entityType) continue;
    resolved += 1;

    if (entityType === "competition") competitionIds.add(row.entityId);
    else if (entityType === "team") teamIds.add(row.entityId);
    else if (entityType === "player") playerIds.add(row.entityId);
    else if (entityType === "manager") managerIds.add(row.entityId);
  }

  for (const competitionId of Array.from(competitionIds)) {
    await db
      .insert(articleCompetitions)
      .values({ articleId, competitionId, source: "tag", salienceScore: 100 })
      .onConflictDoNothing();
  }
  for (const teamId of Array.from(teamIds)) {
    await db
      .insert(articleTeams)
      .values({ articleId, teamId, source: "tag", salienceScore: 100 })
      .onConflictDoNothing();
  }
  for (const playerId of Array.from(playerIds)) {
    await db
      .insert(articlePlayers)
      .values({ articleId, playerId, source: "tag", salienceScore: 100 })
      .onConflictDoNothing();
  }
  for (const managerId of Array.from(managerIds)) {
    await db
      .insert(articleManagers)
      .values({ articleId, managerId, source: "tag", salienceScore: 100 })
      .onConflictDoNothing();
  }

  console.log(
    `[article-entity-sync] articleId=${articleId} tagsRead=${rawTagNames.length} aliasMatches=${resolved} inserted competition=${competitionIds.size} team=${teamIds.size} player=${playerIds.size} manager=${managerIds.size}`,
  );

  return {
    tagsPassed: normalizedTags.length,
    resolved,
    insertedCompetitions: competitionIds.size,
    insertedTeams: teamIds.size,
    insertedPlayers: playerIds.size,
    insertedManagers: managerIds.size,
    createdPlayersFromPa: 0,
    createdManagersFromPa: 0,
  };
}
