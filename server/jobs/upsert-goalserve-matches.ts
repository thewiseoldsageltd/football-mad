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
  
  const date = new Date(
    parseInt(year, 10),
    parseInt(month, 10) - 1,
    parseInt(day, 10),
    hours,
    minutes
  );
  
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

interface DbTeam {
  id: string;
  goalserveTeamId: string | null;
}

export async function upsertGoalserveMatches(feed: string): Promise<{
  ok: boolean;
  feed: string;
  totalFromGoalserve: number;
  inserted: number;
  updated: number;
  skippedNoMatchId: number;
  skippedNoKickoff: number;
  mappedTeams: number;
  unmappedTeams: number;
  error?: string;
}> {
  try {
    const response = await goalserveFetch(feed);

    if (!response?.scores?.category) {
      return {
        ok: false,
        feed,
        totalFromGoalserve: 0,
        inserted: 0,
        updated: 0,
        skippedNoMatchId: 0,
        skippedNoKickoff: 0,
        mappedTeams: 0,
        unmappedTeams: 0,
        error: "Missing scores.category in response",
      };
    }

    const dbTeams: DbTeam[] = await db
      .select({
        id: teams.id,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams);

    const teamByGoalserveId = new Map<string, string>();
    for (const team of dbTeams) {
      if (team.goalserveTeamId) {
        teamByGoalserveId.set(team.goalserveTeamId, team.id);
      }
    }

    const dbCompetitions = await db
      .select({
        goalserveCompetitionId: competitions.goalserveCompetitionId,
        name: competitions.name,
      })
      .from(competitions);

    const competitionsMap = new Map<string, string>();
    for (const comp of dbCompetitions) {
      if (comp.goalserveCompetitionId) {
        competitionsMap.set(comp.goalserveCompetitionId, comp.name);
      }
    }

    const categoryData = response.scores.category;
    const categories = Array.isArray(categoryData) ? categoryData : [categoryData];

    let totalFromGoalserve = 0;
    let inserted = 0;
    let updated = 0;
    let skippedNoMatchId = 0;
    let skippedNoKickoff = 0;
    let mappedTeams = 0;
    let unmappedTeams = 0;

    for (const category of categories) {
      if (!category?.matches?.match) continue;

      const categoryFormattedDate = category.matches["@formatted_date"] ?? category.matches.formatted_date ?? "";
      
      const competitionId = String(category?.["@id"] ?? category?.id ?? "");
      const competitionName = competitionsMap.get(competitionId) || String(category?.["@name"] ?? category?.name ?? "Unknown");

      const matchData = category.matches.match;
      const matchList = Array.isArray(matchData) ? matchData : [matchData];

      for (const match of matchList) {
        totalFromGoalserve++;

        const goalserveMatchId = String(match["@id"] ?? match.id ?? "");
        if (!goalserveMatchId) {
          skippedNoMatchId++;
          continue;
        }

        const goalserveStaticId = String(match["@static_id"] ?? match.static_id ?? "");
        
        const formattedDate = String(match["@formatted_date"] ?? match.formatted_date ?? categoryFormattedDate);
        const timeStr = String(match["@time"] ?? match.time ?? match["@status"] ?? "");
        
        const kickoffTime = parseKickoffTime(formattedDate, timeStr);
        if (!kickoffTime) {
          skippedNoKickoff++;
          continue;
        }

        const localTeam = match.localteam || match.home || {};
        const visitorTeam = match.visitorteam || match.away || {};

        const homeGsId = String(localTeam["@id"] ?? localTeam.id ?? "");
        const awayGsId = String(visitorTeam["@id"] ?? visitorTeam.id ?? "");
        const homeScore = localTeam["@score"] ?? localTeam.score;
        const awayScore = visitorTeam["@score"] ?? visitorTeam.score;

        const homeTeamId = teamByGoalserveId.get(homeGsId) || null;
        const awayTeamId = teamByGoalserveId.get(awayGsId) || null;

        if (homeTeamId && awayTeamId) {
          mappedTeams++;
        } else {
          unmappedTeams++;
        }

        const rawStatus = String(match["@status"] ?? match.status ?? timeStr);
        const status = normalizeStatus(rawStatus);

        const venue = String(match["@venue"] ?? match.venue ?? "");
        const slug = `gs-${goalserveMatchId}`;

        const compactRaw = {
          id: goalserveMatchId,
          staticId: goalserveStaticId,
          date: formattedDate,
          time: timeStr,
          status: rawStatus,
          home: { id: homeGsId, name: localTeam["@name"] ?? localTeam.name, score: homeScore },
          away: { id: awayGsId, name: visitorTeam["@name"] ?? visitorTeam.name, score: awayScore },
        };

        const existing = await db
          .select()
          .from(matches)
          .where(eq(matches.goalserveMatchId, goalserveMatchId))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(matches)
            .set({
              goalserveStaticId: goalserveStaticId || null,
              goalserveCompetitionId: competitionId || null,
              homeGoalserveTeamId: homeGsId || null,
              awayGoalserveTeamId: awayGsId || null,
              homeTeamId,
              awayTeamId,
              homeScore: homeScore != null && homeScore !== "" ? parseInt(String(homeScore), 10) : null,
              awayScore: awayScore != null && awayScore !== "" ? parseInt(String(awayScore), 10) : null,
              competition: competitionName,
              status,
              kickoffTime,
              venue: venue || null,
              timeline: compactRaw,
            })
            .where(eq(matches.goalserveMatchId, goalserveMatchId));
          updated++;
        } else {
          await db.insert(matches).values({
            slug,
            goalserveMatchId,
            goalserveStaticId: goalserveStaticId || null,
            goalserveCompetitionId: competitionId || null,
            homeGoalserveTeamId: homeGsId || null,
            awayGoalserveTeamId: awayGsId || null,
            homeTeamId,
            awayTeamId,
            homeScore: homeScore != null && homeScore !== "" ? parseInt(String(homeScore), 10) : null,
            awayScore: awayScore != null && awayScore !== "" ? parseInt(String(awayScore), 10) : null,
            competition: competitionName,
            status,
            kickoffTime,
            venue: venue || null,
            timeline: compactRaw,
          });
          inserted++;
        }
      }
    }

    return {
      ok: true,
      feed,
      totalFromGoalserve,
      inserted,
      updated,
      skippedNoMatchId,
      skippedNoKickoff,
      mappedTeams,
      unmappedTeams,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      feed,
      totalFromGoalserve: 0,
      inserted: 0,
      updated: 0,
      skippedNoMatchId: 0,
      skippedNoKickoff: 0,
      mappedTeams: 0,
      unmappedTeams: 0,
      error,
    };
  }
}
