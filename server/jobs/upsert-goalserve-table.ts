import { goalserveFetch } from "../integrations/goalserve/client";
import { db } from "../db";
import { standings, teams } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

interface StandingsResult {
  ok: boolean;
  leagueId: string;
  season?: string;
  rowsFromGoalserve?: number;
  inserted?: number;
  updated?: number;
  mappedTeams?: number;
  unmappedTeams?: number;
  error?: string;
}

export async function upsertGoalserveTable(leagueId: string): Promise<StandingsResult> {
  const feedPath = `standings/${leagueId}.xml`;

  try {
    const data = await goalserveFetch(feedPath);
    const tournament = data?.standings?.tournament;

    if (!tournament) {
      return {
        ok: false,
        leagueId,
        error: "No tournament node found in standings response",
      };
    }

    const season = String(tournament?.["@season"] || "");
    const teamRows = toArray(tournament?.team);

    if (teamRows.length === 0) {
      return {
        ok: false,
        leagueId,
        season,
        error: "No team rows found in standings.tournament.team",
      };
    }

    // Fetch all teams with goalserveTeamId for mapping
    const allTeams = await db.select({
      id: teams.id,
      goalserveTeamId: teams.goalserveTeamId,
    }).from(teams).where(sql`${teams.goalserveTeamId} IS NOT NULL`);

    const teamIdMap = new Map<string, string>();
    for (const t of allTeams) {
      if (t.goalserveTeamId) {
        teamIdMap.set(t.goalserveTeamId, t.id);
      }
    }

    let inserted = 0;
    let updated = 0;
    let mappedTeams = 0;
    let unmappedTeams = 0;

    for (const row of teamRows) {
      const teamGoalserveId = String(row?.["@id"] || "");
      const teamName = String(row?.["@name"] || "");
      const overall = row?.overall || {};
      const total = row?.total || {};

      const position = parseInt(row?.["@position"] || "0", 10);
      const played = parseInt(overall?.["@gp"] || "0", 10);
      const wins = parseInt(overall?.["@w"] || "0", 10);
      const draws = parseInt(overall?.["@d"] || "0", 10);
      const losses = parseInt(overall?.["@l"] || "0", 10);
      const goalsFor = parseInt(overall?.["@gs"] || "0", 10);
      const goalsAgainst = parseInt(overall?.["@ga"] || "0", 10);
      const goalDiff = parseInt(total?.["@gd"] || "0", 10);
      const points = parseInt(total?.["@p"] || "0", 10);

      // Try to map teamId
      const teamId = teamIdMap.get(teamGoalserveId) || null;
      if (teamId) {
        mappedTeams++;
      } else {
        unmappedTeams++;
      }

      // Check if row exists
      const existing = await db.select({ id: standings.id })
        .from(standings)
        .where(and(
          eq(standings.leagueId, leagueId),
          eq(standings.season, season),
          eq(standings.teamGoalserveId, teamGoalserveId)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update
        await db.update(standings)
          .set({
            teamId,
            teamName,
            position,
            played,
            wins,
            draws,
            losses,
            goalsFor,
            goalsAgainst,
            goalDiff,
            points,
            updatedAt: new Date(),
            raw: row,
          })
          .where(eq(standings.id, existing[0].id));
        updated++;
      } else {
        // Insert
        await db.insert(standings).values({
          leagueId,
          season,
          teamGoalserveId,
          teamId,
          teamName,
          position,
          played,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDiff,
          points,
          raw: row,
        });
        inserted++;
      }
    }

    return {
      ok: true,
      leagueId,
      season,
      rowsFromGoalserve: teamRows.length,
      inserted,
      updated,
      mappedTeams,
      unmappedTeams,
    };

  } catch (err: any) {
    return {
      ok: false,
      leagueId,
      error: err.message?.slice(0, 500) || "Unknown error",
    };
  }
}
