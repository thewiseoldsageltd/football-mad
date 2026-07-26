/**
 * Bounded full-season Goalserve fixtures refresh for priority MVP leagues.
 *
 * Shared by CLI (`npm run refresh:priority-fixtures`) and HTTP
 * `POST /api/jobs/refresh-priority-league-fixtures`.
 *
 * Env:
 *   FIXTURES_BATCH_LIMIT (default 2, max 25)
 *   FIXTURES_COMPETITION_IDS (comma-separated Goalserve league ids, optional)
 *   FIXTURES_TIMEOUT_MS (default 180000 per competition)
 *   FIXTURES_SUPPLEMENTARY_INTERVAL_MS (default 21600000 = 6h)
 *   FIXTURES_SUPPLEMENTARY=auto|always|never
 *   FIXTURES_DRY_RUN=1
 */

import { db } from "../db";
import { competitions } from "@shared/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { runWithJobContext } from "../lib/job-context";
import { finishJobRun, startJobRun } from "../lib/job-observability";
import { syncGoalserveMatches } from "./sync-goalserve-matches";
import {
  CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID,
  ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID,
  syncGoalserveClubFriendliesForKnownTeams,
} from "./sync-goalserve-club-friendlies";
import {
  SPECIAL_COMPETITION_ALLOWLIST,
  syncGoalserveSpecialCompetitions,
} from "./sync-goalserve-special-competitions";

export const DEFAULT_FIXTURES_BATCH_LIMIT = 2;
export const MAX_FIXTURES_BATCH_LIMIT = 25;
export const DEFAULT_FIXTURES_TIMEOUT_MS = 180_000;
/** Default: run friendlies + special comps at most once per 6 hours via this job. */
export const DEFAULT_SUPPLEMENTARY_INTERVAL_MS = 6 * 60 * 60 * 1000;

const EMIRATES_CUP_GOALSERVE_LEAGUE_ID = "1759";

export type RefreshFixturesOptions = {
  limit?: number;
  competitionIds?: string[];
  dryRun?: boolean;
  timeoutMs?: number;
  /**
   * auto (default): run when last attempt older than supplementary interval.
   * always: force run.
   * never: skip.
   */
  supplementary?: "auto" | "always" | "never";
  supplementaryIntervalMs?: number;
};

export type RefreshFixturesCompetitionResult = {
  leagueId: string;
  canonicalSlug: string | null;
  competitionName: string | null;
  ok: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  totalFromGoalserve: number;
  durationMs: number;
  error?: string | null;
};

export type SupplementaryStepStatus = "run" | "skipped_not_due" | "skipped_forced" | "failed";

export type SupplementaryStepResult = {
  status: SupplementaryStepStatus;
  reason?: string;
  ok?: boolean;
  inserted?: number;
  updated?: number;
  skipped?: number;
  durationMs?: number;
  error?: string | null;
  lastAttemptedAt?: string | null;
  dueAfterMs?: number;
  results?: Array<Record<string, unknown>>;
};

export type RefreshFixturesResult = {
  ok: boolean;
  fatal?: boolean;
  dryRun: boolean;
  limit: number;
  timeoutMs: number;
  processed: number;
  synced: number;
  failed: number;
  durationMs: number;
  results: RefreshFixturesCompetitionResult[];
  supplementary: {
    friendlies: SupplementaryStepResult;
    special: SupplementaryStepResult;
  };
  overlapNote: string;
  error?: string;
};

type FixturesTarget = {
  leagueId: string;
  canonicalSlug: string | null;
  competitionName: string | null;
  lastAttemptedAt: Date | null;
};

function compareFixturesRotation(a: FixturesTarget, b: FixturesTarget): number {
  if (!a.lastAttemptedAt && !b.lastAttemptedAt) {
    // both never attempted
  } else if (!a.lastAttemptedAt) return -1;
  else if (!b.lastAttemptedAt) return 1;
  else {
    const attemptDiff = a.lastAttemptedAt.getTime() - b.lastAttemptedAt.getTime();
    if (attemptDiff !== 0) return attemptDiff;
  }

  return (a.canonicalSlug ?? a.leagueId).localeCompare(b.canonicalSlug ?? b.leagueId);
}

async function markFixturesRefreshAttempted(leagueId: string): Promise<void> {
  await db
    .update(competitions)
    .set({ fixturesLastAttemptedAt: new Date() })
    .where(eq(competitions.goalserveCompetitionId, leagueId));
}

