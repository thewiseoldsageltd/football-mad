export type ZoneColor = "emerald" | "cyan" | "amber" | "orange" | "red";

export interface StandingsZone {
  from: number;
  to: number;
  label: string;
  color: ZoneColor;
}

export interface LeagueConfig {
  slug: string;
  name: string;
  shortName: string;
  goalserveLeagueId: string;
  standingsZones?: StandingsZone[];
}

const PLZones: StandingsZone[] = [
  { from: 1, to: 4, label: "Champions League", color: "emerald" },
  { from: 5, to: 5, label: "Europa League", color: "amber" },
  { from: 18, to: 20, label: "Relegation", color: "red" },
];

const ChampionshipZones: StandingsZone[] = [
  { from: 1, to: 2, label: "Automatic Promotion", color: "emerald" },
  { from: 3, to: 6, label: "Play Off", color: "amber" },
  { from: 22, to: 24, label: "Relegation", color: "red" },
];

const LeagueOneZones: StandingsZone[] = [
  { from: 1, to: 2, label: "Automatic Promotion", color: "emerald" },
  { from: 3, to: 6, label: "Play Off", color: "amber" },
  { from: 21, to: 24, label: "Relegation", color: "red" },
];

const LeagueTwoZones: StandingsZone[] = [
  { from: 1, to: 3, label: "Automatic Promotion", color: "emerald" },
  { from: 4, to: 7, label: "Play Off", color: "amber" },
  { from: 23, to: 24, label: "Relegation", color: "red" },
];

const NationalLeagueZones: StandingsZone[] = [
  { from: 1, to: 1, label: "Promoted", color: "emerald" },
  { from: 2, to: 3, label: "Play Off SF", color: "amber" },
  { from: 4, to: 7, label: "Play Off QF", color: "orange" },
  { from: 21, to: 24, label: "Relegation", color: "red" },
];

const LaLigaZones: StandingsZone[] = [
  { from: 1, to: 4, label: "Champions League", color: "emerald" },
  { from: 5, to: 5, label: "Europa League", color: "amber" },
  { from: 6, to: 6, label: "Conference League", color: "orange" },
  { from: 18, to: 20, label: "Relegation", color: "red" },
];

const SerieAZones: StandingsZone[] = [
  { from: 1, to: 4, label: "Champions League", color: "emerald" },
  { from: 5, to: 5, label: "Europa League", color: "amber" },
  { from: 6, to: 6, label: "Conference League", color: "orange" },
  { from: 18, to: 20, label: "Relegation", color: "red" },
];

const BundesligaZones: StandingsZone[] = [
  { from: 1, to: 4, label: "Champions League", color: "emerald" },
  { from: 5, to: 5, label: "Europa League", color: "amber" },
  { from: 6, to: 6, label: "Conference League", color: "orange" },
  { from: 16, to: 16, label: "Relegation Play Off", color: "orange" },
  { from: 17, to: 18, label: "Relegation", color: "red" },
];

const Ligue1Zones: StandingsZone[] = [
  { from: 1, to: 3, label: "Champions League", color: "emerald" },
  { from: 4, to: 4, label: "UCL Qual.", color: "cyan" },
  { from: 5, to: 5, label: "Europa League", color: "amber" },
  { from: 6, to: 6, label: "Conference League", color: "orange" },
  { from: 16, to: 16, label: "Relegation Play Off", color: "orange" },
  { from: 17, to: 18, label: "Relegation", color: "red" },
];

export const leagueConfigs: LeagueConfig[] = [
  { slug: "premier-league", name: "Premier League", shortName: "PL", goalserveLeagueId: "1204", standingsZones: PLZones },
  { slug: "championship", name: "Championship", shortName: "CH", goalserveLeagueId: "1205", standingsZones: ChampionshipZones },
  { slug: "league-one", name: "League One", shortName: "L1", goalserveLeagueId: "1206", standingsZones: LeagueOneZones },
  { slug: "league-two", name: "League Two", shortName: "L2", goalserveLeagueId: "1197", standingsZones: LeagueTwoZones },
  { slug: "national-league", name: "National League", shortName: "NL", goalserveLeagueId: "1203", standingsZones: NationalLeagueZones },
  { slug: "la-liga", name: "La Liga", shortName: "LL", goalserveLeagueId: "1399", standingsZones: LaLigaZones },
  { slug: "serie-a", name: "Serie A", shortName: "SA", goalserveLeagueId: "1269", standingsZones: SerieAZones },
  { slug: "bundesliga", name: "Bundesliga", shortName: "BUN", goalserveLeagueId: "1229", standingsZones: BundesligaZones },
  { slug: "ligue-1", name: "Ligue 1", shortName: "L1", goalserveLeagueId: "1221", standingsZones: Ligue1Zones },
];

export function getGoalserveLeagueId(slug: string): string | null {
  const config = leagueConfigs.find((c) => c.slug === slug);
  return config?.goalserveLeagueId ?? null;
}

export function getLeagueBySlug(slug: string): LeagueConfig | undefined {
  return leagueConfigs.find((c) => c.slug === slug);
}
