/**
 * Bounded Goalserve standings refresh for production cron (current season only by default).
 *
 * Env:
 *   STANDINGS_BATCH_LIMIT (default 3)
 *   STANDINGS_COMPETITION_IDS (comma-separated Goalserve league ids, optional)
 *   STANDINGS_SEASON (optional; when set uses historical feed — manual/backfill only)
 *   STANDINGS_TIMEOUT_MS (default 120000 per competition)
 *   STANDINGS_DRY_RUN=1
 *   STANDINGS_FORCE=1
 */

import { db } from "../db";
import { competitions, standingsSnapshots } from "@shared/schema";
import { and, eq, inArray, isNotNull, max, or } from "drizzle-orm";
import { runWithJobContext } from "../lib/job-context";
import { finishJobRun, startJobRun } from "../lib/job-observability";
import { upsertGoalserveStandings } from "./upsert-goalserve-standings";

export const DEFAULT_STANDINGS_BATCH_LIMIT = 3;
export const DEFAULT_STANDINGS_TIMEOUT_MS = 120_000;

export type RefreshStandingsOptions = {
  limit?: number;
  /** Goalserve league ids (e.g. 1204,1205). */
  competitionIds?: string[];
  /** Competition slugs / canonical slugs when ids omitted. */
  slugs?: string[];
  /** When omitted/empty: current-season feed (no season query param). */
  season?: string | null;
  dryRun?: boolean;
  force?: boolean;
  timeoutMs?: number;
};

export type RefreshStandingsCompetitionResult = {
  leagueId: string;
  canonicalSlug: string | null;
  competitionName: string | null;
  ok: boolean;
  skipped?: boolean;
  insertedRowsCount?: number;
  snapshotId?: string;
  durationMs: number;
  error?: string | null;
  reason?: string | null;
};

export type RefreshStandingsResult = {
  ok: boolean;
  fatal?: boolean;
  dryRun: boolean;
  seasonMode: "current" | "historical";
  season: string | null;
  limit: number;
  processed: number;
  refreshed: number;
  skipped: number;
  failed: number;
  durationMs: number;
  results: RefreshStandingsCompetitionResult[];
  error?: string;
};

type StandingsTarget = {
  leagueId: string;
  canonicalSlug: string | null;
  competitionName: string | null;
  lastAttemptedAt: Date | null;
  lastAsOf: Date | null;
};

function compareStandingsRotation(a: StandingsTarget, b: StandingsTarget): number {
  if (!a.lastAttemptedAt && !b.lastAttemptedAt) {
    // both never attempted — fall through
  } else if (!a.lastAttemptedAt) return -1;
  else if (!b.lastAttemptedAt) return 1;
  else {
    const attemptDiff = a.lastAttemptedAt.getTime() - b.lastAttemptedAt.getTime();
    if (attemptDiff !== 0) return attemptDiff;
  }

  const aAsOf = a.lastAsOf?.getTime() ?? 0;
  const bAsOf = b.lastAsOf?.getTime() ?? 0;
  if (aAsOf !== bAsOf) return aAsOf - bAsOf;

  return (a.canonicalSlug ?? a.leagueId).localeCompare(b.canonicalSlug ?? b.leagueId);
}

