import { and, desc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db, pool } from "../db";
import { articleCompetitions, articleManagers, articlePlayers, articleTeams, articles } from "@shared/schema";
import { syncArticleEntitiesFromTags } from "../lib/article-entity-sync";
import { enrichPendingArticles } from "./enrich-articles";

export type EntityBackfillMode = "tags" | "deterministic" | "all";
type EntityBackfillLane = "tags" | "deterministic";

export interface RunEntityBackfillOptions {
  mode: EntityBackfillMode;
  batchSize: number;
  timeBudgetMs: number;
  maxBatches: number;
  dryRun?: boolean;
  runId?: string | null;
}

type BackfillCheckpoint = {
  cursorSortAt: string | null;
  cursorId: string | null;
  processed: number;
  updated: number;
  errors: number;
  lastRunAt: string | null;
  status: "idle" | "running" | "partial" | "done" | "error";
  runId: string | null;
};

type LaneBatchStats = {
  scannedArticles: number;
  processedArticles: number;
  updatedArticles: number;
  unchangedArticles: number;
  errorArticles: number;
  insertedCompetitions: number;
  insertedTeams: number;
  insertedPlayers: number;
  insertedManagers: number;
  aliasMatches: number;
  staleRecovered: number;
  cursorSortAt: string | null;
  cursorId: string | null;
  done: boolean;
};

export interface RunEntityBackfillResult {
  ok: boolean;
  mode: EntityBackfillMode;
  dryRun: boolean;
  laneOrder: EntityBackfillLane[];
  stoppedReason: "done" | "time_budget" | "max_batches";
  batchesRun: number;
  timeMs: number;
  counters: {
    lane: EntityBackfillMode;
    scanned_articles: number;
    processed_articles: number;
    updated_articles: number;
    unchanged_articles: number;
    error_articles: number;
    inserted_competitions: number;
    inserted_teams: number;
    inserted_players: number;
    inserted_managers: number;
    alias_matches: number;
    stale_recovered: number;
    time_ms: number;
    stopped_reason: string;
    cursor_sort_at: string | null;
    cursor_id: string | null;
  };
  lanes: Record<EntityBackfillLane, {
    batchesRun: number;
    done: boolean;
    checkpoint: BackfillCheckpoint;
    scannedArticles: number;
    processedArticles: number;
    updatedArticles: number;
    unchangedArticles: number;
    errorArticles: number;
    insertedCompetitions: number;
    insertedTeams: number;
    insertedPlayers: number;
    insertedManagers: number;
    aliasMatches: number;
    staleRecovered: number;
  }>;
}

const JOB_STATE_TAGS_KEY = "entity_backfill:tags";
const JOB_STATE_DETERMINISTIC_KEY = "entity_backfill:deterministic";
const SOURCE_SCOPE = ["ghost", "pa_media"] as const;
const STALE_PROCESSING_MINUTES = 5;
let jobStateStorageMode: "kv" | "legacy" | null = null;

function defaultCheckpoint(): BackfillCheckpoint {
  return {
    cursorSortAt: null,
    cursorId: null,
    processed: 0,
    updated: 0,
    errors: 0,
    lastRunAt: null,
    status: "idle",
    runId: null,
  };
}

function laneToJobStateKey(lane: EntityBackfillLane): string {
  return lane === "tags" ? JOB_STATE_TAGS_KEY : JOB_STATE_DETERMINISTIC_KEY;
}

function parseCheckpoint(value: unknown): BackfillCheckpoint {
  const base = defaultCheckpoint();
  if (!value || typeof value !== "object") return base;
  const v = value as Record<string, unknown>;
  return {
    cursorSortAt: typeof v.cursorSortAt === "string" ? v.cursorSortAt : null,
    cursorId: typeof v.cursorId === "string" ? v.cursorId : null,
    processed: typeof v.processed === "number" ? v.processed : base.processed,
    updated: typeof v.updated === "number" ? v.updated : base.updated,
    errors: typeof v.errors === "number" ? v.errors : base.errors,
    lastRunAt: typeof v.lastRunAt === "string" ? v.lastRunAt : null,
    status:
      v.status === "idle" || v.status === "running" || v.status === "partial" || v.status === "done" || v.status === "error"
        ? v.status
        : base.status,
    runId: typeof v.runId === "string" ? v.runId : null,
  };
}

