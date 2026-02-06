// Goalserve fixtures/results ingestion job.
// Goalserve match "id" (@id) can change between feeds, but "static_id" (@static_id)
// is the canonical, permanent identifier for a match. We upsert by static_id to
// avoid duplicates and ensure stable references across feed refreshes.

import { db } from "../db";
import { matches, teams, competitions } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";

function parseKickoffTime(formattedDate: string, timeStr: string): Date | null {
  if (!formattedDate) return null;

  const dateParts = formattedDate.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!dateParts) return null;

  const [, day, month, year] = dateParts;

  let hours = 12;
  let minutes = 0;

  const timeParts = timeStr?.match(/^(\d{1,2}):(\d{2})$/);
  if (timeParts) {
    hours = parseInt(timeParts[1], 10);
    minutes = parseInt(timeParts[2], 10);
  }

  const utcMs = Date.UTC(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    hours,
    minutes,
    0,
    0
  );
  const date = new Date(utcMs);

  if (isNaN(date.getTime())) return null;
  return date;
}

function normalizeStatus(rawStatus: string): string {
  const s = rawStatus?.toLowerCase() || "";

  if (s === "ft" || s === "aet" || s === "pen." || s.includes("finished")) {
    return "finished";
  }
  if (s === "ht" || s === "1st half" || s === "2nd half" || s.match(/^\d+$/)) {
    return "live";
  }
  if (s === "postp." || s === "postponed" || s === "canc." || s === "cancelled") {
    return "postponed";
  }
  if (s === "ns" || s === "" || s.match(/^\d{1,2}:\d{2}$/)) {
    return "scheduled";
  }
  return "scheduled";
}

function extractRound(match: any, week: any): string | null {
  const candidates = [
    match?.["@round"],
    match?.["@matchday"],
    match?.["@week"],
    match?.["@round_id"],
    match?.round,
    match?.matchday,
    match?.week,
    week?.["@number"],
    week?.number,
  ];

  for (const val of candidates) {
    if (val != null && val !== "") {
      const str = String(val).trim();
      if (str.length > 0) return str;
    }
  }
  return null;
}

function extractScore(match: any, teamObj: any, side: "home" | "away"): number | null {
  const tryParse = (val: any): number | null => {
    if (val == null || val === "") return null;
    const n = parseInt(String(val), 10);
    return isNaN(n) ? null : n;
  };

  const teamFields = [
    teamObj?.["@score"],
    teamObj?.score,
    teamObj?.["@goals"],
    teamObj?.goals,
  ];
  for (const val of teamFields) {
    const parsed = tryParse(val);
    if (parsed !== null) return parsed;
  }

  const matchFields = [
    match?.[`@${side}score`],
    match?.[`${side}score`],
    match?.[`@${side}_score`],
    match?.[`${side}_score`],
    match?.[`@${side}TeamScore`],
    match?.[`${side}TeamScore`],
  ];
  for (const val of matchFields) {
    const parsed = tryParse(val);
    if (parsed !== null) return parsed;
  }

  const resultFields = [
    match?.result,
    match?.["@result"],
    match?.score,
    match?.["@score"],
  ];
  for (const val of resultFields) {
    if (typeof val === "string" && val.includes("-")) {
      const parts = val.split("-").map(p => p.trim());
      if (parts.length === 2) {
        const idx = side === "home" ? 0 : 1;
        const parsed = tryParse(parts[idx]);
        if (parsed !== null) return parsed;
      }
    }
  }

  return null;
}

interface SyncResult {
  ok: boolean;
  leagueId: string;
  totalFromGoalserve: number;
  inserted: number;
  updated: number;
  skippedNoStaticId: number;
  skippedNoKickoff: number;
  competitionId: string | null;
  seasonKey: string | null;
  error?: string;
}

