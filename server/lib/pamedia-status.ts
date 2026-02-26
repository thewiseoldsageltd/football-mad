export interface PamediaRunStatus {
  ok: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  fetched: number | null;
  processed: number | null;
  skipped: number | null;
  imagesUploaded: number | null;
  inlineRewritten: number | null;
  inlineSkippedDueToCap: number | null;
  stoppedReason: string | null;
  watermarkTs: string | null;
  watermarkId: string | null;
  error: string | null;
}

export interface PamediaStatus {
  enabled: boolean;
  intervalMs: number;
  now: string;
  isStale: boolean;
  staleThresholdMs: number;
  lastSuccessAgeMs: number | null;
  lastRun: PamediaRunStatus | null;
  lastSuccess: PamediaRunStatus | null;
}

interface PamediaStatusStore {
  enabled: boolean;
  intervalMs: number;
  lastRun: PamediaRunStatus | null;
  lastSuccess: PamediaRunStatus | null;
}

const status: PamediaStatusStore = {
  enabled: false,
  intervalMs: 900000,
  lastRun: null,
  lastSuccess: null,
};

function cloneRun(run: PamediaRunStatus | null): PamediaRunStatus | null {
  return run ? { ...run } : null;
}

export function getPamediaStatus(): PamediaStatus {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const staleThresholdMs = Math.max(5 * 60_000, status.intervalMs * 3);
  const successFinishedAt = status.lastSuccess?.finishedAt
    ? new Date(status.lastSuccess.finishedAt).getTime()
    : null;
  const lastSuccessAgeMs = successFinishedAt == null ? null : Math.max(0, nowMs - successFinishedAt);
  const isStale = status.enabled && (lastSuccessAgeMs == null || lastSuccessAgeMs > staleThresholdMs);

  return {
    enabled: status.enabled,
    intervalMs: status.intervalMs,
    now,
    isStale,
    staleThresholdMs,
    lastSuccessAgeMs,
    lastRun: cloneRun(status.lastRun),
    lastSuccess: cloneRun(status.lastSuccess),
  };
}

export function setPamediaRunnerConfig(enabled: boolean, intervalMs: number): void {
  status.enabled = enabled;
  status.intervalMs = intervalMs;
}

export function markPamediaEnabled(intervalMs: number): void {
  status.enabled = true;
  status.intervalMs = intervalMs;
}

export function markPamediaRunStarted(): void {
  status.lastRun = {
    ok: false,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
    fetched: null,
    processed: null,
    skipped: null,
    imagesUploaded: null,
    inlineRewritten: null,
    inlineSkippedDueToCap: null,
    stoppedReason: null,
    watermarkTs: null,
    watermarkId: null,
    error: null,
  };
}

export function markPamediaRunCompleted(payload: {
  fetched?: number | null;
  processed?: number | null;
  skipped?: number | null;
  imagesUploaded?: number | null;
  inlineRewritten?: number | null;
  inlineSkippedDueToCap?: number | null;
  timeMs?: number | null;
  stoppedReason?: string | null;
  watermarkTs?: string | null;
  watermarkId?: string | null;
}): void {
  const finishedAt = new Date().toISOString();
  const startedAt = status.lastRun?.startedAt ?? finishedAt;
  const durationMs =
    payload.timeMs ??
    Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
  const run: PamediaRunStatus = {
    ok: true,
    startedAt,
    finishedAt,
    durationMs,
    fetched: payload.fetched ?? null,
    processed: payload.processed ?? null,
    skipped: payload.skipped ?? null,
    imagesUploaded: payload.imagesUploaded ?? null,
    inlineRewritten: payload.inlineRewritten ?? null,
    inlineSkippedDueToCap: payload.inlineSkippedDueToCap ?? null,
    stoppedReason: payload.stoppedReason ?? null,
    watermarkTs: payload.watermarkTs ?? null,
    watermarkId: payload.watermarkId ?? null,
    error: null,
  };
  status.lastRun = run;
  status.lastSuccess = { ...run };
}

export function markPamediaRunFailed(err: unknown): void {
  const finishedAt = new Date().toISOString();
  const startedAt = status.lastRun?.startedAt ?? finishedAt;
  const error = err instanceof Error ? err.message : String(err);
  const durationMs = Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime());
  status.lastRun = {
    ok: false,
    startedAt,
    finishedAt,
    durationMs,
    fetched: status.lastRun?.fetched ?? null,
    processed: status.lastRun?.processed ?? null,
    skipped: status.lastRun?.skipped ?? null,
    imagesUploaded: status.lastRun?.imagesUploaded ?? null,
    inlineRewritten: status.lastRun?.inlineRewritten ?? null,
    inlineSkippedDueToCap: status.lastRun?.inlineSkippedDueToCap ?? null,
    stoppedReason: "error",
    watermarkTs: status.lastRun?.watermarkTs ?? null,
    watermarkId: status.lastRun?.watermarkId ?? null,
    error,
  };
}
