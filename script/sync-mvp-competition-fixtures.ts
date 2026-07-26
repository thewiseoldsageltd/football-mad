/**
 * Sync full published fixture schedules for every MVP competition
 * (`competitions.is_priority = true`).
 *
 * Usage: npx tsx script/sync-mvp-competition-fixtures.ts
 */
import { db } from "../server/db";
import { competitions } from "@shared/schema";
import { and, eq, sql } from "drizzle-orm";
import { syncGoalserveMatches } from "../server/jobs/sync-goalserve-matches";
import { syncGoalserveClubFriendliesForKnownTeams } from "../server/jobs/sync-goalserve-club-friendlies";
import { syncGoalserveSpecialCompetitions } from "../server/jobs/sync-goalserve-special-competitions";

async function main() {
  const rows = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      goalserveCompetitionId: competitions.goalserveCompetitionId,
      season: competitions.season,
      isCup: competitions.isCup,
    })
    .from(competitions)
    .where(
      and(
        eq(competitions.isPriority, true),
        sql`trim(coalesce(${competitions.goalserveCompetitionId}, '')) <> ''`,
      ),
    );

  console.log(`[mvp-sync] ${rows.length} MVP competitions`);

  const results: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const leagueId = String(row.goalserveCompetitionId);
    console.log(`[mvp-sync] ${leagueId} ${row.name} (dbSeason=${row.season ?? "null"})…`);
    try {
      const result = await syncGoalserveMatches(leagueId);
      results.push({
        leagueId,
        name: row.name,
        ok: result.ok,
        inserted: result.inserted,
        updated: result.updated,
        seasonKey: result.seasonKey,
        wroteCompetitionSeason: result.wroteCompetitionSeason,
        error: result.error,
      });
      console.log(
        `[mvp-sync] ${leagueId} ok=${result.ok} inserted=${result.inserted} updated=${result.updated} season=${result.seasonKey} err=${result.error ?? ""}`,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      results.push({ leagueId, name: row.name, ok: false, error: message });
      console.error(`[mvp-sync] ${leagueId} FAILED`, message);
    }
  }

  console.log("[mvp-sync] supplementary friendlies…");
  const fr = await syncGoalserveClubFriendliesForKnownTeams();
  console.log("[mvp-sync] friendlies", {
    ok: fr.ok,
    inserted: fr.inserted,
    updated: fr.updated,
    error: fr.error,
  });

  console.log("[mvp-sync] supplementary special competitions…");
  const special = await syncGoalserveSpecialCompetitions();
  console.log("[mvp-sync] special", {
    ok: special.ok,
    errors: special.errors,
    synced: special.synced.map((s) => ({
      leagueId: s.leagueId,
      ok: s.ok,
      inserted: s.inserted,
      updated: s.updated,
      seasonKey: s.seasonKey,
    })),
  });

  const failed = results.filter((r) => r.ok === false);
  console.log(
    JSON.stringify(
      {
        mvpSynced: results.length,
        mvpFailed: failed.length,
        results,
        friendlies: { ok: fr.ok, inserted: fr.inserted, updated: fr.updated, error: fr.error },
        specialOk: special.ok,
      },
      null,
      2,
    ),
  );

  if (failed.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
