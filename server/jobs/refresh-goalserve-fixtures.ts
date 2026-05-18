/**
 * Bounded full-season Goalserve fixtures refresh for priority MVP leagues (CLI/cron).
 *
 * Env:
 *   FIXTURES_BATCH_LIMIT (default 2)
 *   FIXTURES_COMPETITION_IDS (comma-separated Goalserve league ids, optional)
 *   FIXTURES_TIMEOUT_MS (default 180000 per competition)
 *   FIXTURES_DRY_RUN=1
 */

import { db } from "../db";
import { competitions } from "@shared/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { runWithJobContext } from "../lib/job-context";
import { finishJobRun, startJobRun } from "../lib/job-observability";
import { syncGoalserveMatches } from "./sync-goalserve-matches";

export const DEFAULT_FIXTURES_BATCH_LIMIT = 2;
export const DEFAULT_FIXTURES_TIMEOUT_MS = 180_000;

export type RefreshFixturesOptions = {
  limit?: number;
  competitionIds?: string[];
  dryRun?: boolean;
  timeoutMs?: number;
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

export type RefreshFixturesResult = {
  ok: boolean;
  fatal?: boolean;
  dryRun: boolean;
  limit: number;
  processed: number;
  synced: number;
  failed: number;
  durationMs: number;
  results: RefreshFixturesCompetitionResult[];
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
  return Math.min(n, 25);
}

function parseTimeoutMs(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 5_000) return DEFAULT_FIXTURES_TIMEOUT_MS;
  return Math.min(n, 600_000);
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

  if (!process.env.DATABASE_URL?.trim()) {
    return {
      ok: false,
      fatal: true,
      dryRun,
      limit,
      processed: 0,
      synced: 0,
      failed: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      error: "DATABASE_URL is not configured",
    };
  }

  if (!process.env.GOALSERVE_FEED_KEY?.trim()) {
    return {
      ok: false,
      fatal: true,
      dryRun,
      limit,
      processed: 0,
      synced: 0,
      failed: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      error: "GOALSERVE_FEED_KEY is not configured",
    };
  }

  const run = await startJobRun("refresh_goalserve_fixtures", {
    limit,
    dryRun,
    timeoutMs,
    competitionIds: competitionIds ?? null,
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
          processed: 0,
          synced: 0,
          failed: 0,
          durationMs: Date.now() - startedAt,
          results: [],
          error:
            "No fixtures targets resolved (check FIXTURES_COMPETITION_IDS or is_priority competitions in DB)",
        };
      }

      const results: RefreshFixturesCompetitionResult[] = [];
      let synced = 0;
      let failed = 0;

      console.log(
        `[refresh-fixtures] start limit=${limit} targets=${targets.length} dryRun=${dryRun}`,
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

          if (syncResult.ok) {
            synced++;
            await markFixturesRefreshAttempted(target.leagueId);
          } else {
            failed++;
          }

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

      const durationMs = Date.now() - startedAt;
      const processed = results.length;
      const jobStatus = failed > 0 && synced === 0 ? "error" : failed > 0 ? "partial" : "success";

      await finishJobRun(run.id, {
        status: jobStatus,
        counters: { processed, synced, failed, durationMs },
      });

      console.log(
        `[refresh-fixtures] done processed=${processed} synced=${synced} failed=${failed} durationMs=${durationMs}`,
      );

      return {
        ok: true,
        dryRun,
        limit,
        processed,
        synced,
        failed,
        durationMs,
        results,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await finishJobRun(run.id, { status: "error", error: message });
      return {
        ok: false,
        fatal: true,
        dryRun,
        limit,
        processed: 0,
        synced: 0,
        failed: 0,
        durationMs: Date.now() - startedAt,
        results: [],
        error: message,
      };
    }
  });
}
