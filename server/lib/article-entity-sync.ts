import { eq } from "drizzle-orm";
import { db } from "../db";
import { articleCompetitions, articleManagers, articlePlayers, articleTeams, managers, players } from "@shared/schema";
import { normalizeEntityAlias, resolveEntityFromTag } from "./entity-alias-resolver";

const PA_GENERIC_TAG_STOPWORDS = new Set([
  "football",
  "soccer",
  "sport",
  "sports",
  "competition discipline",
  "discipline",
  "stade oceane",
  "club news",
  "match report",
  "match reports",
]);

function normalizePaTag(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function isGenericPaTag(s: string): boolean {
  const n = normalizePaTag(s);
  if (!n) return true;
  if (PA_GENERIC_TAG_STOPWORDS.has(n)) return true;
  if (/\bvs\b/.test(n)) return true;
  if (/\b v \b/.test(` ${n} `)) return true;
  if (n.length <= 2) return true;
  return false;
}

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

function slugifyFromTag(tag: string): string {
  return normalizeEntityAlias(tag)
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isLikelyPersonTag(tag: string): boolean {
  const normalized = normalizePaTag(tag);
  if (!normalized) return false;
  if (normalized.includes(" vs ") || normalized.includes(" v ")) return false;
  if (isGenericPaTag(normalized)) return false;
  const words = normalized.split(" ").filter(Boolean);
  return words.length >= 2;
}

export async function syncArticleEntitiesFromTags(
  articleId: string,
  tags: string[],
  options?: { allowPaPeopleFallback?: boolean },
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

  const candidateTagNames: string[] = Array.from(
    new Map(
      rawTagNames
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .filter((t) => !isGenericPaTag(t))
        .map((t) => [normalizePaTag(t), t] as const),
    ).values(),
  );

  let resolved = 0;
  let createdPlayersFromPa = 0;
  let createdManagersFromPa = 0;
  for (const tag of candidateTagNames) {
    const normalized = normalizePaTag(tag);
    if (!normalized) continue;

    const mapped = await resolveEntityFromTag(tag);
    if (mapped) {
      resolved += 1;

      if (mapped.entityType === "competition") competitionIds.add(mapped.entityId);
      else if (mapped.entityType === "team") teamIds.add(mapped.entityId);
      else if (mapped.entityType === "player") {
        const existingPlayer = await db
          .select({ id: players.id })
          .from(players)
          .where(eq(players.id, mapped.entityId))
          .limit(1);
        if (existingPlayer.length > 0) playerIds.add(mapped.entityId);
      } else if (mapped.entityType === "manager") {
        const existingManager = await db
          .select({ id: managers.id })
          .from(managers)
          .where(eq(managers.id, mapped.entityId))
          .limit(1);
        if (existingManager.length > 0) managerIds.add(mapped.entityId);
      }
      continue;
    }

    if (!options?.allowPaPeopleFallback) continue;
    // Fallback creation is restricted to person-like tags only.
    if (!isLikelyPersonTag(tag)) continue;

    const personSlugBase = slugifyFromTag(tag) || "pa-person";
    const [existingBySlug] = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.slug, personSlugBase))
      .limit(1);

    if (existingBySlug) {
      playerIds.add(existingBySlug.id);
      continue;
    }

    const [existingManagerBySlug] = await db
      .select({ id: managers.id })
      .from(managers)
      .where(eq(managers.slug, personSlugBase))
      .limit(1);

    if (existingManagerBySlug) {
      managerIds.add(existingManagerBySlug.id);
      continue;
    }

    const insertedPlayer = await db
      .insert(players)
      .values({
        name: tag,
        slug: personSlugBase,
      })
      .onConflictDoNothing()
      .returning({ id: players.id });

    if (insertedPlayer.length > 0) {
      createdPlayersFromPa += 1;
      playerIds.add(insertedPlayer[0].id);
      continue;
    }

    const [conflictedPlayer] = await db
      .select({ id: players.id })
      .from(players)
      .where(eq(players.slug, personSlugBase))
      .limit(1);
    if (conflictedPlayer) {
      playerIds.add(conflictedPlayer.id);
      continue;
    }

    const insertedManager = await db
      .insert(managers)
      .values({
        name: tag,
        slug: personSlugBase,
      })
      .onConflictDoNothing()
      .returning({ id: managers.id });

    if (insertedManager.length > 0) {
      createdManagersFromPa += 1;
      managerIds.add(insertedManager[0].id);
      continue;
    }

    const [conflictedManager] = await db
      .select({ id: managers.id })
      .from(managers)
      .where(eq(managers.slug, personSlugBase))
      .limit(1);
    if (conflictedManager) managerIds.add(conflictedManager.id);
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
    tagsPassed: candidateTagNames.length,
    resolved,
    insertedCompetitions: competitionIds.size,
    insertedTeams: teamIds.size,
    insertedPlayers: playerIds.size,
    insertedManagers: managerIds.size,
    createdPlayersFromPa,
    createdManagersFromPa,
  };
}
