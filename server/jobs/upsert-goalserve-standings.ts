import { db } from "../db";
import { teams, standingsSnapshots, standingsRows } from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import crypto from "crypto";

const GOALSERVE_FEED_KEY = process.env.GOALSERVE_FEED_KEY || "";

function parseGoalserveTimestamp(ts: unknown): Date {
  if (ts instanceof Date) {
    return ts;
  }
  let tsStr: string;
  if (Array.isArray(ts)) {
    tsStr = ts[0];
  } else if (typeof ts === "string") {
    tsStr = ts;
  } else if (ts === undefined || ts === null) {
    throw new Error(`Invalid standings.timestamp type: ${typeof ts}`);
  } else {
    throw new Error(`Invalid standings.timestamp type: ${typeof ts}`);
  }
  
  if (typeof tsStr !== "string") {
    throw new Error(`Invalid standings.timestamp value after unwrap: ${typeof tsStr}`);
  }
  
  const match = tsStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid standings.timestamp format: "${tsStr}"`);
  }
  const [, dd, mm, yyyy, hh, min, ss] = match;
  return new Date(Date.UTC(
    parseInt(yyyy, 10),
    parseInt(mm, 10) - 1,
    parseInt(dd, 10),
    parseInt(hh, 10),
    parseInt(min, 10),
    parseInt(ss, 10)
  ));
}

function computeHash(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function toInt(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? fallback : parsed;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUsableName(val: unknown): val is string {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  // Reject purely numeric strings like "9227"
  if (/^\d+$/.test(trimmed)) return false;
  return true;
}

function getTeamDisplayName(row: GoalserveTeamRow, goalserveTeamId: string): string {
  // Try common Goalserve name fields in priority order
  const rowAny = row as unknown as Record<string, unknown>;
  const teamObj = rowAny.team as Record<string, unknown> | undefined;
  
  const candidates = [
    teamObj?.name,
    teamObj?.team_name,
    rowAny.team_name,
    typeof rowAny.team === "string" ? rowAny.team : null,
    rowAny.name,
    rowAny.club_name,
    rowAny.club,
    rowAny.competition_team_name,
    rowAny.short_name,
  ];

  for (const c of candidates) {
    if (isUsableName(c)) {
      return c.trim();
    }
  }

  // Debug log for specific problematic IDs
  if (goalserveTeamId === "9227") {
    console.log(`[DEBUG] goalserveTeamId=9227 raw row keys:`, Object.keys(rowAny));
    console.log(`[DEBUG] goalserveTeamId=9227 candidate values:`, {
      "teamObj?.name": teamObj?.name,
      "rowAny.name": rowAny.name,
      "rowAny.team_name": rowAny.team_name,
      "rowAny.team": typeof rowAny.team,
    });
  }

  // Final fallback - always return something usable
  return `Team ${goalserveTeamId}`;
}

async function ensureTeamId(
  teamIdMap: Map<string, string>,
  goalserveTeamId: string,
  displayName: string
): Promise<string | null> {
  const gsId = String(goalserveTeamId).trim();

  // Already in map
  const existing = teamIdMap.get(gsId);
  if (existing) return existing;

  // First: try to SELECT existing team
  const [existingTeam] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.goalserveTeamId, gsId))
    .limit(1);

  if (existingTeam) {
    teamIdMap.set(gsId, existingTeam.id);
    return existingTeam.id;
  }

  // Determine safe name and slug
  const name = isUsableName(displayName) ? displayName : `Team ${gsId}`;
  let slug = slugify(name);
  if (!slug) slug = `team-${gsId}`;

  // Try to insert
  try {
    const [inserted] = await db
      .insert(teams)
      .values({
        name,
        slug,
        goalserveTeamId: gsId,
      })
      .onConflictDoNothing()
      .returning({ id: teams.id });

    if (inserted) {
      teamIdMap.set(gsId, inserted.id);
      return inserted.id;
    }
  } catch (insertErr) {
    console.warn(`[ensureTeamId] Insert failed for gsId=${gsId}:`, insertErr);
  }

  // After insert (or conflict), SELECT again
  const [found] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.goalserveTeamId, gsId))
    .limit(1);

  if (found) {
    teamIdMap.set(gsId, found.id);
    return found.id;
  }

  // Should be impossible, but don't crash - return null
  console.error(`[ensureTeamId] Could not create or find team for gsId=${gsId}, skipping row`);
  return null;
}

interface GoalserveStatBlock {
  gp?: string;
  w?: string;
  d?: string;
  l?: string;
  gs?: string;
  ga?: string;
}

interface GoalserveTotalBlock {
  p?: string;
  gd?: string;
}

interface GoalserveTeamRow {
  id: string;
  name: string;
  position?: string;
  overall?: GoalserveStatBlock;
  total?: GoalserveTotalBlock;
  home?: GoalserveStatBlock;
  away?: GoalserveStatBlock;
  recent_form?: string;
  status?: string;
  description?: string;
}

export interface UpsertStandingsResult {
  ok: boolean;
  leagueId: string;
  season: string;
  requestedSeason?: string;
  effectiveSeasonUsed?: string;
  asOf?: Date;
  insertedRowsCount: number;
  snapshotId?: string;
  skipped?: boolean;
  error?: string;
  reason?: string;
  teamCount?: number;
  missingTeams?: { goalserveTeamId: string; name: string }[];
  debug?: {
    timestampRaw: unknown;
    timestampType: string;
    payloadTopKeys: string[];
    standingsKeys: string[];
    tournamentType?: string;
    tournamentKeys?: string[];
    teamType?: string;
    teamCount?: number;
  };
}

export interface UpsertStandingsOptions {
  seasonParam?: string;
  force?: boolean;
}

export async function upsertGoalserveStandings(
  leagueId: string,
  options: UpsertStandingsOptions = {}
): Promise<UpsertStandingsResult> {
  const { seasonParam, force = false } = options;

  let seasonSlash: string | undefined;
  let seasonDash: string | undefined;
  if (seasonParam) {
    seasonSlash = seasonParam.includes("-")
      ? seasonParam.replace("-", "/")
      : seasonParam;
    seasonDash = seasonSlash.replace("/", "-");
  }

  let url: string;
  if (seasonParam) {
    url = `https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/standings/${leagueId}?json=true&season=${encodeURIComponent(seasonDash!)}`;
  } else {
    url = `https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/standings/${leagueId}.xml?json=true`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    return {
      ok: false,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
      error: `Goalserve API returned ${response.status}`,
    };
  }

  const payload = await response.json();
  
  // Resolve standings root safely
  const s = payload?.standings ?? payload;
  
  // Resolve tournament safely (may be object or array)
  const tRaw = s?.tournament;
  const t = Array.isArray(tRaw) ? tRaw[0] : tRaw;
  
  // Resolve teams safely (may be array or single object)
  const teamRaw = t?.team;
  const teamRows: GoalserveTeamRow[] = Array.isArray(teamRaw) ? teamRaw : (teamRaw ? [teamRaw] : []);

  // 🚨 SAFETY CHECK: Prevent saving incomplete standings tables
  const MIN_EXPECTED_TEAMS: Record<string, number> = {
    "1204": 20, // Premier League
    "1205": 24, // Championship
    "1206": 24, // League One
    "1207": 24, // League Two
  };

  const minTeams = MIN_EXPECTED_TEAMS[leagueId] || 10;

  if (teamRows.length < minTeams) {
    console.warn(
      `[StandingsIngest] ABORTED — leagueId=${leagueId} season=${seasonParam || ""} teams=${teamRows.length} (expected at least ${minTeams})`
    );

    return {
      ok: false,
      skipped: true,
      reason: "Too few teams returned from Goalserve feed — possible partial data",
      teamCount: teamRows.length,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
    };
  }
  
  // Build comprehensive debug info
  const debugInfo = {
    timestampRaw: s?.timestamp,
    timestampType: typeof s?.timestamp + (Array.isArray(s?.timestamp) ? " array" : ""),
    payloadTopKeys: Object.keys(payload || {}),
    standingsKeys: Object.keys(s || {}),
    tournamentType: typeof tRaw + (Array.isArray(tRaw) ? " array" : ""),
    tournamentKeys: Object.keys(t || {}),
    teamType: typeof teamRaw + (Array.isArray(teamRaw) ? " array" : ""),
    teamCount: teamRows.length,
  };

  if (!s) {
    return {
      ok: false,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
      error: "No standings object in response",
      debug: debugInfo,
    };
  }

  const timestampRaw = s.timestamp;
  let asOf: Date;
  try {
    asOf = parseGoalserveTimestamp(timestampRaw);
  } catch (parseErr) {
    return {
      ok: false,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
      error: parseErr instanceof Error ? parseErr.message : "Timestamp parse error",
      debug: debugInfo,
    };
  }

  if (!t) {
    return {
      ok: false,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
      error: "No tournament object in response",
      debug: debugInfo,
    };
  }

  // Extract metadata from resolved tournament
  const returnedSeason = t?.season || "";
  const requestedSeasonNorm = seasonSlash || "";
  const effectiveSeason = returnedSeason || requestedSeasonNorm || "";
  const season = seasonSlash || effectiveSeason;
  const stageId = t?.stage_id || null;

  // Season mismatch detection
  if (seasonSlash && returnedSeason && returnedSeason !== seasonSlash) {
    console.warn(
      `[StandingsIngest] SEASON MISMATCH — leagueId=${leagueId} requested=${seasonSlash} got=${returnedSeason}`
    );
    return {
      ok: false,
      leagueId,
      season: seasonSlash,
      requestedSeason: seasonSlash,
      effectiveSeasonUsed: returnedSeason,
      insertedRowsCount: 0,
      skipped: false,
      error: `Season mismatch: requested ${seasonSlash}, feed returned ${returnedSeason}`,
    };
  }

  if (teamRows.length === 0) {
    return {
      ok: false,
      leagueId,
      season,
      requestedSeason: seasonParam,
      effectiveSeasonUsed: effectiveSeason || undefined,
      insertedRowsCount: 0,
      error: "No team rows in standings",
      debug: debugInfo,
    };
  }

  const goalserveTeamIds = teamRows.map((t) => t.id);
  const existingTeams = await db
    .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId })
    .from(teams)
    .where(inArray(teams.goalserveTeamId, goalserveTeamIds));

  const teamIdMap = new Map<string, string>();
  for (const t of existingTeams) {
    if (t.goalserveTeamId) {
      teamIdMap.set(t.goalserveTeamId, t.id);
    }
  }

  // Ensure all teams exist in DB (auto-create missing)
  for (const row of teamRows) {
    const gsTeamId = String(row.id).trim();
    const displayName = getTeamDisplayName(row, gsTeamId);
    await ensureTeamId(teamIdMap, gsTeamId, displayName);
  }

  // Compute hash from normalized numeric values to detect actual data changes
  const normalizedForHash = teamRows.map((row) => ({
    id: row.id,
    position: toInt(row.position),
    points: toInt(row.total?.p),
    played: toInt(row.overall?.gp),
    won: toInt(row.overall?.w),
    drawn: toInt(row.overall?.d),
    lost: toInt(row.overall?.l),
    goalsFor: toInt(row.overall?.gs),
    goalsAgainst: toInt(row.overall?.ga),
    goalDifference: toInt(row.total?.gd),
    recentForm: row.recent_form ?? null,
  }));
  const payloadHash = computeHash(normalizedForHash);

  const [latestSnapshot] = await db
    .select({ id: standingsSnapshots.id, payloadHash: standingsSnapshots.payloadHash })
    .from(standingsSnapshots)
    .where(and(eq(standingsSnapshots.leagueId, leagueId), eq(standingsSnapshots.season, season)))
    .orderBy(desc(standingsSnapshots.asOf))
    .limit(1);

  if (latestSnapshot?.payloadHash === payloadHash && !force) {
    console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} NO CHANGE (hash match)`);
    return {
      ok: true,
      leagueId,
      season,
      requestedSeason: seasonParam,
      effectiveSeasonUsed: effectiveSeason || undefined,
      asOf,
      insertedRowsCount: 0,
      snapshotId: latestSnapshot.id,
      skipped: true,
    };
  }

  if (force) {
    console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} FORCE mode - bypassing hash check`);
  }

  const result = await db.transaction(async (tx) => {
    const [snapshot] = await tx
      .insert(standingsSnapshots)
      .values({
        leagueId,
        season,
        stageId,
        asOf,
        source: "goalserve",
        payloadHash,
      })
      .returning({ id: standingsSnapshots.id });

    const snapshotId = snapshot.id;

    const rowsToInsert: Array<{
      snapshotId: string;
      teamId: string | null;
      teamGoalserveId: string;
      teamName: string;
      position: number;
      points: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
      recentForm: string | null;
      movementStatus: string | null;
      qualificationNote: string | null;
      homePlayed: number;
      homeWon: number;
      homeDrawn: number;
      homeLost: number;
      homeGoalsFor: number;
      homeGoalsAgainst: number;
      awayPlayed: number;
      awayWon: number;
      awayDrawn: number;
      awayLost: number;
      awayGoalsFor: number;
      awayGoalsAgainst: number;
    }> = [];

    for (const row of teamRows) {
      const gsTeamId = String(row.id).trim();
      const teamId = teamIdMap.get(gsTeamId) || null;
      const displayName = getTeamDisplayName(row, gsTeamId);
      
      // NEVER skip a standings row - insert with teamId=null if no team mapping exists
      // The teamName field preserves the Goalserve name for display purposes
      if (!teamId) {
        console.log(`[StandingsIngest] No teamId for gsTeamId=${gsTeamId} (${displayName}) - inserting with null teamId`);
      }

      const goalsFor = toInt(row.overall?.gs);
      const goalsAgainst = toInt(row.overall?.ga);
      const goalDifference = toInt(row.total?.gd, goalsFor - goalsAgainst);
      
      const recentForm = typeof row.recent_form === "string" 
        ? row.recent_form 
        : (row.recent_form != null ? String(row.recent_form) : null);
      
      rowsToInsert.push({
        snapshotId,
        teamId,
        teamGoalserveId: gsTeamId,
        teamName: displayName,
        position: toInt(row.position),
        points: toInt(row.total?.p),
        played: toInt(row.overall?.gp),
        won: toInt(row.overall?.w),
        drawn: toInt(row.overall?.d),
        lost: toInt(row.overall?.l),
        goalsFor,
        goalsAgainst,
        goalDifference,
        recentForm,
        movementStatus: row.status || null,
        qualificationNote: row.description || null,
        homePlayed: toInt(row.home?.gp),
        homeWon: toInt(row.home?.w),
        homeDrawn: toInt(row.home?.d),
        homeLost: toInt(row.home?.l),
        homeGoalsFor: toInt(row.home?.gs),
        homeGoalsAgainst: toInt(row.home?.ga),
        awayPlayed: toInt(row.away?.gp),
        awayWon: toInt(row.away?.w),
        awayDrawn: toInt(row.away?.d),
        awayLost: toInt(row.away?.l),
        awayGoalsFor: toInt(row.away?.gs),
        awayGoalsAgainst: toInt(row.away?.ga),
      });
    }

    if (rowsToInsert.length > 0) {
      await tx.insert(standingsRows).values(rowsToInsert);
    }

    return { snapshotId, insertedRowsCount: rowsToInsert.length };
  });

  console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} rows=${result.insertedRowsCount}`);

  return {
    ok: true,
    leagueId,
    season,
    requestedSeason: seasonParam,
    effectiveSeasonUsed: effectiveSeason || undefined,
    asOf,
    insertedRowsCount: result.insertedRowsCount,
    snapshotId: result.snapshotId,
  };
}
