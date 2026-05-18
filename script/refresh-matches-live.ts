/** CLI: soccernew/live — live scores/status. Cron: every 1–2 minutes. */
import "../server/load-env";
import { MATCHES_FEED_SETS, runMatchesFeedRefresh } from "../server/jobs/refresh-goalserve-matches-feed";

runMatchesFeedRefresh("refresh_matches_live", [...MATCHES_FEED_SETS.live])
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.fatal ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
