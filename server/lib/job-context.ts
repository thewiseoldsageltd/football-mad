/**
 * Job-run context propagation via AsyncLocalStorage so HTTP observability
 * can resolve the active run_id without passing it through every call.
 */

import { AsyncLocalStorage } from "async_hooks";

export interface JobContext {
  runId: string;
}

export const jobContextStorage = new AsyncLocalStorage<JobContext>();

/**
 * Run fn with job context set; runId is available via getJobRunId() for the duration of fn.
 */
export async function runWithJobContext<T>(
  runId: string,
  fn: () => Promise<T>
): Promise<T> {
  return jobContextStorage.run({ runId }, fn);
}

/**
 * Return the current job run id from AsyncLocalStorage, or null if not inside a job.
 */
export function getJobRunId(): string | null {
  const store = jobContextStorage.getStore();
  return store?.runId ?? null;
}
