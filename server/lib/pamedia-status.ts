export interface PamediaLastRunStatus {
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
  lastRun: PamediaLastRunStatus;
}

const status: PamediaStatus = {
  enabled: false,
  intervalMs: 900000,
  lastRun: {
    startedAt: null,
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
  },
};

export function getPamediaStatus(): PamediaStatus {
  return {
    enabled: status.enabled,
    intervalMs: status.intervalMs,
    lastRun: { ...status.lastRun },
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
  status.lastRun.startedAt = new Date().toISOString();
  status.lastRun.error = null;
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
  watermark_ts?: string | null;
  watermark_id?: string | null;
}): void {
  status.lastRun.finishedAt = new Date().toISOString();
  status.lastRun.durationMs = payload.timeMs ?? null;
  status.lastRun.fetched = payload.fetched ?? null;
  status.lastRun.processed = payload.processed ?? null;
  status.lastRun.skipped = payload.skipped ?? null;
  status.lastRun.imagesUploaded = payload.imagesUploaded ?? null;
  status.lastRun.inlineRewritten = payload.inlineRewritten ?? null;
  status.lastRun.inlineSkippedDueToCap = payload.inlineSkippedDueToCap ?? null;
  status.lastRun.stoppedReason = payload.stoppedReason ?? null;
  status.lastRun.watermarkTs = payload.watermark_ts ?? null;
  status.lastRun.watermarkId = payload.watermark_id ?? null;
  status.lastRun.error = null;
}

export function markPamediaRunFailed(err: unknown): void {
  status.lastRun.finishedAt = new Date().toISOString();
  status.lastRun.stoppedReason = "error";
  status.lastRun.error = err instanceof Error ? err.message : String(err);
}
