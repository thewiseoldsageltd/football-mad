import { eq } from "drizzle-orm";
import { db } from "../db";
import { teams } from "@shared/schema";

export type EnsuredGoalserveTeam = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  goalserveTeamId: string | null;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Ensure a canonical `teams` row exists for a Goalserve team id (national or club).
 * Used by match upserts and crest ingestion when teams appear in feeds before league sync.
 */
export async function ensureGoalserveTeam(goalserveTeamId: string, name: string): Promise<EnsuredGoalserveTeam> {
  const safeId = String(goalserveTeamId).trim();
  const safeName = String(name).trim() || `Team ${safeId}`;
  const baseSlug = slugify(safeName) || `team-${safeId}`;
  const slug = `${baseSlug}-gs-${safeId}`;

  const [existing] = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      shortName: teams.shortName,
      goalserveTeamId: teams.goalserveTeamId,
    })
    .from(teams)
    .where(eq(teams.goalserveTeamId, safeId))
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(teams)
    .values({ name: safeName, slug, goalserveTeamId: safeId })
    .onConflictDoNothing()
    .returning({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      shortName: teams.shortName,
      goalserveTeamId: teams.goalserveTeamId,
    });

  if (inserted) return inserted;

  const [found] = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      shortName: teams.shortName,
      goalserveTeamId: teams.goalserveTeamId,
    })
    .from(teams)
    .where(eq(teams.goalserveTeamId, safeId))
    .limit(1);

  if (!found) throw new Error(`Failed to ensure team for goalserveTeamId=${safeId}`);
  return found;
}
