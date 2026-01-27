export interface TableRow {
  pos: number;
  teamName: string;
  teamSlug?: string;
  teamCrestUrl?: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  gd: number;
  pts: number;
  recentForm?: string;
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
  { id: "league-two", name: "League Two", shortName: "L2", type: "league" },
  { id: "national-league", name: "National League", shortName: "NL", type: "league" },
  { id: "la-liga", name: "La Liga", shortName: "LL", type: "league" },
  { id: "serie-a", name: "Serie A", shortName: "SA", type: "league" },
  { id: "bundesliga", name: "Bundesliga", shortName: "BUN", type: "league" },
  { id: "ligue-1", name: "Ligue 1", shortName: "L1", type: "league" },
];

export const europeCompetitions: Competition[] = [
  { id: "champions-league", name: "Champions League", shortName: "UCL", type: "europe" },
  { id: "europa-league", name: "Europa League", shortName: "UEL", type: "europe" },
  { id: "conference-league", name: "Conference League", shortName: "UECL", type: "europe" },
];

export const cupCompetitions: Competition[] = [
  { id: "fa-cup", name: "FA Cup", shortName: "FA Cup", type: "cup" },
  { id: "efl-cup", name: "EFL Cup", shortName: "EFL Cup", type: "cup" },
  { id: "scottish-cup", name: "Scottish Cup", shortName: "Scottish Cup", type: "cup" },
  { id: "scottish-league-cup", name: "Scottish League Cup", shortName: "Scottish League Cup", type: "cup" },
  { id: "copa-del-rey", name: "Copa del Rey", shortName: "Copa del Rey", type: "cup" },
  { id: "coppa-italia", name: "Coppa Italia", shortName: "Coppa Italia", type: "cup" },
  { id: "dfb-pokal", name: "DFB-Pokal", shortName: "DFB-Pokal", type: "cup" },
  { id: "coupe-de-france", name: "Coupe de France", shortName: "Coupe de France", type: "cup" },
];


export const championsLeagueGroups: Record<string, TableRow[]> = {
  "Group A": [
    { pos: 1, teamName: "Bayern Munich", played: 6, won: 5, drawn: 1, lost: 0, goalsFor: 18, goalsAgainst: 6, gd: 12, pts: 16 },
    { pos: 2, teamName: "Manchester United", played: 6, won: 3, drawn: 2, lost: 1, goalsFor: 12, goalsAgainst: 8, gd: 4, pts: 11 },
    { pos: 3, teamName: "Copenhagen", played: 6, won: 2, drawn: 1, lost: 3, goalsFor: 7, goalsAgainst: 10, gd: -3, pts: 7 },
    { pos: 4, teamName: "Galatasaray", played: 6, won: 0, drawn: 2, lost: 4, goalsFor: 4, goalsAgainst: 17, gd: -13, pts: 2 },
  ],
  "Group B": [
    { pos: 1, teamName: "Arsenal", played: 6, won: 4, drawn: 2, lost: 0, goalsFor: 14, goalsAgainst: 5, gd: 9, pts: 14 },
    { pos: 2, teamName: "PSV", played: 6, won: 3, drawn: 1, lost: 2, goalsFor: 10, goalsAgainst: 8, gd: 2, pts: 10 },
    { pos: 3, teamName: "Lens", played: 6, won: 2, drawn: 2, lost: 2, goalsFor: 8, goalsAgainst: 7, gd: 1, pts: 8 },
    { pos: 4, teamName: "Sevilla", played: 6, won: 1, drawn: 0, lost: 5, goalsFor: 5, goalsAgainst: 17, gd: -12, pts: 3 },
  ],
  "Group C": [
    { pos: 1, teamName: "Real Madrid", played: 6, won: 6, drawn: 0, lost: 0, goalsFor: 20, goalsAgainst: 6, gd: 14, pts: 18 },
    { pos: 2, teamName: "Napoli", played: 6, won: 3, drawn: 1, lost: 2, goalsFor: 12, goalsAgainst: 7, gd: 5, pts: 10 },
    { pos: 3, teamName: "Braga", played: 6, won: 1, drawn: 2, lost: 3, goalsFor: 6, goalsAgainst: 12, gd: -6, pts: 5 },
    { pos: 4, teamName: "Union Berlin", played: 6, won: 0, drawn: 1, lost: 5, goalsFor: 3, goalsAgainst: 16, gd: -13, pts: 1 },
  ],
  "Group D": [
    { pos: 1, teamName: "Inter Milan", played: 6, won: 4, drawn: 2, lost: 0, goalsFor: 14, goalsAgainst: 6, gd: 8, pts: 14 },
    { pos: 2, teamName: "Atletico Madrid", played: 6, won: 2, drawn: 3, lost: 1, goalsFor: 8, goalsAgainst: 6, gd: 2, pts: 9 },
    { pos: 3, teamName: "Lazio", played: 6, won: 2, drawn: 1, lost: 3, goalsFor: 7, goalsAgainst: 8, gd: -1, pts: 7 },
    { pos: 4, teamName: "Celtic", played: 6, won: 1, drawn: 0, lost: 5, goalsFor: 4, goalsAgainst: 13, gd: -9, pts: 3 },
  ],
};

