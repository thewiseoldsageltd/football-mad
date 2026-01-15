export interface TableRow {
  pos: number;
  teamName: string;
  played: number;
  gd: number;
  pts: number;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  type: "league" | "cup" | "europe";
}

export const leagueCompetitions: Competition[] = [
  { id: "premier-league", name: "Premier League", shortName: "PL", type: "league" },
  { id: "championship", name: "Championship", shortName: "CH", type: "league" },
  { id: "league-one", name: "League One", shortName: "L1", type: "league" },
  { id: "la-liga", name: "La Liga", shortName: "LL", type: "league" },
  { id: "serie-a", name: "Serie A", shortName: "SA", type: "league" },
  { id: "bundesliga", name: "Bundesliga", shortName: "BL", type: "league" },
  { id: "ligue-1", name: "Ligue 1", shortName: "L1", type: "league" },
];

export const europeCompetitions: Competition[] = [
  { id: "champions-league", name: "Champions League", shortName: "UCL", type: "europe" },
  { id: "europa-league", name: "Europa League", shortName: "UEL", type: "europe" },
  { id: "conference-league", name: "Conference League", shortName: "UECL", type: "europe" },
];

export const cupCompetitions: Competition[] = [
  { id: "fa-cup", name: "FA Cup", shortName: "FAC", type: "cup" },
  { id: "efl-cup", name: "EFL Cup", shortName: "EFL", type: "cup" },
  { id: "copa-del-rey", name: "Copa del Rey", shortName: "CDR", type: "cup" },
  { id: "dfb-pokal", name: "DFB-Pokal", shortName: "DFB", type: "cup" },
  { id: "coppa-italia", name: "Coppa Italia", shortName: "CI", type: "cup" },
];

export const premierLeagueTable: TableRow[] = [
  { pos: 1, teamName: "Liverpool", played: 21, gd: 28, pts: 50 },
  { pos: 2, teamName: "Arsenal", played: 21, gd: 23, pts: 44 },
  { pos: 3, teamName: "Nottingham Forest", played: 21, gd: 9, pts: 41 },
  { pos: 4, teamName: "Chelsea", played: 21, gd: 16, pts: 39 },
  { pos: 5, teamName: "Manchester City", played: 21, gd: 15, pts: 35 },
  { pos: 6, teamName: "Newcastle", played: 21, gd: 11, pts: 35 },
  { pos: 7, teamName: "Bournemouth", played: 21, gd: 5, pts: 33 },
  { pos: 8, teamName: "Brighton", played: 21, gd: 4, pts: 32 },
  { pos: 9, teamName: "Aston Villa", played: 21, gd: 3, pts: 31 },
  { pos: 10, teamName: "Fulham", played: 21, gd: 2, pts: 30 },
];

export const laLigaTable: TableRow[] = [
  { pos: 1, teamName: "Barcelona", played: 20, gd: 30, pts: 48 },
  { pos: 2, teamName: "Real Madrid", played: 20, gd: 28, pts: 46 },
  { pos: 3, teamName: "Atletico Madrid", played: 20, gd: 18, pts: 43 },
  { pos: 4, teamName: "Athletic Bilbao", played: 20, gd: 12, pts: 38 },
  { pos: 5, teamName: "Villarreal", played: 20, gd: 10, pts: 36 },
  { pos: 6, teamName: "Real Sociedad", played: 20, gd: 5, pts: 32 },
  { pos: 7, teamName: "Real Betis", played: 20, gd: 3, pts: 30 },
  { pos: 8, teamName: "Girona", played: 20, gd: 0, pts: 27 },
  { pos: 9, teamName: "Sevilla", played: 20, gd: -2, pts: 25 },
  { pos: 10, teamName: "Valencia", played: 20, gd: -8, pts: 19 },
];

