/**
 * Jobs observability: record runs, HTTP calls (no secrets), and counters.
 * Writes are best-effort; failures must not break the job.
 */

import { db } from "../db";
import { jobRuns, jobHttpCalls } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getJobRunId } from "./job-context";

const JOB_HTTP_CALLS_CAP = Math.max(100, parseInt(process.env.JOB_HTTP_CALLS_CAP ?? "2000", 10));

const runCallCounts = new Map<
  string,
  { recorded: number; dropped: number }
>();

/** Per-run HTTP log insert failures (for counters + optional error surfacing in job_runs). */
const runHttpLogFailures = new Map<string, { count: number; lastError: string }>();

export type JobRunRow = { id: string; jobName: string; startedAt: Date };

export async function startJobRun(
  jobName: string,
  meta?: Record<string, unknown>
): Promise<JobRunRow> {
  try {
    const [row] = await db
      .insert(jobRuns)
      .values({
        jobName,
        status: "running",
        meta: meta ?? null,
      })
      .returning({ id: jobRuns.id, jobName: jobRuns.jobName, startedAt: jobRuns.startedAt });
    if (row) {
      runCallCounts.set(row.id, { recorded: 0, dropped: 0 });
      return {
        id: row.id,
        jobName: row.jobName,
        startedAt: row.startedAt!,
      };
    }
  } catch (e) {
    console.warn("[job-observability] startJobRun failed:", (e as Error).message);
  }
  return {
    id: "",
    jobName,
    startedAt: new Date(),
  };
}

export interface FinishJobRunOpts {
  status: "success" | "error" | "partial";
  counters?: Record<string, number | undefined>;
  stoppedReason?: string | null;
  error?: string | null;
}

/** Sets finished_at/status (and counters/error). Never throws so job completion is never broken by observability. */
export async function finishJobRun(
  runId: string,
  opts: FinishJobRunOpts
): Promise<void> {
  if (!runId) return;
  try {
    const counts = runCallCounts.get(runId);
    if (counts) {
      runCallCounts.delete(runId);
      if (counts.dropped > 0) {
        opts.counters = { ...opts.counters, http_calls_dropped: counts.dropped };
      }
    }
    const failures = runHttpLogFailures.get(runId);
    if (failures) {
      runHttpLogFailures.delete(runId);
      opts.counters = { ...opts.counters, httpLogFailed: failures.count };
      if (opts.status === "success" && failures.lastError) {
        opts.error = failures.lastError;
      }
    }
    await db
      .update(jobRuns)
      .set({
        finishedAt: new Date(),
        status: opts.status,
        stoppedReason: opts.stoppedReason ?? null,
        counters: opts.counters ?? null,
        error: opts.error ?? null,
      })
      .where(eq(jobRuns.id, runId));
  } catch (e) {
    console.warn("[job-observability] finishJobRun failed:", (e as Error).message);
  }
}

let _noRunIdWarned = false;

export async function recordJobHttpCall(
  runIdParam: string | undefined,
  payload: {
    provider: string;
    url: string;
    method?: string;
    statusCode?: number | null;
    durationMs?: number | null;
    bytesIn?: number | null;
    error?: string | null;
  }
): Promise<void> {
  const runId = runIdParam ?? getJobRunId() ?? "";
  if (!runId) {
    if (!_noRunIdWarned) {
      _noRunIdWarned = true;
      console.warn("[job-observability] HTTP logging has no runId context (call outside runWithJobContext or pass runId)");
    }
    return;
  }
  const state = runCallCounts.get(runId);
  if (state) {
    if (state.recorded >= JOB_HTTP_CALLS_CAP) {
      state.dropped++;
      return;
    }
    state.recorded++;
  }
  const method = payload.method ?? "GET";
  const statusCode = payload.statusCode ?? null;
  const durationMs = payload.durationMs ?? null;
  try {
    await db.insert(jobHttpCalls).values({
      runId,
      provider: payload.provider,
      url: payload.url,
      method,
      statusCode,
      durationMs,
    });
  } catch (e) {
    const msg = (e as Error).message;
    console.error(
      "[job-observability] recordJobHttpCall failed:",
      "provider=" + payload.provider,
      "url=" + payload.url,
      "error=" + msg
    );
    let entry = runHttpLogFailures.get(runId);
    if (!entry) {
      entry = { count: 0, lastError: "" };
      runHttpLogFailures.set(runId, entry);
    }
    entry.count++;
    entry.lastError = msg;
  }
}