export const europaLeagueGroups: Record<string, TableRow[]> = {
  "Group A": [
    { pos: 1, teamName: "West Ham", played: 6, won: 5, drawn: 0, lost: 1, goalsFor: 14, goalsAgainst: 6, gd: 8, pts: 15 },
    { pos: 2, teamName: "Olympiacos", played: 6, won: 3, drawn: 1, lost: 2, goalsFor: 10, goalsAgainst: 7, gd: 3, pts: 10 },
    { pos: 3, teamName: "Freiburg", played: 6, won: 2, drawn: 1, lost: 3, goalsFor: 7, goalsAgainst: 9, gd: -2, pts: 7 },
    { pos: 4, teamName: "Backa Topola", played: 6, won: 1, drawn: 1, lost: 4, goalsFor: 5, goalsAgainst: 14, gd: -9, pts: 4 },
  ],
  "Group B": [
    { pos: 1, teamName: "Liverpool", played: 6, won: 5, drawn: 1, lost: 0, goalsFor: 16, goalsAgainst: 6, gd: 10, pts: 16 },
    { pos: 2, teamName: "Union Saint-Gilloise", played: 6, won: 2, drawn: 3, lost: 1, goalsFor: 9, goalsAgainst: 7, gd: 2, pts: 9 },
    { pos: 3, teamName: "Toulouse", played: 6, won: 2, drawn: 2, lost: 2, goalsFor: 7, goalsAgainst: 8, gd: -1, pts: 8 },
    { pos: 4, teamName: "LASK", played: 6, won: 1, drawn: 0, lost: 5, goalsFor: 4, goalsAgainst: 15, gd: -11, pts: 3 },
  ],
};

export const conferenceLeagueGroups: Record<string, TableRow[]> = {
  "Group A": [
    { pos: 1, teamName: "Aston Villa", played: 6, won: 4, drawn: 2, lost: 0, goalsFor: 12, goalsAgainst: 5, gd: 7, pts: 14 },
    { pos: 2, teamName: "AZ Alkmaar", played: 6, won: 3, drawn: 2, lost: 1, goalsFor: 10, goalsAgainst: 7, gd: 3, pts: 11 },
    { pos: 3, teamName: "Zrinjski", played: 6, won: 2, drawn: 0, lost: 4, goalsFor: 5, goalsAgainst: 8, gd: -3, pts: 6 },
    { pos: 4, teamName: "Legia Warsaw", played: 6, won: 1, drawn: 0, lost: 5, goalsFor: 4, goalsAgainst: 11, gd: -7, pts: 3 },
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

export const scottishCupRounds: CupRound[] = [
  { id: "r1", name: "First Round", status: "completed" },
  { id: "r2", name: "Second Round", status: "ongoing" },
  { id: "r3", name: "Third Round", status: "upcoming" },
  { id: "qf", name: "Quarter-Finals", status: "upcoming" },
  { id: "sf", name: "Semi-Finals", status: "upcoming" },
  { id: "f", name: "Final", status: "upcoming" },
];

export const scottishLeagueCupRounds: CupRound[] = [
  { id: "r2", name: "Second Round", status: "completed" },
  { id: "qf", name: "Quarter-Finals", status: "ongoing" },
  { id: "sf", name: "Semi-Finals", status: "upcoming" },
  { id: "f", name: "Final", status: "upcoming" },
];

export const coupeDeFranceRounds: CupRound[] = [
  { id: "r1", name: "First Round", status: "completed" },
  { id: "r2", name: "Second Round", status: "completed" },
  { id: "r3", name: "Third Round", status: "ongoing" },
  { id: "r16", name: "Round of 16", status: "upcoming" },
  { id: "qf", name: "Quarter-Finals", status: "upcoming" },
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
    case "scottish-cup":
      return scottishCupRounds;
    case "scottish-league-cup":
      return scottishLeagueCupRounds;
    case "copa-del-rey":
      return copaDelReyRounds;
    case "coppa-italia":
      return coppaItaliaRounds;
    case "dfb-pokal":
      return dfbPokalRounds;
    case "coupe-de-france":
      return coupeDeFranceRounds;
    default:
      return faCupRounds;
  }
}
