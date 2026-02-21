/**
 * Jobs observability: record runs, HTTP calls (no secrets), and counters.
 * Writes are best-effort; failures must not break the job.
 */

import { db } from "../db";
import { jobRuns, jobHttpCalls } from "@shared/schema";
import { eq } from "drizzle-orm";

const JOB_HTTP_CALLS_CAP = Math.max(100, parseInt(process.env.JOB_HTTP_CALLS_CAP ?? "2000", 10));

const runCallCounts = new Map<
  string,
  { recorded: number; dropped: number }
>();

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

export async function recordJobHttpCall(
  runId: string,
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
  if (!runId) return;
  const state = runCallCounts.get(runId);
  if (state) {
    if (state.recorded >= JOB_HTTP_CALLS_CAP) {
      state.dropped++;
      return;
    }
    state.recorded++;
  }
  try {
    await db.insert(jobHttpCalls).values({
      runId,
      provider: payload.provider,
      url: payload.url,
      method: payload.method ?? "GET",
      statusCode: payload.statusCode ?? null,
      durationMs: payload.durationMs ?? null,
      bytesIn: payload.bytesIn ?? null,
      error: payload.error ?? null,
    });
  } catch (e) {
    console.warn("[job-observability] recordJobHttpCall failed:", (e as Error).message);
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
}

export async function jobFetch(
  runId: string,
  opts: JobFetchOpts
): Promise<Response> {
  const { provider, url, method = "GET", headers, body, timeoutMs = 10000, throwOnNon2xx = false } = opts;
  const start = Date.now();
  let statusCode: number | null = null;
  let bytesIn: number | null = null;
  let errMsg: string | null = null;

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
      await recordJobHttpCall(runId, {
        provider,
        url,
        method,
        statusCode,
        durationMs: Date.now() - start,
        bytesIn,
        error: errMsg,
      });
      throw new Error(errMsg);
    }
    await recordJobHttpCall(runId, {
      provider,
      url,
      method,
      statusCode,
      durationMs: Date.now() - start,
      bytesIn,
      error: null,
    });
    return new Response(arr, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  } catch (e) {
    const durationMs = Date.now() - start;
    errMsg = (e as Error).message;
    await recordJobHttpCall(runId, {
      provider,
      url,
      method,
      statusCode,
      durationMs,
      bytesIn,
      error: errMsg,
    });
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
