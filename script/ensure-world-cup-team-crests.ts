/**
 * Ensure World Cup national teams from priority fixtures exist and ingest crests from Goalserve logotips.
 *
 *   npm run ingest:world-cup-team-crests
 */
import "../server/load-env";
import { and, eq, isNotNull } from "drizzle-orm";
import { pool } from "../server/db";
import { db } from "../server/db";
import { matches } from "@shared/schema";
import { FIFA_WORLD_CUP_GOALSERVE_COMPETITION_ID } from "@shared/world-cup";
import { ensureGoalserveTeam } from "../server/lib/ensure-goalserve-team";
import { syncGoalserveTeamMediaByGoalserveIds } from "../server/jobs/sync-goalserve-entity-media";

type TimelineTeam = { id?: string; name?: string };

async function main(): Promise<void> {
  const rows = await db
    .select({
      homeGsId: matches.homeGoalserveTeamId,
      awayGsId: matches.awayGoalserveTeamId,
      timeline: matches.timeline,
    })
    .from(matches)
    .where(
      and(
        eq(matches.goalserveCompetitionId, FIFA_WORLD_CUP_GOALSERVE_COMPETITION_ID),
        isNotNull(matches.homeGoalserveTeamId),
        isNotNull(matches.awayGoalserveTeamId),
      ),
    );

  const byGoalserveId = new Map<string, string>();

  for (const row of rows) {
    const timeline =
      row.timeline && typeof row.timeline === "object"
        ? (row.timeline as { home?: TimelineTeam; away?: TimelineTeam })
        : null;

    const pairs: Array<{ gsId: string | null | undefined; name?: string }> = [
      { gsId: row.homeGsId, name: timeline?.home?.name },
      { gsId: row.awayGsId, name: timeline?.away?.name },
    ];

    for (const pair of pairs) {
      const gsId = String(pair.gsId ?? "").trim();
      if (!gsId) continue;
      const name = String(pair.name ?? "").trim() || `Team ${gsId}`;
      if (!byGoalserveId.has(gsId)) byGoalserveId.set(gsId, name);
    }
  }

  console.log(`Found ${byGoalserveId.size} distinct World Cup team ids in matches`);

  const gsIdToTeamId = new Map<string, string>();

  for (const [gsId, name] of byGoalserveId) {
    const team = await ensureGoalserveTeam(gsId, name);
    gsIdToTeamId.set(gsId, team.id);
    console.log(`Ensured team ${name} (${gsId}) -> ${team.id}`);
  }

  let matchesLinked = 0;
  for (const row of rows) {
    const homeGsId = String(row.homeGsId ?? "").trim();
    const awayGsId = String(row.awayGsId ?? "").trim();
    const homeTeamId = homeGsId ? gsIdToTeamId.get(homeGsId) ?? null : null;
    const awayTeamId = awayGsId ? gsIdToTeamId.get(awayGsId) ?? null : null;
    if (!homeTeamId && !awayTeamId) continue;

    await db
      .update(matches)
      .set({
        ...(homeTeamId ? { homeTeamId } : {}),
        ...(awayTeamId ? { awayTeamId } : {}),
      })
      .where(
        and(
          eq(matches.goalserveCompetitionId, FIFA_WORLD_CUP_GOALSERVE_COMPETITION_ID),
          eq(matches.homeGoalserveTeamId, homeGsId || null),
          eq(matches.awayGoalserveTeamId, awayGsId || null),
        ),
      );
    matchesLinked++;
  }
  console.log(`Linked team ids on ${matchesLinked} World Cup match rows`);

  const crestResult = await syncGoalserveTeamMediaByGoalserveIds(
    Array.from(byGoalserveId.entries()).map(([goalserveTeamId, name]) => ({ goalserveTeamId, name })),
  );

  console.log(JSON.stringify(crestResult, null, 2));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
