/** CLI: soccernew/d1 + d2 — tomorrow and day-after reschedules. Cron: every 30 minutes. */
import "../server/load-env";
import { MATCHES_FEED_SETS, runMatchesFeedRefresh } from "../server/jobs/refresh-goalserve-matches-feed";

runMatchesFeedRefresh("refresh_matches_near_future", [...MATCHES_FEED_SETS.nearFuture])
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.fatal ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