export const championsLeagueGroups: Record<string, TableRow[]> = {
  "Group A": [
    { pos: 1, teamName: "Bayern Munich", played: 6, gd: 12, pts: 16 },
    { pos: 2, teamName: "Manchester United", played: 6, gd: 4, pts: 11 },
    { pos: 3, teamName: "Copenhagen", played: 6, gd: -3, pts: 7 },
    { pos: 4, teamName: "Galatasaray", played: 6, gd: -13, pts: 2 },
  ],
  "Group B": [
    { pos: 1, teamName: "Arsenal", played: 6, gd: 9, pts: 14 },
    { pos: 2, teamName: "PSV", played: 6, gd: 2, pts: 10 },
    { pos: 3, teamName: "Lens", played: 6, gd: 1, pts: 8 },
    { pos: 4, teamName: "Sevilla", played: 6, gd: -12, pts: 3 },
  ],
  "Group C": [
    { pos: 1, teamName: "Real Madrid", played: 6, gd: 14, pts: 18 },
    { pos: 2, teamName: "Napoli", played: 6, gd: 5, pts: 10 },
    { pos: 3, teamName: "Braga", played: 6, gd: -6, pts: 5 },
    { pos: 4, teamName: "Union Berlin", played: 6, gd: -13, pts: 1 },
  ],
  "Group D": [
    { pos: 1, teamName: "Inter Milan", played: 6, gd: 8, pts: 14 },
    { pos: 2, teamName: "Atletico Madrid", played: 6, gd: 2, pts: 9 },
    { pos: 3, teamName: "Lazio", played: 6, gd: -1, pts: 7 },
    { pos: 4, teamName: "Celtic", played: 6, gd: -9, pts: 3 },
  ],
};

export const europaLeagueGroups: Record<string, TableRow[]> = {
  "Group A": [
    { pos: 1, teamName: "West Ham", played: 6, gd: 8, pts: 15 },
    { pos: 2, teamName: "Olympiacos", played: 6, gd: 3, pts: 10 },
    { pos: 3, teamName: "Freiburg", played: 6, gd: -2, pts: 7 },
    { pos: 4, teamName: "Backa Topola", played: 6, gd: -9, pts: 4 },
  ],
  "Group B": [
    { pos: 1, teamName: "Liverpool", played: 6, gd: 10, pts: 16 },
    { pos: 2, teamName: "Union Saint-Gilloise", played: 6, gd: 2, pts: 9 },
    { pos: 3, teamName: "Toulouse", played: 6, gd: -1, pts: 8 },
    { pos: 4, teamName: "LASK", played: 6, gd: -11, pts: 3 },
  ],
};

export const conferenceLeagueGroups: Record<string, TableRow[]> = {
  "Group A": [
    { pos: 1, teamName: "Aston Villa", played: 6, gd: 7, pts: 14 },
    { pos: 2, teamName: "AZ Alkmaar", played: 6, gd: 3, pts: 11 },
    { pos: 3, teamName: "Zrinjski", played: 6, gd: -3, pts: 6 },
    { pos: 4, teamName: "Legia Warsaw", played: 6, gd: -7, pts: 3 },
  ],
};

export interface CupRound {
  id: string;
  name: string;
  status: "completed" | "ongoing" | "upcoming";
  fixtures?: string[];
}

export const faCupRounds: CupRound[] = [
  { 
    id: "r1", 
    name: "First Round", 
    status: "completed",
    fixtures: ["Bradford 2-1 Harrogate", "Wigan 3-0 Oldham", "Crewe 1-1 Port Vale"]
  },
  { 
    id: "r2", 
    name: "Second Round", 
    status: "completed",
    fixtures: ["Bradford 1-0 Wigan", "Portsmouth 2-2 Reading", "Exeter 0-3 Plymouth"]
  },
  { 
    id: "r3", 
    name: "Third Round", 
    status: "ongoing",
    fixtures: ["Liverpool vs Accrington", "Arsenal vs Manchester United", "Brighton vs Norwich"]
  },
  { 
    id: "r4", 
    name: "Fourth Round", 
    status: "upcoming"
  },
  { 
    id: "r5", 
    name: "Fifth Round", 
    status: "upcoming"
  },
  { 
    id: "qf", 
    name: "Quarter-Finals", 
    status: "upcoming"
  },
  { 
    id: "sf", 
    name: "Semi-Finals", 
    status: "upcoming"
  },
  { 
    id: "f", 
    name: "Final", 
    status: "upcoming"
  },
];

