/**
 * CLI: bounded full-season fixtures for priority MVP leagues.
 *
 *   npm run refresh:priority-fixtures
 *   FIXTURES_BATCH_LIMIT=2 FIXTURES_DRY_RUN=1 npm run refresh:priority-fixtures
 *   FIXTURES_COMPETITION_IDS=1204,1205 npm run refresh:priority-fixtures
 */
import "../server/load-env";
import { runRefreshGoalserveFixtures } from "../server/jobs/refresh-goalserve-fixtures";

runRefreshGoalserveFixtures()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.fatal ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