async function markStandingsRefreshAttempted(leagueId: string): Promise<void> {
  await db
    .update(competitions)
    .set({ standingsLastAttemptedAt: new Date() })
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
  if (!Number.isFinite(n) || n < 5_000) return DEFAULT_STANDINGS_TIMEOUT_MS;
  return Math.min(n, 300_000);
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

async function loadSnapshotFreshness(): Promise<Map<string, Date | null>> {
  const rows = await db
    .select({
      leagueId: standingsSnapshots.leagueId,
      lastAsOf: max(standingsSnapshots.asOf),
    })
    .from(standingsSnapshots)
    .groupBy(standingsSnapshots.leagueId);

  const map = new Map<string, Date | null>();
  for (const row of rows) {
    const asOf =
      row.lastAsOf instanceof Date
        ? row.lastAsOf
        : row.lastAsOf
          ? new Date(row.lastAsOf as string)
          : null;
    map.set(row.leagueId, asOf);
  }
  return map;
}

async function resolveTargets(
  limit: number,
  competitionIds?: string[],
  slugs?: string[],
): Promise<StandingsTarget[]> {
  const freshness = await loadSnapshotFreshness();

  if (competitionIds?.length || slugs?.length) {
    const idFilters = [];
    if (competitionIds?.length) {
      idFilters.push(inArray(competitions.goalserveCompetitionId, competitionIds));
    }
    if (slugs?.length) {
      idFilters.push(
        or(inArray(competitions.slug, slugs), inArray(competitions.canonicalSlug, slugs))!,
      );
    }

    const matchFilter =
      idFilters.length === 1 ? idFilters[0] : idFilters.length > 1 ? or(...idFilters) : undefined;
    if (!matchFilter) return [];

    const rows = await db
      .select({
        leagueId: competitions.goalserveCompetitionId,
        slug: competitions.slug,
        canonicalSlug: competitions.canonicalSlug,
        name: competitions.name,
        lastAttemptedAt: competitions.standingsLastAttemptedAt,
      })
      .from(competitions)
      .where(and(isNotNull(competitions.goalserveCompetitionId), matchFilter));

    const targets: StandingsTarget[] = [];
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
        lastAsOf: freshness.get(leagueId) ?? null,
      });
    }

    if (competitionIds?.length) {
      const order = new Map(competitionIds.map((id, i) => [id, i]));
      targets.sort((a, b) => (order.get(a.leagueId) ?? 999) - (order.get(b.leagueId) ?? 999));
    } else {
      targets.sort(compareStandingsRotation);
    }

    return targets.slice(0, limit);
  }

  const rows = await db
    .select({
      leagueId: competitions.goalserveCompetitionId,
      slug: competitions.slug,
      canonicalSlug: competitions.canonicalSlug,
      name: competitions.name,
      lastAttemptedAt: competitions.standingsLastAttemptedAt,
    })
    .from(competitions)
    .where(
      and(
        eq(competitions.isPriority, true),
        eq(competitions.isCup, false),
        isNotNull(competitions.goalserveCompetitionId),
      ),
    );

  const targets: StandingsTarget[] = rows
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
        lastAsOf: freshness.get(leagueId) ?? null,
      };
    })
    .sort(compareStandingsRotation);

  return targets.slice(0, limit);
}

export function refreshStandingsOptionsFromEnv(): RefreshStandingsOptions {
  const competitionIds = process.env.STANDINGS_COMPETITION_IDS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const season = process.env.STANDINGS_SEASON?.trim() || null;

  return {
    limit: process.env.STANDINGS_BATCH_LIMIT
      ? parseInt(process.env.STANDINGS_BATCH_LIMIT, 10)
      : undefined,
    competitionIds: competitionIds?.length ? competitionIds : undefined,
    season: season || null,
    dryRun: parseBool(process.env.STANDINGS_DRY_RUN),
    force: parseBool(process.env.STANDINGS_FORCE),
    timeoutMs: process.env.STANDINGS_TIMEOUT_MS
      ? parseInt(process.env.STANDINGS_TIMEOUT_MS, 10)
      : undefined,
  };
}

