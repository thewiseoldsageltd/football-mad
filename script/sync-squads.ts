/**
 * Sync squads (players + managers + memberships) for a league from Goalserve soccerleague.
 * Usage: npm run ingest:squads -- --leagueId=1204
 * Uses GOALSERVE_FEED_KEY and existing upsert logic (players, managers, player_team_memberships, team_managers).
 */
import "../server/load-env";
import { upsertGoalserveSquads } from "../server/jobs/upsert-goalserve-squads";

function getLeagueId(): string | null {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith("--leagueId=")) {
      return arg.slice("--leagueId=".length).trim() || null;
    }
    if (arg === "--leagueId" && process.argv[process.argv.indexOf(arg) + 1]) {
      return process.argv[process.argv.indexOf(arg) + 1].trim();
    }
  }
  return null;
}

const leagueId = getLeagueId();
if (!leagueId) {
  console.error("Usage: npm run ingest:squads -- --leagueId=1204");
  process.exit(1);
}

upsertGoalserveSquads(leagueId, { force: true })
  .then((result) => {
    if (result.ok) {
      console.log(
        `[ingest:squads] leagueId=${leagueId} players=${result.insertedPlayersCount} managers=${result.insertedManagersCount} teamPlayers=${result.insertedTeamPlayersCount} teamManagers=${result.insertedTeamManagersCount}`,
      );
      if (result.skipped) {
        console.log(`[ingest:squads] skipped (${result.reason ?? "hash_match"})`);
      }
      process.exit(0);
    } else {
      console.error("[ingest:squads] failed:", result.error);
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("[ingest:squads] error:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