async function readFixturesLastAttemptedAt(leagueId: string): Promise<Date | null> {
  const [row] = await db
    .select({ lastAttemptedAt: competitions.fixturesLastAttemptedAt })
    .from(competitions)
    .where(eq(competitions.goalserveCompetitionId, leagueId))
    .limit(1);
  if (!row?.lastAttemptedAt) return null;
  return row.lastAttemptedAt instanceof Date
    ? row.lastAttemptedAt
    : new Date(row.lastAttemptedAt);
}

function parseBool(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  return false;
}

function parseLimit(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, MAX_FIXTURES_BATCH_LIMIT);
}

function parseTimeoutMs(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 5_000) return DEFAULT_FIXTURES_TIMEOUT_MS;
  return Math.min(n, 600_000);
}

function parseSupplementaryMode(value: unknown): "auto" | "always" | "never" {
  if (value === "always" || value === "never" || value === "auto") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "always" || v === "1" || v === "true" || v === "yes") return "always";
    if (v === "never" || v === "0" || v === "false" || v === "no") return "never";
    if (v === "auto") return "auto";
  }
  return "auto";
}

function withTimeout<T>(ms: number, label: string, fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    fn()
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

async function resolveTargets(limit: number, competitionIds?: string[]): Promise<FixturesTarget[]> {
  if (competitionIds?.length) {
    const rows = await db
      .select({
        leagueId: competitions.goalserveCompetitionId,
        slug: competitions.slug,
        canonicalSlug: competitions.canonicalSlug,
        name: competitions.name,
        lastAttemptedAt: competitions.fixturesLastAttemptedAt,
      })
      .from(competitions)
      .where(
        and(
          isNotNull(competitions.goalserveCompetitionId),
          inArray(competitions.goalserveCompetitionId, competitionIds),
        ),
      );

    const targets: FixturesTarget[] = [];
    for (const row of rows) {
      const leagueId = row.leagueId?.trim();
      if (!leagueId) continue;
      targets.push({
        leagueId,
        canonicalSlug: row.canonicalSlug ?? row.slug,
        competitionName: row.name,
        lastAttemptedAt:
          row.lastAttemptedAt instanceof Date
            ? row.lastAttemptedAt
            : row.lastAttemptedAt
              ? new Date(row.lastAttemptedAt)
              : null,
      });
    }

    const order = new Map(competitionIds.map((id, i) => [id, i]));
    targets.sort((a, b) => (order.get(a.leagueId) ?? 999) - (order.get(b.leagueId) ?? 999));
    return targets.slice(0, limit);
  }

  const rows = await db
    .select({
      leagueId: competitions.goalserveCompetitionId,
      slug: competitions.slug,
      canonicalSlug: competitions.canonicalSlug,
      name: competitions.name,
      lastAttemptedAt: competitions.fixturesLastAttemptedAt,
    })
    .from(competitions)
    .where(
      and(eq(competitions.isPriority, true), isNotNull(competitions.goalserveCompetitionId)),
    );

  return rows
    .map((row) => {
      const leagueId = row.leagueId!.trim();
      return {
        leagueId,
        canonicalSlug: row.canonicalSlug ?? row.slug,
        competitionName: row.name,
        lastAttemptedAt:
          row.lastAttemptedAt instanceof Date
            ? row.lastAttemptedAt
            : row.lastAttemptedAt
              ? new Date(row.lastAttemptedAt)
              : null,
      };
    })
    .sort(compareFixturesRotation)
    .slice(0, limit);
}

function isDue(lastAttemptedAt: Date | null, intervalMs: number, now: number): boolean {
  if (!lastAttemptedAt) return true;
  return now - lastAttemptedAt.getTime() >= intervalMs;
}

export function refreshFixturesOptionsFromEnv(): RefreshFixturesOptions {
  const competitionIds = process.env.FIXTURES_COMPETITION_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    limit: process.env.FIXTURES_BATCH_LIMIT
      ? parseInt(process.env.FIXTURES_BATCH_LIMIT, 10)
      : undefined,
    competitionIds: competitionIds?.length ? competitionIds : undefined,
    dryRun: parseBool(process.env.FIXTURES_DRY_RUN),
    timeoutMs: process.env.FIXTURES_TIMEOUT_MS
      ? parseInt(process.env.FIXTURES_TIMEOUT_MS, 10)
      : undefined,
    supplementary: parseSupplementaryMode(process.env.FIXTURES_SUPPLEMENTARY),
    supplementaryIntervalMs: process.env.FIXTURES_SUPPLEMENTARY_INTERVAL_MS
      ? parseInt(process.env.FIXTURES_SUPPLEMENTARY_INTERVAL_MS, 10)
      : undefined,
  };
}

