/** Minimum team counts before we treat a league roster feed as valid for membership rollover. */
export const MIN_TEAMS_BY_LEAGUE: Record<string, number> = {
  "1204": 20, // Premier League
  "1205": 24, // Championship
  "1206": 24, // League One
  "1207": 24, // League Two
  "1221": 24, // National League
  "1007": 12, // Scottish Premiership
  "1008": 10, // Scottish Championship
  "1229": 20, // La Liga
  "1269": 20, // Serie A
  "1225": 18, // Bundesliga
  "1232": 18, // Ligue 1
};

export const DEFAULT_MIN_TEAMS = 8;

export function minTeamsForLeague(leagueId: string): number {
  return MIN_TEAMS_BY_LEAGUE[leagueId] ?? DEFAULT_MIN_TEAMS;
}

export function shouldApplyMembershipRollover(teamCount: number, leagueId: string): boolean {
  return teamCount >= minTeamsForLeague(leagueId);
}

/**
 * Explicit seasonKey query/param means a historical or manual season run.
 * Only bare/current-feed runs (no seasonKeyParam) may promote current season.
 */
export function isExplicitHistoricalSeasonRun(seasonKeyParam?: string | null): boolean {
  return Boolean(seasonKeyParam?.trim());
}

/** Bare/current fixture sync may promote current only after the feed parses successfully. */
export function shouldPromoteCompetitionCurrentFromFixtureSync(opts: {
  seasonKeyParam?: string | null;
  feedParsedOk: boolean;
}): boolean {
  return !isExplicitHistoricalSeasonRun(opts.seasonKeyParam) && opts.feedParsedOk;
}

/**
 * Historical team sync may upsert memberships for the requested season with
 * is_current=false and must not flip competition current or demote other seasons.
 */
export function membershipIsCurrentForTeamSync(seasonKeyParam?: string | null): boolean {
  return !isExplicitHistoricalSeasonRun(seasonKeyParam);
}

export function shouldApplyExclusiveMembershipRollover(opts: {
  seasonKeyParam?: string | null;
  teamCount: number;
  leagueId: string;
}): boolean {
  return (
    !isExplicitHistoricalSeasonRun(opts.seasonKeyParam) &&
    shouldApplyMembershipRollover(opts.teamCount, opts.leagueId)
  );
}