async function getCheckpoint(lane: EntityBackfillLane): Promise<BackfillCheckpoint> {
  const key = laneToJobStateKey(lane);
  const mode = await resolveJobStateStorageMode();
  if (mode === "kv") {
    const res = await pool.query<{ value: unknown }>(
      `SELECT value FROM job_state WHERE key = $1 LIMIT 1`,
      [key],
    );
    return parseCheckpoint(res.rows[0]?.value);
  }

  const legacy = await pool.query<{
    watermark_ts: Date | null;
    watermark_id: string | null;
    meta: unknown;
  }>(
    `SELECT watermark_ts, watermark_id, meta FROM job_state WHERE job_name = $1 LIMIT 1`,
    [key],
  );
  const row = legacy.rows[0];
  if (!row) return defaultCheckpoint();
  const parsed = parseCheckpoint((row.meta as Record<string, unknown> | null)?.checkpoint);
  if (!parsed.cursorSortAt && row.watermark_ts) parsed.cursorSortAt = new Date(row.watermark_ts).toISOString();
  if (!parsed.cursorId && row.watermark_id) parsed.cursorId = row.watermark_id;
  return parsed;
}

async function setCheckpoint(
  lane: EntityBackfillLane,
  checkpoint: BackfillCheckpoint,
): Promise<void> {
  const key = laneToJobStateKey(lane);
  const mode = await resolveJobStateStorageMode();
  if (mode === "kv") {
    await pool.query(
      `
        INSERT INTO job_state (key, value, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = now()
      `,
      [key, JSON.stringify(checkpoint)],
    );
    return;
  }

  await pool.query(
    `
      INSERT INTO job_state (job_name, watermark_ts, watermark_id, meta, updated_at)
      VALUES ($1, $2::timestamptz, $3::text, jsonb_build_object('checkpoint', $4::jsonb, 'lastRunAt', now()), now())
      ON CONFLICT (job_name) DO UPDATE
      SET
        watermark_ts = EXCLUDED.watermark_ts,
        watermark_id = EXCLUDED.watermark_id,
        meta = jsonb_set(
          jsonb_set(COALESCE(job_state.meta, '{}'::jsonb), '{checkpoint}', $4::jsonb, true),
          '{lastRunAt}',
          to_jsonb(now()),
          true
        ),
        updated_at = now()
    `,
    [
      key,
      checkpoint.cursorSortAt ? new Date(checkpoint.cursorSortAt) : null,
      checkpoint.cursorId,
      JSON.stringify(checkpoint),
    ],
  );
}

export async function getEntityBackfillStatus(): Promise<{
  tags: BackfillCheckpoint;
  deterministic: BackfillCheckpoint;
}> {
  const [tags, deterministic] = await Promise.all([
    getCheckpoint("tags"),
    getCheckpoint("deterministic"),
  ]);
  return { tags, deterministic };
}

export async function resetEntityBackfillCheckpoint(
  lane: EntityBackfillLane | "all",
): Promise<{ removedKeys: string[] }> {
  const keys =
    lane === "all"
      ? [JOB_STATE_TAGS_KEY, JOB_STATE_DETERMINISTIC_KEY]
      : [laneToJobStateKey(lane)];
  const mode = await resolveJobStateStorageMode();
  if (mode === "kv") {
    await pool.query(`DELETE FROM job_state WHERE key = ANY($1::text[])`, [keys]);
  } else {
    await pool.query(`DELETE FROM job_state WHERE job_name = ANY($1::text[])`, [keys]);
  }
  return { removedKeys: keys };
}