async function maybeRunFriendlies(opts: {
  mode: "auto" | "always" | "never";
  intervalMs: number;
  timeoutMs: number;
  dryRun: boolean;
  runId: string;
}): Promise<SupplementaryStepResult> {
  const lastAttemptedAt = await readFixturesLastAttemptedAt(CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID);
  const now = Date.now();

  if (opts.mode === "never") {
    return {
      status: "skipped_forced",
      reason: "supplementary=never",
      lastAttemptedAt: lastAttemptedAt?.toISOString() ?? null,
    };
  }

  if (opts.mode === "auto" && !isDue(lastAttemptedAt, opts.intervalMs, now)) {
    const dueAfterMs = opts.intervalMs - (now - (lastAttemptedAt?.getTime() ?? now));
    return {
      status: "skipped_not_due",
      reason: `last attempt within ${opts.intervalMs}ms`,
      lastAttemptedAt: lastAttemptedAt?.toISOString() ?? null,
      dueAfterMs: Math.max(0, dueAfterMs),
    };
  }

  if (opts.dryRun) {
    return {
      status: "run",
      ok: true,
      reason: "dry-run",
      inserted: 0,
      updated: 0,
      skipped: 0,
      durationMs: 0,
      lastAttemptedAt: lastAttemptedAt?.toISOString() ?? null,
    };
  }

  const started = Date.now();
  await markFixturesRefreshAttempted(CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID);
  try {
    const result = await withTimeout(
      opts.timeoutMs,
      `friendlies leagueId=${CLUB_FRIENDLIES_GOALSERVE_LEAGUE_ID}`,
      () => syncGoalserveClubFriendliesForKnownTeams(undefined, opts.runId || undefined),
    );
    const skipped = (result.skippedNoStaticId ?? 0) + (result.skippedNoKickoff ?? 0);
    return {
      status: result.ok ? "run" : "failed",
      ok: result.ok,
      inserted: result.inserted ?? 0,
      updated: result.updated ?? 0,
      skipped,
      durationMs: Date.now() - started,
      error: result.ok ? null : result.error ?? null,
      lastAttemptedAt: new Date().toISOString(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "failed",
      ok: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      durationMs: Date.now() - started,
      error: message,
      lastAttemptedAt: new Date().toISOString(),
    };
  }
}

async function maybeRunSpecial(opts: {
  mode: "auto" | "always" | "never";
  intervalMs: number;
  timeoutMs: number;
  dryRun: boolean;
  runId: string;
}): Promise<SupplementaryStepResult> {
  const markers = Array.from(
    new Set([
      ENGLAND_SUPER_CUP_GOALSERVE_LEAGUE_ID,
      EMIRATES_CUP_GOALSERVE_LEAGUE_ID,
      ...SPECIAL_COMPETITION_ALLOWLIST,
    ]),
  );
  const stamps = await Promise.all(markers.map((id) => readFixturesLastAttemptedAt(id)));
  const lastAttemptedAt = stamps.reduce<Date | null>((oldest, cur) => {
    if (!cur) return oldest;
    if (!oldest) return cur;
    return cur.getTime() < oldest.getTime() ? cur : oldest;
  }, null);
  const anyNever = stamps.some((s) => s == null);
  const now = Date.now();

  if (opts.mode === "never") {
    return {
      status: "skipped_forced",
      reason: "supplementary=never",
      lastAttemptedAt: lastAttemptedAt?.toISOString() ?? null,
    };
  }

  if (opts.mode === "auto" && !anyNever && !isDue(lastAttemptedAt, opts.intervalMs, now)) {
    const dueAfterMs = opts.intervalMs - (now - (lastAttemptedAt?.getTime() ?? now));
    return {
      status: "skipped_not_due",
      reason: `last attempt within ${opts.intervalMs}ms`,
      lastAttemptedAt: lastAttemptedAt?.toISOString() ?? null,
      dueAfterMs: Math.max(0, dueAfterMs),
    };
  }

  if (opts.dryRun) {
    return {
      status: "run",
      ok: true,
      reason: "dry-run",
      inserted: 0,
      updated: 0,
      skipped: 0,
      durationMs: 0,
      lastAttemptedAt: lastAttemptedAt?.toISOString() ?? null,
    };
  }

  const started = Date.now();
  for (const id of markers) {
    await markFixturesRefreshAttempted(id);
  }
  try {
    const special = await withTimeout(
      opts.timeoutMs,
      "special competitions",
      () => syncGoalserveSpecialCompetitions(opts.runId || undefined),
    );
    const inserted = special.synced.reduce((n, r) => n + (r.inserted ?? 0), 0);
    const updated = special.synced.reduce((n, r) => n + (r.updated ?? 0), 0);
    const skipped = special.synced.reduce(
      (n, r) => n + (r.skippedNoStaticId ?? 0) + (r.skippedNoKickoff ?? 0),
      0,
    );
    return {
      status: special.ok ? "run" : "failed",
      ok: special.ok,
      inserted,
      updated,
      skipped,
      durationMs: Date.now() - started,
      error: special.ok ? null : special.errors.join("; ") || null,
      lastAttemptedAt: new Date().toISOString(),
      results: special.synced.map((s) => ({
        leagueId: s.leagueId,
        ok: s.ok,
        inserted: s.inserted,
        updated: s.updated,
        seasonKey: s.seasonKey,
        source: s.source,
        error: s.error,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      status: "failed",
      ok: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      durationMs: Date.now() - started,
      error: message,
      lastAttemptedAt: new Date().toISOString(),
    };
  }
}

function emptySupplementary(): RefreshFixturesResult["supplementary"] {
  return {
    friendlies: { status: "skipped_forced", reason: "not evaluated" },
    special: { status: "skipped_forced", reason: "not evaluated" },
  };
}

export async function runRefreshGoalserveFixtures(
  options: RefreshFixturesOptions = {},
): Promise<RefreshFixturesResult> {
  const startedAt = Date.now();
  const envDefaults = refreshFixturesOptionsFromEnv();

  const limit = parseLimit(options.limit ?? envDefaults.limit, DEFAULT_FIXTURES_BATCH_LIMIT);
  const timeoutMs = parseTimeoutMs(options.timeoutMs ?? envDefaults.timeoutMs);
  const dryRun = options.dryRun ?? envDefaults.dryRun ?? false;
  const competitionIds = options.competitionIds ?? envDefaults.competitionIds;
  const supplementaryMode = options.supplementary ?? envDefaults.supplementary ?? "auto";
  const supplementaryIntervalMs = (() => {
    const n = options.supplementaryIntervalMs ?? envDefaults.supplementaryIntervalMs;
    if (typeof n === "number" && Number.isFinite(n) && n >= 60_000) return n;
    return DEFAULT_SUPPLEMENTARY_INTERVAL_MS;
  })();

  const overlapNote =
    "Attempt timestamps are claimed at the start of each competition/supplementary step to reduce overlap. A short race remains between target selection and claim; upsert-by-static_id prevents duplicate fixture rows.";

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      ok: false,
      fatal: true,
      dryRun,
      limit,
      timeoutMs,
      processed: 0,
      synced: 0,
      failed: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      supplementary: emptySupplementary(),
      overlapNote,
      error: "DATABASE_URL is not configured",
    };
  }

  if (!process.env.GOALSERVE_FEED_KEY?.trim()) {
    return {
      ok: false,
      fatal: true,
      dryRun,
      limit,
      timeoutMs,
      processed: 0,
      synced: 0,
      failed: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      supplementary: emptySupplementary(),
      overlapNote,
      error: "GOALSERVE_FEED_KEY is not configured",
    };
  }

  const run = await startJobRun("refresh_goalserve_fixtures", {
    limit,
    dryRun,
    timeoutMs,
    competitionIds: competitionIds ?? null,
    supplementaryMode,
    supplementaryIntervalMs,
  });

  return runWithJobContext(run.id, async () => {
    try {
      const targets = await resolveTargets(limit, competitionIds);

      if (targets.length === 0) {
        await finishJobRun(run.id, {
          status: "error",
          error: "No fixtures targets resolved",
          counters: { processed: 0, failed: 0 },
        });
        return {
          ok: false,
          fatal: true,
          dryRun,
          limit,
          timeoutMs,
          processed: 0,
          synced: 0,
          failed: 0,
          durationMs: Date.now() - startedAt,
          results: [],
          supplementary: emptySupplementary(),
          overlapNote,
          error:
            "No fixtures targets resolved (check FIXTURES_COMPETITION_IDS or is_priority competitions in DB)",
        };
      }

      const results: RefreshFixturesCompetitionResult[] = [];
      let synced = 0;
      let failed = 0;

      console.log(
        `[refresh-fixtures] start limit=${limit} targets=${targets.length} dryRun=${dryRun} supplementary=${supplementaryMode}`,
      );

      for (const target of targets) {
        const compStarted = Date.now();
        const label = target.canonicalSlug ?? target.leagueId;
        console.log(
          `[refresh-fixtures] competition start leagueId=${target.leagueId} slug=${label} lastAttemptedAt=${target.lastAttemptedAt?.toISOString() ?? "never"}`,
        );

        if (dryRun) {
          results.push({
            leagueId: target.leagueId,
            canonicalSlug: target.canonicalSlug,
            competitionName: target.competitionName,
            ok: true,
            inserted: 0,
            updated: 0,
            skipped: 0,
            totalFromGoalserve: 0,
            durationMs: Date.now() - compStarted,
          });
          console.log(`[refresh-fixtures] competition end leagueId=${target.leagueId} dry-run`);
          continue;
        }

        // Claim before sync so overlapping cron invocations rotate to other leagues.
        await markFixturesRefreshAttempted(target.leagueId);

        try {
          const syncResult = await withTimeout(
            timeoutMs,
            `fixtures leagueId=${target.leagueId}`,
            () => syncGoalserveMatches(target.leagueId, undefined, run.id),
          );

          const durationMs = Date.now() - compStarted;
          const skipped =
            (syncResult.skippedNoStaticId ?? 0) + (syncResult.skippedNoKickoff ?? 0);

          results.push({
            leagueId: target.leagueId,
            canonicalSlug: target.canonicalSlug,
            competitionName: target.competitionName,
            ok: syncResult.ok,
            inserted: syncResult.inserted ?? 0,
            updated: syncResult.updated ?? 0,
            skipped,
            totalFromGoalserve: syncResult.totalFromGoalserve ?? 0,
            durationMs,
            error: syncResult.ok ? null : syncResult.error ?? null,
          });

          if (syncResult.ok) synced++;
          else failed++;

          console.log(
            `[refresh-fixtures] competition end leagueId=${target.leagueId} ok=${syncResult.ok} inserted=${syncResult.inserted ?? 0} updated=${syncResult.updated ?? 0} skipped=${skipped} durationMs=${durationMs}${syncResult.error ? ` error=${syncResult.error}` : ""}`,
          );
        } catch (err) {
          const durationMs = Date.now() - compStarted;
          const message = err instanceof Error ? err.message : String(err);
          failed++;
          results.push({
            leagueId: target.leagueId,
            canonicalSlug: target.canonicalSlug,
            competitionName: target.competitionName,
            ok: false,
            inserted: 0,
            updated: 0,
            skipped: 0,
            totalFromGoalserve: 0,
            durationMs,
            error: message,
          });
          console.error(
            `[refresh-fixtures] competition failed leagueId=${target.leagueId} durationMs=${durationMs} error=${message}`,
          );
        }
      }

      const friendlies = await maybeRunFriendlies({
        mode: supplementaryMode,
        intervalMs: supplementaryIntervalMs,
        timeoutMs,
        dryRun,
        runId: run.id,
      });
      const special = await maybeRunSpecial({
        mode: supplementaryMode,
        intervalMs: supplementaryIntervalMs,
        timeoutMs,
        dryRun,
        runId: run.id,
      });

      const durationMs = Date.now() - startedAt;
      const processed = results.length;
      const supplementaryFailed =
        friendlies.status === "failed" || special.status === "failed";
      const jobStatus =
        failed > 0 && synced === 0
          ? "error"
          : failed > 0 || supplementaryFailed
            ? "partial"
            : "success";

      await finishJobRun(run.id, {
        status: jobStatus,
        counters: {
          processed,
          synced,
          failed,
          durationMs,
        },
        error:
          friendlies.status === "failed" || special.status === "failed"
            ? [friendlies.error, special.error].filter(Boolean).join("; ") || null
            : null,
      });

      console.log(
        `[refresh-fixtures] done processed=${processed} synced=${synced} failed=${failed} friendlies=${friendlies.status} special=${special.status} durationMs=${durationMs}`,
      );

      return {
        // Partial competition failures are non-fatal (same as prior CLI behaviour).
        ok: true,
        dryRun,
        limit,
        timeoutMs,
        processed,
        synced,
        failed,
        durationMs,
        results,
        supplementary: { friendlies, special },
        overlapNote,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await finishJobRun(run.id, { status: "error", error: message });
      return {
        ok: false,
        fatal: true,
        dryRun,
        limit,
        timeoutMs,
        processed: 0,
        synced: 0,
        failed: 0,
        durationMs: Date.now() - startedAt,
        results: [],
        supplementary: emptySupplementary(),
        overlapNote,
        error: message,
      };
    }
  });
}