export async function syncGoalserveMatches(leagueId: string): Promise<SyncResult> {
  const emptyResult = (error?: string): SyncResult => ({
    ok: !error,
    leagueId,
    totalFromGoalserve: 0,
    inserted: 0,
    updated: 0,
    skippedNoStaticId: 0,
    skippedNoKickoff: 0,
    competitionId: null,
    seasonKey: null,
    error,
  });

  try {
    const [competitionRow] = await db
      .select({ id: competitions.id, season: competitions.season })
      .from(competitions)
      .where(eq(competitions.goalserveCompetitionId, leagueId))
      .limit(1);

    const competitionDbId = competitionRow?.id ?? null;
    const seasonKey = competitionRow?.season && String(competitionRow.season).trim()
      ? String(competitionRow.season).trim()
      : null;

    const response = await goalserveFetch(`soccerfixtures/leagueid/${leagueId}`);

    const leagueData = response?.leagues?.league;
    if (!leagueData) {
      return emptyResult("No league data in response.leagues.league");
    }

    const weekData = leagueData?.week;
    if (!weekData) {
      return emptyResult("No week data in response.leagues.league.week");
    }

    const weeks = Array.isArray(weekData) ? weekData : [weekData];

    const dbTeams = await db
      .select({ id: teams.id, goalserveTeamId: teams.goalserveTeamId })
      .from(teams);

    const teamByGoalserveId = new Map<string, string>();
    for (const team of dbTeams) {
      if (team.goalserveTeamId) {
        teamByGoalserveId.set(team.goalserveTeamId, team.id);
      }
    }

    interface MatchRow {
      slug: string;
      goalserveMatchId: string;
      goalserveStaticId: string;
      goalserveCompetitionId: string;
      competitionId: string | null;
      seasonKey: string | null;
      goalserveRound: string | null;
      homeGoalserveTeamId: string | null;
      awayGoalserveTeamId: string | null;
      homeTeamId: string | null;
      awayTeamId: string | null;
      homeScore: number | null;
      awayScore: number | null;
      competition: string;
      venue: string | null;
      status: string;
      kickoffTime: Date;
    }

    let totalFromGoalserve = 0;
    let skippedNoStaticId = 0;
    let skippedNoKickoff = 0;
    let inserted = 0;
    let updated = 0;

    const competitionName = String(leagueData?.["@name"] ?? leagueData?.name ?? "Unknown");
    const allRows: MatchRow[] = [];

    for (const week of weeks) {
      const matchData = week?.matches?.match ?? week?.match;
      if (!matchData) continue;

      const matchList = Array.isArray(matchData) ? matchData : [matchData];

      const weekFormattedDate = String(
        week?.matches?.["@formatted_date"] ?? week?.matches?.formatted_date ??
        week?.["@formatted_date"] ?? week?.formatted_date ?? ""
      );

      for (const match of matchList) {
        totalFromGoalserve++;

        const goalserveStaticId = String(match["@static_id"] ?? match.static_id ?? "").trim();
        if (!goalserveStaticId) {
          skippedNoStaticId++;
          continue;
        }

        const goalserveMatchId = String(match["@id"] ?? match.id ?? "").trim();

        const formattedDate = String(match["@formatted_date"] ?? match.formatted_date ?? weekFormattedDate);
        const timeStr = String(match["@time"] ?? match.time ?? match["@status"] ?? "");

        const kickoffTime = parseKickoffTime(formattedDate, timeStr);
        if (!kickoffTime) {
          skippedNoKickoff++;
          continue;
        }

        const localTeam = match.localteam || match.home || {};
        const visitorTeam = match.visitorteam || match.away || {};

        const homeGsId = String(localTeam["@id"] ?? localTeam.id ?? "").trim();
        const awayGsId = String(visitorTeam["@id"] ?? visitorTeam.id ?? "").trim();
        const homeScore = extractScore(match, localTeam, "home");
        const awayScore = extractScore(match, visitorTeam, "away");

        const homeTeamId = teamByGoalserveId.get(homeGsId) || null;
        const awayTeamId = teamByGoalserveId.get(awayGsId) || null;

        const rawStatus = String(match["@status"] ?? match.status ?? timeStr);
        const status = normalizeStatus(rawStatus);

        const venue = String(match["@venue"] ?? match.venue ?? "").trim() || null;
        const goalserveRound = extractRound(match, week);

        const slug = goalserveStaticId
          ? `gs-static-${goalserveStaticId}`
          : `gs-${goalserveMatchId}`;

        allRows.push({
          slug,
          goalserveMatchId: goalserveMatchId || goalserveStaticId,
          goalserveStaticId,
          goalserveCompetitionId: leagueId,
          competitionId: competitionDbId,
          seasonKey,
          goalserveRound,
          homeGoalserveTeamId: homeGsId || null,
          awayGoalserveTeamId: awayGsId || null,
          homeTeamId,
          awayTeamId,
          homeScore,
          awayScore,
          competition: competitionName,
          venue,
          status,
          kickoffTime,
        });
      }
    }

    for (const row of allRows) {
      let [existing] = await db
        .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
        .from(matches)
        .where(eq(matches.goalserveStaticId, row.goalserveStaticId))
        .limit(1);

      if (!existing && row.goalserveMatchId) {
        [existing] = await db
          .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
          .from(matches)
          .where(eq(matches.goalserveMatchId, row.goalserveMatchId))
          .limit(1);
      }

      if (existing) {
        await db
          .update(matches)
          .set({
            goalserveStaticId: row.goalserveStaticId,
            goalserveMatchId: row.goalserveMatchId,
            goalserveCompetitionId: row.goalserveCompetitionId,
            competitionId: row.competitionId,
            seasonKey: row.seasonKey,
            goalserveRound: row.goalserveRound,
            homeGoalserveTeamId: row.homeGoalserveTeamId,
            awayGoalserveTeamId: row.awayGoalserveTeamId,
            homeTeamId: row.homeTeamId,
            awayTeamId: row.awayTeamId,
            homeScore: row.homeScore !== null ? row.homeScore : existing.homeScore,
            awayScore: row.awayScore !== null ? row.awayScore : existing.awayScore,
            competition: row.competition,
            venue: row.venue,
            status: row.status,
            kickoffTime: row.kickoffTime,
          })
          .where(eq(matches.id, existing.id));
        updated++;
      } else {
        try {
          await db.insert(matches).values(row);
          inserted++;
        } catch (e: any) {
          if (e?.code === "23505") {
            const [bySlug] = await db
              .select({ id: matches.id, homeScore: matches.homeScore, awayScore: matches.awayScore })
              .from(matches)
              .where(eq(matches.slug, row.slug))
              .limit(1);
            if (bySlug) {
              await db
                .update(matches)
                .set({
                  goalserveStaticId: row.goalserveStaticId,
                  goalserveMatchId: row.goalserveMatchId,
                  goalserveCompetitionId: row.goalserveCompetitionId,
                  competitionId: row.competitionId,
                  seasonKey: row.seasonKey,
                  goalserveRound: row.goalserveRound,
                  homeGoalserveTeamId: row.homeGoalserveTeamId,
                  awayGoalserveTeamId: row.awayGoalserveTeamId,
                  homeTeamId: row.homeTeamId,
                  awayTeamId: row.awayTeamId,
                  homeScore: row.homeScore !== null ? row.homeScore : bySlug.homeScore,
                  awayScore: row.awayScore !== null ? row.awayScore : bySlug.awayScore,
                  competition: row.competition,
                  venue: row.venue,
                  status: row.status,
                  kickoffTime: row.kickoffTime,
                })
                .where(eq(matches.id, bySlug.id));
              updated++;
            }
          } else {
            throw e;
          }
        }
      }
    }

    return {
      ok: true,
      leagueId,
      totalFromGoalserve,
      inserted,
      updated,
      skippedNoStaticId,
      skippedNoKickoff,
      competitionId: competitionDbId,
      seasonKey,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return emptyResult(error);
  }
}
