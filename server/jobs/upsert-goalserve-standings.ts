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

interface UpsertStandingsResult {
  ok: boolean;
  leagueId: string;
  season: string;
  asOf?: Date;
  insertedRowsCount: number;
  snapshotId?: string;
  skipped?: boolean;
  error?: string;
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

export async function upsertGoalserveStandings(
  leagueId: string,
  seasonParam?: string
): Promise<UpsertStandingsResult> {
  let url = `https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/standings/${leagueId}.xml?json=true`;
  if (seasonParam) {
    url += `&season=${encodeURIComponent(seasonParam)}`;
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
  const season = t?.season || seasonParam || "";
  const stageId = t?.stage_id || null;

  if (teamRows.length === 0) {
    return {
      ok: false,
      leagueId,
      season,
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

  const teamIdMap = new Map(existingTeams.map((t) => [t.goalserveTeamId, t.id]));

  // Auto-create missing teams (dev convenience)
  const missingTeamRows = teamRows.filter((row) => !teamIdMap.has(row.id));
  if (missingTeamRows.length > 0) {
    console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} AUTO-CREATING ${missingTeamRows.length} teams`);
    
    for (const row of missingTeamRows) {
      const [inserted] = await db
        .insert(teams)
        .values({
          name: row.name,
          slug: slugify(row.name),
          goalserveTeamId: row.id,
        })
        .onConflictDoNothing()
        .returning({ id: teams.id });
      
      if (inserted) {
        teamIdMap.set(row.id, inserted.id);
      } else {
        // If onConflictDoNothing triggered, fetch the existing team
        const [existing] = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.goalserveTeamId, row.id))
          .limit(1);
        if (existing) {
          teamIdMap.set(row.id, existing.id);
        }
      }
    }
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

  if (latestSnapshot?.payloadHash === payloadHash) {
    console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} NO CHANGE (hash match)`);
    return {
      ok: true,
      leagueId,
      season,
      asOf,
      insertedRowsCount: 0,
      snapshotId: latestSnapshot.id,
      skipped: true,
    };
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

    const rowsToInsert = teamRows.map((row) => {
      const goalsFor = toInt(row.overall?.gs);
      const goalsAgainst = toInt(row.overall?.ga);
      const goalDifference = toInt(row.total?.gd, goalsFor - goalsAgainst);
      
      // Handle recentForm variants
      const recentForm = typeof row.recent_form === "string" 
        ? row.recent_form 
        : (row.recent_form != null ? String(row.recent_form) : null);
      
      return {
        snapshotId,
        teamId: teamIdMap.get(row.id) || null,
        teamGoalserveId: row.id,
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
      };
    });

    await tx.insert(standingsRows).values(rowsToInsert);

    return { snapshotId, insertedRowsCount: rowsToInsert.length };
  });

  console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} rows=${result.insertedRowsCount}`);

  return {
    ok: true,
    leagueId,
    season,
    asOf,
    insertedRowsCount: result.insertedRowsCount,
    snapshotId: result.snapshotId,
  };
}
