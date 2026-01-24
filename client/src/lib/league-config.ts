export interface LeagueConfig {
  slug: string;
  name: string;
  shortName: string;
  goalserveLeagueId: string;
}

export const leagueConfigs: LeagueConfig[] = [
  { slug: "premier-league", name: "Premier League", shortName: "PL", goalserveLeagueId: "1204" },
  { slug: "championship", name: "Championship", shortName: "CH", goalserveLeagueId: "1205" },
  { slug: "league-one", name: "League One", shortName: "L1", goalserveLeagueId: "1206" },
  { slug: "league-two", name: "League Two", shortName: "L2", goalserveLeagueId: "1207" },
  { slug: "la-liga", name: "La Liga", shortName: "LL", goalserveLeagueId: "1399" },
  { slug: "serie-a", name: "Serie A", shortName: "SA", goalserveLeagueId: "1229" },
  { slug: "bundesliga", name: "Bundesliga", shortName: "BL", goalserveLeagueId: "1269" },
  { slug: "ligue-1", name: "Ligue 1", shortName: "L1", goalserveLeagueId: "1221" },
];

export function getGoalserveLeagueId(slug: string): string | null {
  const config = leagueConfigs.find((c) => c.slug === slug);
  return config?.goalserveLeagueId ?? null;
}

export function getLeagueBySlug(slug: string): LeagueConfig | undefined {
  return leagueConfigs.find((c) => c.slug === slug);
}