export const knockoutRounds: CupRound[] = [
  { 
    id: "r16", 
    name: "Round of 16", 
    status: "ongoing",
    fixtures: ["Real Madrid vs RB Leipzig", "Arsenal vs Porto", "Bayern vs Lazio", "PSG vs Barcelona"]
  },
  { 
    id: "qf", 
    name: "Quarter-Finals", 
    status: "upcoming"
  },
  { 
    id: "sf", 
    name: "Semi-Finals", 
    status: "upcoming"
  },
  { 
    id: "f", 
    name: "Final", 
    status: "upcoming"
  },
];

export const eflCupRounds: CupRound[] = [
  { id: "r3", name: "Third Round", status: "completed", fixtures: ["Arsenal 3-0 Bolton", "Chelsea 2-1 Wimbledon"] },
  { id: "r4", name: "Fourth Round", status: "ongoing", fixtures: ["Liverpool vs West Ham", "Arsenal vs Newcastle"] },
  { id: "qf", name: "Quarter-Finals", status: "upcoming" },
  { id: "sf", name: "Semi-Finals", status: "upcoming" },
  { id: "f", name: "Final", status: "upcoming" },
];

export const copaDelReyRounds: CupRound[] = [
  { id: "r32", name: "Round of 32", status: "completed", fixtures: ["Real Madrid 4-0 Arandina", "Barcelona 5-1 Barbastro"] },
  { id: "r16", name: "Round of 16", status: "ongoing", fixtures: ["Barcelona vs Real Betis", "Real Madrid vs Celta Vigo"] },
  { id: "qf", name: "Quarter-Finals", status: "upcoming" },
  { id: "sf", name: "Semi-Finals", status: "upcoming" },
  { id: "f", name: "Final", status: "upcoming" },
];

export const dfbPokalRounds: CupRound[] = [
  { id: "r2", name: "Second Round", status: "completed", fixtures: ["Bayern Munich 4-2 Freiburg", "Dortmund 3-0 Cologne"] },
  { id: "r16", name: "Round of 16", status: "ongoing", fixtures: ["Bayern vs Mainz", "Dortmund vs RB Leipzig"] },
  { id: "qf", name: "Quarter-Finals", status: "upcoming" },
  { id: "sf", name: "Semi-Finals", status: "upcoming" },
  { id: "f", name: "Final", status: "upcoming" },
];

export const coppaItaliaRounds: CupRound[] = [
  { id: "r16", name: "Round of 16", status: "completed", fixtures: ["Juventus 2-1 Cagliari", "Inter 3-0 Parma"] },
  { id: "qf", name: "Quarter-Finals", status: "ongoing", fixtures: ["Juventus vs Empoli", "Inter vs Lazio"] },
  { id: "sf", name: "Semi-Finals", status: "upcoming" },
  { id: "f", name: "Final", status: "upcoming" },
];

export const seasons = [
  "2025/26",
  "2024/25",
  "2023/24",
  "2022/23",
];

export const tableViews = [
  { value: "overall", label: "Overall" },
  { value: "home", label: "Home" },
  { value: "away", label: "Away" },
];

export function getTableForCompetition(competitionId: string): TableRow[] {
  switch (competitionId) {
    case "premier-league":
    case "all":
      return premierLeagueTable;
    case "la-liga":
      return laLigaTable;
    default:
      return premierLeagueTable;
  }
}

export function getGroupsForEuropeCompetition(competitionId: string): Record<string, TableRow[]> {
  switch (competitionId) {
    case "champions-league":
      return championsLeagueGroups;
    case "europa-league":
      return europaLeagueGroups;
    case "conference-league":
      return conferenceLeagueGroups;
    default:
      return championsLeagueGroups;
  }
}

export function getRoundsForCup(cupId: string): CupRound[] {
  switch (cupId) {
    case "fa-cup":
      return faCupRounds;
    case "efl-cup":
      return eflCupRounds;
    case "copa-del-rey":
      return copaDelReyRounds;
    case "dfb-pokal":
      return dfbPokalRounds;
    case "coppa-italia":
      return coppaItaliaRounds;
    default:
      return faCupRounds;
  }
}
