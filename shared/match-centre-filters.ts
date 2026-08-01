import { isClubFriendlyCompetition } from "./competition-display";

/** Whether a stored match may appear in Match Centre recent form. */
export function isEligibleFormMatch(input: {
  matchId: string;
  currentMatchId: string;
  status: string;
  kickoffTime: Date | string | null;
  currentKickoff: Date | string;
  homeScore: number | null;
  awayScore: number | null;
  goalserveCompetitionId?: string | null;
  competitionName?: string | null;
  includeFriendlies: boolean;
}): boolean {
  if (input.matchId === input.currentMatchId) return false;
  if (String(input.status).toLowerCase() !== "finished") return false;
  if (input.homeScore == null || input.awayScore == null) return false;
  if (!input.kickoffTime) return false;
  if (new Date(input.kickoffTime) >= new Date(input.currentKickoff)) return false;
  if (
    !input.includeFriendlies &&
    isClubFriendlyCompetition({
      goalserveCompetitionId: input.goalserveCompetitionId,
      competitionName: input.competitionName,
    })
  ) {
    return false;
  }
  return true;
}

/** Whether a finished meeting belongs in PRE_EVENT H2H (excludes current scheduled). */
export function isEligiblePreEventH2HMatch(input: {
  matchId: string;
  currentMatchId: string;
  status: string;
  kickoffTime: Date | string | null;
  currentKickoff: Date | string;
  homeScore: number | null;
  awayScore: number | null;
}): boolean {
  if (input.matchId === input.currentMatchId) return false;
  if (String(input.status).toLowerCase() !== "finished") return false;
  if (input.homeScore == null || input.awayScore == null) return false;
  if (!input.kickoffTime) return false;
  return new Date(input.kickoffTime) < new Date(input.currentKickoff);
}

/** Whether a finished meeting belongs in COMPLETED H2H (may include current). */
export function isEligibleCompletedH2HMatch(input: {
  matchId: string;
  currentMatchId: string;
  status: string;
  kickoffTime: Date | string | null;
  currentKickoff: Date | string;
  homeScore: number | null;
  awayScore: number | null;
}): boolean {
  if (String(input.status).toLowerCase() !== "finished") return false;
  if (input.homeScore == null || input.awayScore == null) return false;
  if (input.matchId === input.currentMatchId) return true;
  if (!input.kickoffTime) return false;
  return new Date(input.kickoffTime) <= new Date(input.currentKickoff);
}

/** Next fixtures must exclude the current match and exceptional statuses. */
export function isEligibleNextFixture(input: {
  matchId: string;
  currentMatchId: string;
  status: string;
  kickoffTime: Date | string | null;
  currentKickoff: Date | string;
}): boolean {
  if (input.matchId === input.currentMatchId) return false;
  if (!input.kickoffTime) return false;
  if (new Date(input.kickoffTime) <= new Date(input.currentKickoff)) return false;
  const st = String(input.status).toLowerCase();
  if (["postponed", "cancelled", "canceled", "abandoned"].includes(st)) return false;
  return st === "scheduled" || st === "live";
}

/** Result from the requested team's perspective. */
export function formResultForTeam(
  homeScore: number,
  awayScore: number,
  side: "home" | "away",
): "W" | "D" | "L" {
  if (homeScore === awayScore) return "D";
  const homeWon = homeScore > awayScore;
  if (side === "home") return homeWon ? "W" : "L";
  return homeWon ? "L" : "W";
}

/**
 * Summarise H2H from the current fixture home/away club perspective,
 * even when those clubs swapped venues in prior meetings.
 */
export function summariseH2HForCurrentFixture(input: {
  centreHomeTeamId: string | null;
  centreHomeGoalserveId: string | null;
  meetings: Array<{
    homeTeamId: string | null;
    homeGoalserveTeamId?: string | null;
    homeScore: number;
    awayScore: number;
  }>;
}): { homeTeamWins: number; draws: number; awayTeamWins: number } {
  let homeTeamWins = 0;
  let draws = 0;
  let awayTeamWins = 0;
  for (const m of input.meetings) {
    const rowHomeIsCentreHome =
      (input.centreHomeTeamId && m.homeTeamId === input.centreHomeTeamId) ||
      (!input.centreHomeTeamId &&
        !!input.centreHomeGoalserveId &&
        m.homeGoalserveTeamId === input.centreHomeGoalserveId);
    const centreHomeScore = rowHomeIsCentreHome ? m.homeScore : m.awayScore;
    const centreAwayScore = rowHomeIsCentreHome ? m.awayScore : m.homeScore;
    if (centreHomeScore > centreAwayScore) homeTeamWins++;
    else if (centreHomeScore < centreAwayScore) awayTeamWins++;
    else draws++;
  }
  return { homeTeamWins, draws, awayTeamWins };
}
