/**
 * CLI/cron: refresh matches from Goalserve soccernew day feeds (no HTTP secret).
 *
 * Env: DATABASE_URL, GOALSERVE_FEED_KEY
 */

import { runWithJobContext } from "../lib/job-context";
import { finishJobRun, startJobRun } from "../lib/job-observability";
import { upsertGoalserveMatches } from "./upsert-goalserve-matches";

export type FeedRefreshResult = {
  feed: string;
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  durationMs: number;
  error?: string;
};

export type RunMatchesFeedRefreshResult = {
  ok: boolean;
  fatal?: boolean;
  jobName: string;
  feeds: string[];
  feedsProcessed: number;
  inserted: number;
  updated: number;
  skipped: number;
  durationMs: number;
  results: FeedRefreshResult[];
  error?: string;
};

function checkFatalConfig(): string | null {
  if (!process.env.DATABASE_URL?.trim()) {
    return "DATABASE_URL is not configured";
  }
  if (!process.env.GOALSERVE_FEED_KEY?.trim()) {
    return "GOALSERVE_FEED_KEY is not configured";
  }
  return null;
}

export async function runMatchesFeedRefresh(
  jobName: string,
  feeds: string[],
): Promise<RunMatchesFeedRefreshResult> {
  const startedAt = Date.now();

  if (!feeds.length) {
    return {
      ok: false,
      fatal: true,
      jobName,
      feeds: [],
      feedsProcessed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      error: "No feeds configured",
    };
  }

  const configError = checkFatalConfig();
  if (configError) {
    return {
      ok: false,
      fatal: true,
      jobName,
      feeds,
      feedsProcessed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      error: configError,
    };
  }

  const run = await startJobRun(jobName, { feeds });

  return runWithJobContext(run.id, async () => {
    const results: FeedRefreshResult[] = [];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let feedsProcessed = 0;
    let feedFailures = 0;

    console.log(`[${jobName}] start feeds=${feeds.join(",")}`);

    for (const feed of feeds) {
      const feedStarted = Date.now();
      try {
        const result = await upsertGoalserveMatches(feed);
        const feedSkipped = (result.skippedNoMatchId ?? 0) + (result.skippedNoKickoff ?? 0);
        feedsProcessed++;
        inserted += result.inserted ?? 0;
        updated += result.updated ?? 0;
        skipped += feedSkipped;

        if (!result.ok) {
          feedFailures++;
        }

        results.push({
          feed,
          ok: result.ok,
          inserted: result.inserted ?? 0,
          updated: result.updated ?? 0,
          skipped: feedSkipped,
          durationMs: Date.now() - feedStarted,
          error: result.error,
        });

        console.log(
          `[${jobName}] feed=${feed} ok=${result.ok} inserted=${result.inserted ?? 0} updated=${result.updated ?? 0} skipped=${feedSkipped} durationMs=${Date.now() - feedStarted}${result.error ? ` error=${result.error}` : ""}`,
        );
      } catch (err) {
        feedFailures++;
        feedsProcessed++;
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          feed,
          ok: false,
          inserted: 0,
          updated: 0,
          skipped: 0,
          durationMs: Date.now() - feedStarted,
          error: message,
        });
        console.error(`[${jobName}] feed=${feed} failed: ${message}`);
      }
    }

    const durationMs = Date.now() - startedAt;
    const jobStatus =
      feedFailures > 0 && feedsProcessed === feedFailures
        ? "error"
        : feedFailures > 0
          ? "partial"
          : "success";

    await finishJobRun(run.id, {
      status: jobStatus,
      counters: { feedsProcessed, inserted, updated, skipped, feedFailures, durationMs },
    });

    console.log(
      `[${jobName}] done feedsProcessed=${feedsProcessed} inserted=${inserted} updated=${updated} skipped=${skipped} failures=${feedFailures} durationMs=${durationMs}`,
    );

    return {
      ok: feedFailures === 0,
      jobName,
      feeds,
      feedsProcessed,
      inserted,
      updated,
      skipped,
      durationMs,
      results,
    };
  });
}

/** Predefined feed sets for npm cron scripts. */
export const MATCHES_FEED_SETS = {
  live: ["soccernew/live"],
  today: ["soccernew/home"],
  nearFuture: ["soccernew/d1", "soccernew/d2"],
  weekAhead: ["soccernew/d3", "soccernew/d4", "soccernew/d5", "soccernew/d6", "soccernew/d7"],
} as const;