export async function runRefreshGoalserveStandings(
  options: RefreshStandingsOptions = {},
): Promise<RefreshStandingsResult> {
  const startedAt = Date.now();
  const envDefaults = refreshStandingsOptionsFromEnv();

  const limit = parseLimit(options.limit ?? envDefaults.limit, DEFAULT_STANDINGS_BATCH_LIMIT);
  const timeoutMs = parseTimeoutMs(options.timeoutMs ?? envDefaults.timeoutMs);
  const dryRun = options.dryRun ?? envDefaults.dryRun ?? false;
  const force = options.force ?? envDefaults.force ?? false;
  const seasonRaw = options.season ?? envDefaults.season ?? null;
  const season = seasonRaw?.trim() || null;
  const seasonMode = season ? "historical" : "current";

  if (!process.env.GOALSERVE_FEED_KEY?.trim()) {
    return {
      ok: false,
      fatal: true,
      dryRun,
      seasonMode,
      season,
      limit,
      processed: 0,
      refreshed: 0,
      skipped: 0,
      failed: 0,
      durationMs: Date.now() - startedAt,
      results: [],
      error: "GOALSERVE_FEED_KEY is not configured",
    };
  }

  const run = await startJobRun("refresh_goalserve_standings", {
    limit,
    seasonMode,
    season,
    dryRun,
    force,
    timeoutMs,
  });

  return runWithJobContext(run.id, async () => {
    try {
      const targets = await resolveTargets(
        limit,
        options.competitionIds ?? envDefaults.competitionIds,
        options.slugs,
      );

      if (targets.length === 0) {
        await finishJobRun(run.id, {
          status: "error",
          error: "No standings targets resolved",
          counters: { processed: 0, failed: 0 },
        });
        return {
          ok: false,
          fatal: true,
          dryRun,
          seasonMode,
          season,
          limit,
          processed: 0,
          refreshed: 0,
          skipped: 0,
          failed: 0,
          durationMs: Date.now() - startedAt,
          results: [],
          error: "No standings targets resolved (check STANDINGS_COMPETITION_IDS or priority competitions in DB)",
        };
      }

      const results: RefreshStandingsCompetitionResult[] = [];
      let refreshed = 0;
      let skipped = 0;
      let failed = 0;

      console.log(
        `[refresh-standings] start mode=${seasonMode} limit=${limit} targets=${targets.length} dryRun=${dryRun} force=${force}`,
      );

      for (const target of targets) {
        const compStarted = Date.now();
        const label = target.canonicalSlug ?? target.leagueId;
        console.log(
          `[refresh-standings] competition start leagueId=${target.leagueId} slug=${label} lastAttemptedAt=${target.lastAttemptedAt?.toISOString() ?? "never"} lastAsOf=${target.lastAsOf?.toISOString() ?? "never"}`,
        );

        if (dryRun) {
          results.push({
            leagueId: target.leagueId,
            canonicalSlug: target.canonicalSlug,
            competitionName: target.competitionName,
            ok: true,
            skipped: true,
            insertedRowsCount: 0,
            durationMs: Date.now() - compStarted,
            reason: "dry_run",
          });
          skipped++;
          console.log(`[refresh-standings] competition end leagueId=${target.leagueId} dry-run`);
          continue;
        }

        try {
          const upsertResult = await withTimeout(
            timeoutMs,
            `standings leagueId=${target.leagueId}`,
            () =>
              upsertGoalserveStandings(target.leagueId, {
                seasonParam: season ?? undefined,
                force,
              }),
          );

          const durationMs = Date.now() - compStarted;
          const compOk = upsertResult.ok && !upsertResult.skipped;
          const compSkipped = Boolean(upsertResult.skipped);

          results.push({
            leagueId: target.leagueId,
            canonicalSlug: target.canonicalSlug,
            competitionName: target.competitionName,
            ok: upsertResult.ok,
            skipped: compSkipped,
            insertedRowsCount: upsertResult.insertedRowsCount,
            snapshotId: upsertResult.snapshotId,
            durationMs,
            error: upsertResult.ok ? null : upsertResult.error ?? null,
            reason: upsertResult.reason ?? null,
          });

          if (compOk) refreshed++;
          else if (compSkipped) skipped++;
          else failed++;

          if (upsertResult.ok) {
            await markStandingsRefreshAttempted(target.leagueId);
          }

          console.log(
            `[refresh-standings] competition end leagueId=${target.leagueId} ok=${upsertResult.ok} skipped=${compSkipped} rows=${upsertResult.insertedRowsCount} durationMs=${durationMs}${upsertResult.error ? ` error=${upsertResult.error}` : ""}`,
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
            durationMs,
            error: message,
          });
          console.error(
            `[refresh-standings] competition failed leagueId=${target.leagueId} durationMs=${durationMs} error=${message}`,
          );
        }
      }

      const durationMs = Date.now() - startedAt;
      const processed = results.length;
      const jobStatus = failed > 0 && refreshed === 0 ? "error" : failed > 0 ? "partial" : "success";

      await finishJobRun(run.id, {
        status: jobStatus,
        counters: { processed, refreshed, skipped, failed, durationMs },
      });

      console.log(
        `[refresh-standings] done processed=${processed} refreshed=${refreshed} skipped=${skipped} failed=${failed} durationMs=${durationMs}`,
      );

      return {
        ok: true,
        dryRun,
        seasonMode,
        season,
        limit,
        processed,
        refreshed,
        skipped,
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
        seasonMode,
        season,
        limit,
        processed: 0,
        refreshed: 0,
        skipped: 0,
        failed: 0,
        durationMs: Date.now() - startedAt,
        results: [],
        error: message,
      };
    }
  });
}
