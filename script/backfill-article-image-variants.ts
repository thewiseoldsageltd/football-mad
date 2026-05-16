/**
 * CLI: backfill heroImageUrl + socialImageUrl from coverImage.
 *
 *   npm run backfill:article-images
 *   BACKFILL_LIMIT=50 BACKFILL_DRY_RUN=1 npm run backfill:article-images
 *   BACKFILL_FORCE=1 BACKFILL_LIMIT=10 npm run backfill:article-images
 */
import "../server/load-env";
import { runBackfillArticleImageVariants } from "../server/jobs/backfill-article-image-variants";

const limit = process.env.BACKFILL_LIMIT ? parseInt(process.env.BACKFILL_LIMIT, 10) : undefined;
const dryRun = process.env.BACKFILL_DRY_RUN === "1";
const force = process.env.BACKFILL_FORCE === "1";

runBackfillArticleImageVariants({ limit, dryRun, force })
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
