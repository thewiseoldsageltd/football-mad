/** CLI: soccernew/d3–d7 — upcoming week reschedules. Cron: every 2–4 hours. */
import "../server/load-env";
import { MATCHES_FEED_SETS, runMatchesFeedRefresh } from "../server/jobs/refresh-goalserve-matches-feed";

runMatchesFeedRefresh("refresh_matches_week_ahead", [...MATCHES_FEED_SETS.weekAhead])
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.fatal ? 1 : 0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