const SENSITIVE_HEADER_KEYS = new Set([
  "apikey",
  "authorization",
  "x-sync-secret",
  "x-api-key",
  "cookie",
]);

function sanitizeHeaders(headers?: Record<string, string>): Record<string, string> {
  if (!headers || typeof headers !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (!SENSITIVE_HEADER_KEYS.has(lower)) out[k] = v;
    else out[k] = "[REDACTED]";
  }
  return out;
}

export interface JobFetchOpts {
  provider: string;
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | Buffer | undefined;
  timeoutMs?: number;
  /** If true, throw on non-2xx. Default false: record and return. */
  throwOnNon2xx?: boolean;
  /** When set, use this instead of internal fetch (for observability-only wrapping). */
  fetcher?: () => Promise<Response>;
}

export async function jobFetch(
  runIdParam: string | undefined,
  opts: JobFetchOpts
): Promise<Response> {
  const runId = runIdParam ?? getJobRunId() ?? "";
  const { provider, url, method = "GET", headers, body, timeoutMs = 10000, throwOnNon2xx = false, fetcher } = opts;
  const start = Date.now();
  let statusCode: number | null = null;
  let bytesIn: number | null = null;
  let errMsg: string | null = null;

  if (fetcher) {
    try {
      const res = await fetcher();
      statusCode = res.status;
      const arr = await res.arrayBuffer();
      bytesIn = arr.byteLength;
      const durationMs = Date.now() - start;
      if (runId) {
        await recordJobHttpCall(runId, {
          provider,
          url,
          method,
          statusCode,
          durationMs,
          bytesIn,
          error: res.status >= 200 && res.status < 300 ? null : `HTTP ${res.status}`,
        });
      }
      if (throwOnNon2xx && (res.status < 200 || res.status >= 300)) {
        throw new Error(`HTTP ${res.status}`);
      }
      return new Response(arr, { status: res.status, statusText: res.statusText, headers: res.headers });
    } catch (e) {
      const durationMs = Date.now() - start;
      errMsg = (e as Error).message;
      if (runId) {
        await recordJobHttpCall(runId, { provider, url, method, statusCode, durationMs, bytesIn, error: errMsg });
      }
      throw e;
    }
  }

  try {
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(to);
    statusCode = res.status;
    const arr = await res.arrayBuffer();
    bytesIn = arr.byteLength;
    if (throwOnNon2xx && (res.status < 200 || res.status >= 300)) {
      errMsg = `HTTP ${res.status}`;
      if (runId) {
        await recordJobHttpCall(runId, {
          provider,
          url,
          method,
          statusCode,
          durationMs: Date.now() - start,
          bytesIn,
          error: errMsg,
        });
      }
      throw new Error(errMsg);
    }
    if (runId) {
      await recordJobHttpCall(runId, {
        provider,
        url,
        method,
        statusCode,
        durationMs: Date.now() - start,
        bytesIn,
        error: null,
      });
    }
    return new Response(arr, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (e) {
    const durationMs = Date.now() - start;
    errMsg = (e as Error).message;
    if (runId) {
      await recordJobHttpCall(runId, {
        provider,
        url,
        method,
        statusCode,
        durationMs,
        bytesIn,
        error: errMsg,
      });
    }
    throw e;
  }
}

/*
  Verification queries (psql):

  -- Latest runs
  SELECT id, job_name, started_at, finished_at, status, counters
  FROM job_runs
  ORDER BY started_at DESC
  LIMIT 20;

  -- Runs with errors
  SELECT id, job_name, started_at, status, error
  FROM job_runs
  WHERE status = 'error'
  ORDER BY started_at DESC
  LIMIT 50;

  -- Breakdown of providers called (per run)
  SELECT run_id, provider, count(*) AS calls
  FROM job_http_calls
  GROUP BY run_id, provider
  ORDER BY run_id, provider;

  -- Aggregate provider breakdown (all time)
  SELECT provider, count(*) AS total_calls
  FROM job_http_calls
  GROUP BY provider
  ORDER BY total_calls DESC;
*/

/** For debugging: returns current runId from context; logs when DEBUG_JOB_OBS=true */
export function __debugGetCurrentRunId(): string | null {
  const id = getJobRunId();
  if (process.env.DEBUG_JOB_OBS === "true" || process.env.DEBUG_JOB_OBS === "1") {
    console.log("[job-observability] __debugGetCurrentRunId:", id ?? "(none)");
  }
  return id;
}
