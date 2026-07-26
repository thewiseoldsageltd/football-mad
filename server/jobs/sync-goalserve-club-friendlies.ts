/**
 * Sync Club Friendlies (Goalserve league 1534) for teams Football Mad already knows.
 *
 * The friendlies feed is global and very large. We only upsert matches that involve
 * a team with a known goalserve_team_id in our `teams` table — no fabricated rows.
 */
import { db } from "../db";
import { teams } from "@shared/schema";
import { isNotNull } from "drizzle-orm";
import { syncGoalserveMatches } from "./sync-goalserve-matches";

export const CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID = "1534";

/** England FA Community Shield / Super Cup in Goalserve mapping. */
export const ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID = "1611";

export async function syncGoalserveClubFriendliesForKnownTeams(
  seasonKeyParam?: string,
  runId?: string,
): Promise<Awaited<ReturnType<typeof syncGoalserveMatches>>> {
  const rows = await db
    .select({ goalserveTeamId: teams.goalserveTeamId })
    .from(teams)
    .where(isNotNull(teams.goalserveTeamId));

  const onlyTeamGoalserveIds = Array.from(
    new Set(rows.map((r) => String(r.goalserveTeamId ?? "").trim()).filter(Boolean)),
  );

  return syncGoalserveMatches(CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID, seasonKeyParam, runId, {
    onlyTeamGoalserveIds,
  });
}

/** Sync England Super Cup / Community Shield season fixtures (small feed). */
export async function syncGoalserveEnglandSuperCup(
  seasonKeyParam?: string,
  runId?: string,
): Promise<Awaited<ReturnType<typeof syncGoalserveMatches>>> {
  return syncGoalserveMatches(ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID, seasonKeyParam, runId);
}
