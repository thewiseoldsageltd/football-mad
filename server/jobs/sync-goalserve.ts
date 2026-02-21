/**
 * Goalserve sync job entry point. Forwards runId into the sync layer so all
 * Goalserve HTTP calls (via goalserveFetch) are logged to job_http_calls.
 */
import { syncGoalserveMatches } from "./sync-goalserve-matches";

export async function runSyncGoalserve(
  leagueId: string,
  seasonKeyParam: string | undefined,
  runId: string
) {
  return syncGoalserveMatches(leagueId, seasonKeyParam, runId);
}