async function resolveJobStateStorageMode(): Promise<"kv" | "legacy"> {
  if (jobStateStorageMode) return jobStateStorageMode;
  const result = await pool.query<{ column_name: string }>(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_state'
    `,
  );
  const columns = new Set(result.rows.map((row) => row.column_name));
  if (columns.has("key") && columns.has("value")) {
    jobStateStorageMode = "kv";
    return jobStateStorageMode;
  }
  jobStateStorageMode = "legacy";
  return jobStateStorageMode;
}

function cursorCondition(cursorSortAt: string | null, cursorId: string | null) {
  if (!cursorSortAt || !cursorId) return undefined;
  const cursorDate = new Date(cursorSortAt);
  if (Number.isNaN(cursorDate.getTime())) return undefined;
  return or(
    lt(articles.sortAt, cursorDate),
    and(eq(articles.sortAt, cursorDate), lt(articles.id, cursorId)),
  );
}

function tagCompatibilityExistsSql() {
  return sql<boolean>`
    EXISTS (
      SELECT 1
      FROM unnest(${articles.tags}) AS t(raw_tag)
      JOIN pa_entity_alias_map am
        ON am.source = 'pa_media'
       AND am.pa_tag_name_normalized = regexp_replace(
         replace(
           regexp_replace(lower(trim(t.raw_tag)), '^tag:[[:space:]]*', ''),
           '-',
           ' '
         ),
         '[[:space:]]+',
         ' ',
         'g'
       )
      WHERE trim(coalesce(t.raw_tag, '')) <> ''
      LIMIT 1
    )
  `;
}

function sourceScopeCondition() {
  return inArray(articles.source, Array.from(SOURCE_SCOPE));
}

function tagScopeCondition() {
  return and(
    sourceScopeCondition(),
    sql`coalesce(array_length(${articles.tags}, 1), 0) > 0`,
    tagCompatibilityExistsSql(),
  );
}

function deterministicResidualScopeCondition() {
  return and(
    sourceScopeCondition(),
    or(
      sql`coalesce(array_length(${articles.tags}, 1), 0) = 0`,
      sql`NOT ${tagCompatibilityExistsSql()}`,
    ),
  );
}

async function fetchTagLaneBatch(
  checkpoint: BackfillCheckpoint,
  batchSize: number,
): Promise<Array<{ id: string; tags: string[] | null; sortAt: Date | null }>> {
  const cursor = cursorCondition(checkpoint.cursorSortAt, checkpoint.cursorId);
  return db
    .select({
      id: articles.id,
      tags: articles.tags,
      sortAt: articles.sortAt,
    })
    .from(articles)
    .where(cursor ? and(tagScopeCondition(), cursor) : tagScopeCondition())
    .orderBy(desc(articles.sortAt), desc(articles.id))
    .limit(batchSize);
}

async function fetchDeterministicLaneBatch(
  checkpoint: BackfillCheckpoint,
  batchSize: number,
): Promise<Array<{ id: string; sortAt: Date | null; status: string; attemptedAt: Date | null }>> {
  const cursor = cursorCondition(checkpoint.cursorSortAt, checkpoint.cursorId);
  return db
    .select({
      id: articles.id,
      sortAt: articles.sortAt,
      status: articles.entityEnrichStatus,
      attemptedAt: articles.entityEnrichAttemptedAt,
    })
    .from(articles)
    .where(cursor ? and(deterministicResidualScopeCondition(), cursor) : deterministicResidualScopeCondition())
    .orderBy(desc(articles.sortAt), desc(articles.id))
    .limit(batchSize);
}

async function getLaneLinkTotals(articleIds: string[]): Promise<Map<string, number>> {
  if (articleIds.length === 0) return new Map<string, number>();
  const rows = await pool.query<{ article_id: string; total: string }>(
    `
      SELECT article_id, SUM(cnt)::text AS total
      FROM (
        SELECT article_id, COUNT(*) AS cnt
        FROM article_competitions
        WHERE article_id = ANY($1::text[])
        GROUP BY article_id
        UNION ALL
        SELECT article_id, COUNT(*) AS cnt
        FROM article_teams
        WHERE article_id = ANY($1::text[])
        GROUP BY article_id
        UNION ALL
        SELECT article_id, COUNT(*) AS cnt
        FROM article_players
        WHERE article_id = ANY($1::text[])
        GROUP BY article_id
        UNION ALL
        SELECT article_id, COUNT(*) AS cnt
        FROM article_managers
        WHERE article_id = ANY($1::text[])
        GROUP BY article_id
      ) z
      GROUP BY article_id
    `,
    [articleIds],
  );
  const map = new Map<string, number>();
  for (const row of rows.rows) map.set(row.article_id, Number(row.total ?? "0"));
  return map;
}

async function getEntityTableTotals(articleIds: string[]): Promise<{
  competitions: number;
  teams: number;
  players: number;
  managers: number;
}> {
  if (articleIds.length === 0) {
    return { competitions: 0, teams: 0, players: 0, managers: 0 };
  }
  const [comps, teamsRows, playersRows, managersRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(articleCompetitions)
      .where(inArray(articleCompetitions.articleId, articleIds)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(articleTeams)
      .where(inArray(articleTeams.articleId, articleIds)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(articlePlayers)
      .where(inArray(articlePlayers.articleId, articleIds)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(articleManagers)
      .where(inArray(articleManagers.articleId, articleIds)),
  ]);
  return {
    competitions: Number(comps[0]?.count ?? 0),
    teams: Number(teamsRows[0]?.count ?? 0),
    players: Number(playersRows[0]?.count ?? 0),
    managers: Number(managersRows[0]?.count ?? 0),
  };
}

function buildNextCheckpoint(
  previous: BackfillCheckpoint,
  batch: LaneBatchStats,
  runId: string | null | undefined,
  status: BackfillCheckpoint["status"],
): BackfillCheckpoint {
  return {
    cursorSortAt: batch.cursorSortAt,
    cursorId: batch.cursorId,
    processed: previous.processed + batch.processedArticles,
    updated: previous.updated + batch.updatedArticles,
    errors: previous.errors + batch.errorArticles,
    lastRunAt: new Date().toISOString(),
    status,
    runId: runId ?? null,
  };
}

async function processTagBatch(
  checkpoint: BackfillCheckpoint,
  batchSize: number,
  dryRun: boolean,
): Promise<LaneBatchStats> {
  const rows = await fetchTagLaneBatch(checkpoint, batchSize);
  if (rows.length === 0) {
    return {
      scannedArticles: 0,
      processedArticles: 0,
      updatedArticles: 0,
      unchangedArticles: 0,
      errorArticles: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      aliasMatches: 0,
      staleRecovered: 0,
      cursorSortAt: checkpoint.cursorSortAt,
      cursorId: checkpoint.cursorId,
      done: true,
    };
  }

  const last = rows[rows.length - 1];
  const cursorSortAt = last.sortAt ? new Date(last.sortAt).toISOString() : checkpoint.cursorSortAt;
  const cursorId = last.id;

  if (dryRun) {
    return {
      scannedArticles: rows.length,
      processedArticles: rows.length,
      updatedArticles: 0,
      unchangedArticles: rows.length,
      errorArticles: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      aliasMatches: 0,
      staleRecovered: 0,
      cursorSortAt,
      cursorId,
      done: false,
    };
  }

  let processedArticles = 0;
  let updatedArticles = 0;
  let unchangedArticles = 0;
  let errorArticles = 0;
  let insertedCompetitions = 0;
  let insertedTeams = 0;
  let insertedPlayers = 0;
  let insertedManagers = 0;
  let aliasMatches = 0;

  for (const row of rows) {
    try {
      const stats = await syncArticleEntitiesFromTags(row.id, (row.tags ?? []) as string[]);
      const insertedTotal =
        stats.insertedCompetitions +
        stats.insertedTeams +
        stats.insertedPlayers +
        stats.insertedManagers;
      if (insertedTotal > 0) updatedArticles += 1;
      else unchangedArticles += 1;
      insertedCompetitions += stats.insertedCompetitions;
      insertedTeams += stats.insertedTeams;
      insertedPlayers += stats.insertedPlayers;
      insertedManagers += stats.insertedManagers;
      aliasMatches += stats.resolved;
    } catch (err) {
      errorArticles += 1;
      console.error("[entity-backfill:tags] article failed", row.id, err);
    } finally {
      processedArticles += 1;
    }
  }

  return {
    scannedArticles: rows.length,
    processedArticles,
    updatedArticles,
    unchangedArticles,
    errorArticles,
    insertedCompetitions,
    insertedTeams,
    insertedPlayers,
    insertedManagers,
    aliasMatches,
    staleRecovered: 0,
    cursorSortAt,
    cursorId,
    done: false,
  };
}

async function processDeterministicBatch(
  checkpoint: BackfillCheckpoint,
  batchSize: number,
  timeBudgetMs: number,
  dryRun: boolean,
): Promise<LaneBatchStats> {
  const rows = await fetchDeterministicLaneBatch(checkpoint, batchSize);
  if (rows.length === 0) {
    return {
      scannedArticles: 0,
      processedArticles: 0,
      updatedArticles: 0,
      unchangedArticles: 0,
      errorArticles: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      aliasMatches: 0,
      staleRecovered: 0,
      cursorSortAt: checkpoint.cursorSortAt,
      cursorId: checkpoint.cursorId,
      done: true,
    };
  }

  const articleIds = rows.map((row) => row.id);
  const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MINUTES * 60 * 1000);
  const staleRecovered = rows.filter(
    (row) =>
      row.status === "processing" &&
      !!row.attemptedAt &&
      new Date(row.attemptedAt).getTime() < staleCutoff.getTime(),
  ).length;

  const last = rows[rows.length - 1];
  const cursorSortAt = last.sortAt ? new Date(last.sortAt).toISOString() : checkpoint.cursorSortAt;
  const cursorId = last.id;

  if (dryRun) {
    return {
      scannedArticles: rows.length,
      processedArticles: rows.length,
      updatedArticles: 0,
      unchangedArticles: rows.length,
      errorArticles: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      aliasMatches: 0,
      staleRecovered,
      cursorSortAt,
      cursorId,
      done: false,
    };
  }

  const [beforeByArticle, beforeTotals] = await Promise.all([
    getLaneLinkTotals(articleIds),
    getEntityTableTotals(articleIds),
  ]);

  await db
    .update(articles)
    .set({
      entityEnrichStatus: "pending",
      entityEnrichAttemptedAt: null,
      entityEnrichError: null,
    })
    .where(inArray(articles.id, articleIds));

  const enriched = await enrichPendingArticles({
    limit: articleIds.length,
    timeBudgetMs,
    articleIds,
  });

  const [afterByArticle, afterTotals] = await Promise.all([
    getLaneLinkTotals(articleIds),
    getEntityTableTotals(articleIds),
  ]);

  let updatedArticles = 0;
  for (const articleId of articleIds) {
    const before = beforeByArticle.get(articleId) ?? 0;
    const after = afterByArticle.get(articleId) ?? 0;
    if (after > before) updatedArticles += 1;
  }

  const processedArticles = enriched.processed;
  const errorArticles = enriched.errors;
  const unchangedArticles = Math.max(0, processedArticles - errorArticles - updatedArticles);

  return {
    scannedArticles: rows.length,
    processedArticles,
    updatedArticles,
    unchangedArticles,
    errorArticles,
    insertedCompetitions: Math.max(0, afterTotals.competitions - beforeTotals.competitions),
    insertedTeams: Math.max(0, afterTotals.teams - beforeTotals.teams),
    insertedPlayers: Math.max(0, afterTotals.players - beforeTotals.players),
    insertedManagers: Math.max(0, afterTotals.managers - beforeTotals.managers),
    aliasMatches: 0,
    staleRecovered,
    cursorSortAt,
    cursorId,
    done: false,
  };
}

function laneOrder(mode: EntityBackfillMode): EntityBackfillLane[] {
  if (mode === "tags") return ["tags"];
  if (mode === "deterministic") return ["deterministic"];
  return ["tags", "deterministic"];
}

export async function runEntityBackfill(options: RunEntityBackfillOptions): Promise<RunEntityBackfillResult> {
  const startedAt = Date.now();
  const dryRun = options.dryRun === true;
  const order = laneOrder(options.mode);
  const globalCounters = {
    scanned_articles: 0,
    processed_articles: 0,
    updated_articles: 0,
    unchanged_articles: 0,
    error_articles: 0,
    inserted_competitions: 0,
    inserted_teams: 0,
    inserted_players: 0,
    inserted_managers: 0,
    alias_matches: 0,
    stale_recovered: 0,
  };

  const laneState: Record<EntityBackfillLane, {
    batchesRun: number;
    done: boolean;
    checkpoint: BackfillCheckpoint;
    scannedArticles: number;
    processedArticles: number;
    updatedArticles: number;
    unchangedArticles: number;
    errorArticles: number;
    insertedCompetitions: number;
    insertedTeams: number;
    insertedPlayers: number;
    insertedManagers: number;
    aliasMatches: number;
    staleRecovered: number;
  }> = {
    tags: {
      batchesRun: 0,
      done: false,
      checkpoint: await getCheckpoint("tags"),
      scannedArticles: 0,
      processedArticles: 0,
      updatedArticles: 0,
      unchangedArticles: 0,
      errorArticles: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      aliasMatches: 0,
      staleRecovered: 0,
    },
    deterministic: {
      batchesRun: 0,
      done: false,
      checkpoint: await getCheckpoint("deterministic"),
      scannedArticles: 0,
      processedArticles: 0,
      updatedArticles: 0,
      unchangedArticles: 0,
      errorArticles: 0,
      insertedCompetitions: 0,
      insertedTeams: 0,
      insertedPlayers: 0,
      insertedManagers: 0,
      aliasMatches: 0,
      staleRecovered: 0,
    },
  };

  let batchesRun = 0;
  let stoppedReason: "done" | "time_budget" | "max_batches" = "done";

  for (const lane of order) {
    const laneCheckpoint = laneState[lane].checkpoint;
    if (!dryRun) {
      const runningCheckpoint = {
        ...laneCheckpoint,
        status: "running" as const,
        runId: options.runId ?? null,
        lastRunAt: new Date().toISOString(),
      };
      await setCheckpoint(lane, runningCheckpoint);
      laneState[lane].checkpoint = runningCheckpoint;
    }

    while (true) {
      if (batchesRun >= options.maxBatches) {
        stoppedReason = "max_batches";
        break;
      }
      const elapsed = Date.now() - startedAt;
      if (elapsed >= options.timeBudgetMs) {
        stoppedReason = "time_budget";
        break;
      }

      const remainingTime = Math.max(1000, options.timeBudgetMs - elapsed);
      const batch =
        lane === "tags"
          ? await processTagBatch(laneState[lane].checkpoint, options.batchSize, dryRun)
          : await processDeterministicBatch(
            laneState[lane].checkpoint,
            options.batchSize,
            remainingTime,
            dryRun,
          );

      if (batch.scannedArticles === 0 && batch.done) {
        laneState[lane].done = true;
        if (!dryRun) {
          const doneCheckpoint: BackfillCheckpoint = {
            ...laneState[lane].checkpoint,
            status: "done",
            runId: options.runId ?? null,
            lastRunAt: new Date().toISOString(),
          };
          await setCheckpoint(lane, doneCheckpoint);
          laneState[lane].checkpoint = doneCheckpoint;
        }
        break;
      }

      batchesRun += 1;
      laneState[lane].batchesRun += 1;

      laneState[lane].scannedArticles += batch.scannedArticles;
      laneState[lane].processedArticles += batch.processedArticles;
      laneState[lane].updatedArticles += batch.updatedArticles;
      laneState[lane].unchangedArticles += batch.unchangedArticles;
      laneState[lane].errorArticles += batch.errorArticles;
      laneState[lane].insertedCompetitions += batch.insertedCompetitions;
      laneState[lane].insertedTeams += batch.insertedTeams;
      laneState[lane].insertedPlayers += batch.insertedPlayers;
      laneState[lane].insertedManagers += batch.insertedManagers;
      laneState[lane].aliasMatches += batch.aliasMatches;
      laneState[lane].staleRecovered += batch.staleRecovered;

      globalCounters.scanned_articles += batch.scannedArticles;
      globalCounters.processed_articles += batch.processedArticles;
      globalCounters.updated_articles += batch.updatedArticles;
      globalCounters.unchanged_articles += batch.unchangedArticles;
      globalCounters.error_articles += batch.errorArticles;
      globalCounters.inserted_competitions += batch.insertedCompetitions;
      globalCounters.inserted_teams += batch.insertedTeams;
      globalCounters.inserted_players += batch.insertedPlayers;
      globalCounters.inserted_managers += batch.insertedManagers;
      globalCounters.alias_matches += batch.aliasMatches;
      globalCounters.stale_recovered += batch.staleRecovered;

      const checkpointStatus: BackfillCheckpoint["status"] = batch.done ? "done" : "partial";
      const nextCheckpoint = buildNextCheckpoint(
        laneState[lane].checkpoint,
        batch,
        options.runId,
        checkpointStatus,
      );
      laneState[lane].checkpoint = nextCheckpoint;
      if (!dryRun) await setCheckpoint(lane, nextCheckpoint);

      if (batch.done) {
        laneState[lane].done = true;
        break;
      }
    }

    if (stoppedReason !== "done") break;
  }

  if (stoppedReason === "done") {
    const allDone = order.every((lane) => laneState[lane].done);
    if (!allDone) stoppedReason = batchesRun >= options.maxBatches ? "max_batches" : "time_budget";
  }

  if (!dryRun) {
    for (const lane of order) {
      if (stoppedReason !== "done" && laneState[lane].checkpoint.status === "running") {
        const cp: BackfillCheckpoint = {
          ...laneState[lane].checkpoint,
          status: "partial",
          lastRunAt: new Date().toISOString(),
          runId: options.runId ?? null,
        };
        await setCheckpoint(lane, cp);
        laneState[lane].checkpoint = cp;
      }
    }
  }

  const timeMs = Date.now() - startedAt;
  const lastLane = order[order.length - 1];
  const lastCheckpoint = laneState[lastLane].checkpoint;

  return {
    ok: true,
    mode: options.mode,
    dryRun,
    laneOrder: order,
    stoppedReason,
    batchesRun,
    timeMs,
    counters: {
      lane: options.mode,
      ...globalCounters,
      time_ms: timeMs,
      stopped_reason: stoppedReason,
      cursor_sort_at: lastCheckpoint.cursorSortAt,
      cursor_id: lastCheckpoint.cursorId,
    },
    lanes: laneState,
  };
}

