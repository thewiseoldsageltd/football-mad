/**
 * One-shot season fixture catch-up for staging/dev:
 *  - Premier League (1204) full season from soccerfixtures
 *  - Club Friendlies (1534) filtered to known Football Mad teams
 *  - England Super Cup / Community Shield (1611)
 *
 * Note: Goalserve returns HTTP 403 for soccerfixtures/leagueid/{id}?season=…
 * on this account. The bare league feed currently publishes the live season
 * (e.g. PL @season=2026/2027). We therefore sync without an explicit season
 * query and let syncGoalserveMatches update competitions.season from the feed.
 *
 * Usage: npx tsx script/sync-season-fixtures-catchup.ts
 */
import { syncGoalserveMatches } from "../server/jobs/sync-goalserve-matches";
import {
  syncGoalserveClubFriendliesForKnownTeams,
  syncGoalserveEnglandSuperCup,
} from "../server/jobs/sync-goalserve-club-friendlies";

async function main() {
  console.log("[catchup] syncing Premier League 1204 (bare season feed)…");
  const pl = await syncGoalserveMatches("1204");
  console.log("[catchup] PL", {
    ok: pl.ok,
    inserted: pl.inserted,
    updated: pl.updated,
    seasonKey: pl.seasonKey,
    seasonKeyUsed: pl.seasonKeyUsed,
    wroteCompetitionSeason: pl.wroteCompetitionSeason,
    error: pl.error,
  });

  console.log("[catchup] syncing Club Friendlies 1534 for known teams…");
  const fr = await syncGoalserveClubFriendliesForKnownTeams();
  console.log("[catchup] Friendlies", {
    ok: fr.ok,
    inserted: fr.inserted,
    updated: fr.updated,
    seasonKey: fr.seasonKey,
    error: fr.error,
  });

  console.log("[catchup] syncing England Super Cup 1611…");
  const sc = await syncGoalserveEnglandSuperCup();
  console.log("[catchup] Super Cup", {
    ok: sc.ok,
    inserted: sc.inserted,
    updated: sc.updated,
    seasonKey: sc.seasonKey,
    error: sc.error,
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
