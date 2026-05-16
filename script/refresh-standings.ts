/**
 * CLI: bounded Goalserve standings refresh (current season by default).
 *
 *   npm run refresh:standings
 *   STANDINGS_BATCH_LIMIT=3 STANDINGS_DRY_RUN=1 npm run refresh:standings
 *   STANDINGS_COMPETITION_IDS=1204,1205,1206 npm run refresh:standings
 *   STANDINGS_SEASON=2025/2026 npm run refresh:standings  # historical (manual)
 */
import "../server/load-env";
import { runRefreshGoalserveStandings } from "../server/jobs/refresh-goalserve-standings";

runRefreshGoalserveStandings()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.fatal ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
