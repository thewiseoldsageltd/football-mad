import { db } from "../db";
import { teams, standingsSnapshots, standingsRows } from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import crypto from "crypto";

const GOALSERVE_FEED_KEY = process.env.GOALSERVE_FEED_KEY || "";

function parseGoalserveTimestamp(ts: string): Date {
  const match = ts.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return new Date();
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

interface GoalserveTeamRow {
  id: string;
  name: string;
  position: string;
  overall_gp: string;
  overall_w: string;
  overall_d: string;
  overall_l: string;
  overall_gs: string;
  overall_ga: string;
  gd: string;
  p: string;
  recent_form?: string;
  status?: string;
  description?: string;
  home_gp?: string;
  home_w?: string;
  home_d?: string;
  home_l?: string;
  home_gs?: string;
  home_ga?: string;
  away_gp?: string;
  away_w?: string;
  away_d?: string;
  away_l?: string;
  away_gs?: string;
  away_ga?: string;
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

  const data = await response.json();
  const standings = data?.standings;
  if (!standings) {
    return {
      ok: false,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
      error: "No standings object in response",
    };
  }

  const timestamp = standings.timestamp || "";
  const asOf = parseGoalserveTimestamp(timestamp);

  const tournament = standings.tournament;
  if (!tournament) {
    return {
      ok: false,
      leagueId,
      season: seasonParam || "",
      insertedRowsCount: 0,
      error: "No tournament object in response",
    };
  }

  const season = tournament.season || seasonParam || "";
  const stageId = tournament.stage_id || null;

  let teamRows: GoalserveTeamRow[] = [];
  if (Array.isArray(tournament.team)) {
    teamRows = tournament.team;
  } else if (tournament.team) {
    teamRows = [tournament.team];
  }

  if (teamRows.length === 0) {
    return {
      ok: false,
      leagueId,
      season,
      insertedRowsCount: 0,
      error: "No team rows in standings",
    };
  }

  const goalserveTeamIds = teamRows.map((t) => t.id);
  const existingTeams = await db
    .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId })
    .from(teams)
    .where(inArray(teams.goalserveTeamId, goalserveTeamIds));

  const teamIdMap = new Map(existingTeams.map((t) => [t.goalserveTeamId, t.id]));

  const missingTeams: { goalserveTeamId: string; name: string }[] = [];
  for (const row of teamRows) {
    if (!teamIdMap.has(row.id)) {
      missingTeams.push({ goalserveTeamId: row.id, name: row.name });
    }
  }

  if (missingTeams.length > 0) {
    console.log(`[StandingsIngest] leagueId=${leagueId} season=${season} MISSING ${missingTeams.length} teams`);
    return {
      ok: false,
      leagueId,
      season,
      insertedRowsCount: 0,
      error: "Missing teams - cannot ingest standings until all teams exist",
      missingTeams,
    };
  }

  const payloadHash = computeHash(tournament.team);

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

    const rowsToInsert = teamRows.map((row) => ({
      snapshotId,
      teamId: teamIdMap.get(row.id) || null,
      teamGoalserveId: row.id,
      position: parseInt(row.position, 10) || 0,
      points: parseInt(row.p, 10) || 0,
      played: parseInt(row.overall_gp, 10) || 0,
      won: parseInt(row.overall_w, 10) || 0,
      drawn: parseInt(row.overall_d, 10) || 0,
      lost: parseInt(row.overall_l, 10) || 0,
      goalsFor: parseInt(row.overall_gs, 10) || 0,
      goalsAgainst: parseInt(row.overall_ga, 10) || 0,
      goalDifference: parseInt(row.gd, 10) || 0,
      recentForm: row.recent_form || null,
      movementStatus: row.status || null,
      qualificationNote: row.description || null,
      homePlayed: parseInt(row.home_gp || "0", 10),
      homeWon: parseInt(row.home_w || "0", 10),
      homeDrawn: parseInt(row.home_d || "0", 10),
      homeLost: parseInt(row.home_l || "0", 10),
      homeGoalsFor: parseInt(row.home_gs || "0", 10),
      homeGoalsAgainst: parseInt(row.home_ga || "0", 10),
      awayPlayed: parseInt(row.away_gp || "0", 10),
      awayWon: parseInt(row.away_w || "0", 10),
      awayDrawn: parseInt(row.away_d || "0", 10),
      awayLost: parseInt(row.away_l || "0", 10),
      awayGoalsFor: parseInt(row.away_gs || "0", 10),
      awayGoalsAgainst: parseInt(row.away_ga || "0", 10),
    }));

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
