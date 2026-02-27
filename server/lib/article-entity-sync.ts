import { eq } from "drizzle-orm";
import { db } from "../db";
import { articleCompetitions, articleManagers, articlePlayers, articleTeams } from "@shared/schema";
import { resolveEntityFromTag } from "./entity-alias-resolver";

export interface EntitySyncStats {
  tagsPassed: number;
  resolved: number;
  insertedCompetitions: number;
  insertedTeams: number;
  insertedPlayers: number;
  insertedManagers: number;
}

export async function syncArticleEntitiesFromTags(articleId: string, tags: string[]): Promise<EntitySyncStats> {
  await db.delete(articleCompetitions).where(eq(articleCompetitions.articleId, articleId));
  await db.delete(articleTeams).where(eq(articleTeams.articleId, articleId));
  await db.delete(articlePlayers).where(eq(articlePlayers.articleId, articleId));
  await db.delete(articleManagers).where(eq(articleManagers.articleId, articleId));

  const competitionIds = new Set<string>();
  const teamIds = new Set<string>();
  const playerIds = new Set<string>();
  const managerIds = new Set<string>();

  let resolved = 0;
  for (const rawTag of tags) {
    const tag = (rawTag || "").trim();
    if (!tag) continue;

    const mapped = await resolveEntityFromTag(tag);
    if (!mapped) continue;
    resolved += 1;

    if (mapped.entityType === "competition") competitionIds.add(mapped.entityId);
    else if (mapped.entityType === "team") teamIds.add(mapped.entityId);
    else if (mapped.entityType === "player") playerIds.add(mapped.entityId);
    else if (mapped.entityType === "manager") managerIds.add(mapped.entityId);
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

  return {
    tagsPassed: tags.length,
    resolved,
    insertedCompetitions: competitionIds.size,
    insertedTeams: teamIds.size,
    insertedPlayers: playerIds.size,
    insertedManagers: managerIds.size,
  };
}
