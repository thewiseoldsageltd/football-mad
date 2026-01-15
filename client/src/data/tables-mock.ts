export interface TableRow {
  pos: number;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
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
  { id: "league-two", name: "League Two", shortName: "L2", type: "league" },
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
  { pos: 1, teamName: "Liverpool", played: 21, won: 15, drawn: 5, lost: 1, goalsFor: 52, goalsAgainst: 24, gd: 28, pts: 50 },
  { pos: 2, teamName: "Arsenal", played: 21, won: 13, drawn: 5, lost: 3, goalsFor: 45, goalsAgainst: 22, gd: 23, pts: 44 },
  { pos: 3, teamName: "Nottingham Forest", played: 21, won: 12, drawn: 5, lost: 4, goalsFor: 33, goalsAgainst: 24, gd: 9, pts: 41 },
  { pos: 4, teamName: "Chelsea", played: 21, won: 11, drawn: 6, lost: 4, goalsFor: 42, goalsAgainst: 26, gd: 16, pts: 39 },
  { pos: 5, teamName: "Manchester City", played: 21, won: 10, drawn: 5, lost: 6, goalsFor: 40, goalsAgainst: 25, gd: 15, pts: 35 },
  { pos: 6, teamName: "Newcastle", played: 21, won: 10, drawn: 5, lost: 6, goalsFor: 35, goalsAgainst: 24, gd: 11, pts: 35 },
  { pos: 7, teamName: "Bournemouth", played: 21, won: 9, drawn: 6, lost: 6, goalsFor: 32, goalsAgainst: 27, gd: 5, pts: 33 },
  { pos: 8, teamName: "Brighton", played: 21, won: 9, drawn: 5, lost: 7, goalsFor: 34, goalsAgainst: 30, gd: 4, pts: 32 },
  { pos: 9, teamName: "Aston Villa", played: 21, won: 8, drawn: 7, lost: 6, goalsFor: 30, goalsAgainst: 27, gd: 3, pts: 31 },
  { pos: 10, teamName: "Fulham", played: 21, won: 8, drawn: 6, lost: 7, goalsFor: 28, goalsAgainst: 26, gd: 2, pts: 30 },
  { pos: 11, teamName: "Tottenham", played: 21, won: 8, drawn: 5, lost: 8, goalsFor: 38, goalsAgainst: 32, gd: 6, pts: 29 },
  { pos: 12, teamName: "Brentford", played: 21, won: 7, drawn: 6, lost: 8, goalsFor: 32, goalsAgainst: 34, gd: -2, pts: 27 },
  { pos: 13, teamName: "West Ham", played: 21, won: 7, drawn: 5, lost: 9, goalsFor: 28, goalsAgainst: 35, gd: -7, pts: 26 },
  { pos: 14, teamName: "Manchester United", played: 21, won: 6, drawn: 6, lost: 9, goalsFor: 26, goalsAgainst: 28, gd: -2, pts: 24 },
  { pos: 15, teamName: "Crystal Palace", played: 21, won: 5, drawn: 8, lost: 8, goalsFor: 22, goalsAgainst: 28, gd: -6, pts: 23 },
  { pos: 16, teamName: "Everton", played: 21, won: 5, drawn: 7, lost: 9, goalsFor: 20, goalsAgainst: 30, gd: -10, pts: 22 },
  { pos: 17, teamName: "Wolves", played: 21, won: 5, drawn: 6, lost: 10, goalsFor: 24, goalsAgainst: 38, gd: -14, pts: 21 },
  { pos: 18, teamName: "Leicester", played: 21, won: 4, drawn: 7, lost: 10, goalsFor: 24, goalsAgainst: 42, gd: -18, pts: 19 },
  { pos: 19, teamName: "Ipswich", played: 21, won: 3, drawn: 8, lost: 10, goalsFor: 21, goalsAgainst: 40, gd: -19, pts: 17 },
  { pos: 20, teamName: "Southampton", played: 21, won: 2, drawn: 5, lost: 14, goalsFor: 15, goalsAgainst: 45, gd: -30, pts: 11 },
];

export const laLigaTable: TableRow[] = [
  { pos: 1, teamName: "Barcelona", played: 20, won: 15, drawn: 3, lost: 2, goalsFor: 52, goalsAgainst: 22, gd: 30, pts: 48 },
  { pos: 2, teamName: "Real Madrid", played: 20, won: 14, drawn: 4, lost: 2, goalsFor: 48, goalsAgainst: 20, gd: 28, pts: 46 },
  { pos: 3, teamName: "Atletico Madrid", played: 20, won: 13, drawn: 4, lost: 3, goalsFor: 38, goalsAgainst: 20, gd: 18, pts: 43 },
  { pos: 4, teamName: "Athletic Bilbao", played: 20, won: 11, drawn: 5, lost: 4, goalsFor: 32, goalsAgainst: 20, gd: 12, pts: 38 },
  { pos: 5, teamName: "Villarreal", played: 20, won: 10, drawn: 6, lost: 4, goalsFor: 35, goalsAgainst: 25, gd: 10, pts: 36 },
  { pos: 6, teamName: "Real Sociedad", played: 20, won: 9, drawn: 5, lost: 6, goalsFor: 28, goalsAgainst: 23, gd: 5, pts: 32 },
  { pos: 7, teamName: "Real Betis", played: 20, won: 8, drawn: 6, lost: 6, goalsFor: 26, goalsAgainst: 23, gd: 3, pts: 30 },
  { pos: 8, teamName: "Girona", played: 20, won: 7, drawn: 6, lost: 7, goalsFor: 28, goalsAgainst: 28, gd: 0, pts: 27 },
  { pos: 9, teamName: "Sevilla", played: 20, won: 6, drawn: 7, lost: 7, goalsFor: 24, goalsAgainst: 26, gd: -2, pts: 25 },
  { pos: 10, teamName: "Valencia", played: 20, won: 4, drawn: 7, lost: 9, goalsFor: 18, goalsAgainst: 26, gd: -8, pts: 19 },
];

export const championshipTable: TableRow[] = [
  { pos: 1, teamName: "Leeds United", played: 25, won: 18, drawn: 4, lost: 3, goalsFor: 52, goalsAgainst: 22, gd: 30, pts: 58 },
  { pos: 2, teamName: "Sheffield United", played: 25, won: 17, drawn: 5, lost: 3, goalsFor: 48, goalsAgainst: 20, gd: 28, pts: 56 },
  { pos: 3, teamName: "Burnley", played: 25, won: 15, drawn: 6, lost: 4, goalsFor: 44, goalsAgainst: 24, gd: 20, pts: 51 },
  { pos: 4, teamName: "Sunderland", played: 25, won: 14, drawn: 6, lost: 5, goalsFor: 40, goalsAgainst: 26, gd: 14, pts: 48 },
  { pos: 5, teamName: "Middlesbrough", played: 25, won: 13, drawn: 7, lost: 5, goalsFor: 38, goalsAgainst: 28, gd: 10, pts: 46 },
  { pos: 6, teamName: "West Brom", played: 25, won: 12, drawn: 8, lost: 5, goalsFor: 35, goalsAgainst: 25, gd: 10, pts: 44 },
  { pos: 7, teamName: "Watford", played: 25, won: 12, drawn: 6, lost: 7, goalsFor: 38, goalsAgainst: 30, gd: 8, pts: 42 },
  { pos: 8, teamName: "Norwich City", played: 25, won: 11, drawn: 7, lost: 7, goalsFor: 34, goalsAgainst: 28, gd: 6, pts: 40 },
  { pos: 9, teamName: "Coventry City", played: 25, won: 10, drawn: 8, lost: 7, goalsFor: 32, goalsAgainst: 28, gd: 4, pts: 38 },
  { pos: 10, teamName: "Bristol City", played: 25, won: 10, drawn: 6, lost: 9, goalsFor: 30, goalsAgainst: 32, gd: -2, pts: 36 },
];

export const leagueOneTable: TableRow[] = [
  { pos: 1, teamName: "Birmingham City", played: 25, won: 20, drawn: 3, lost: 2, goalsFor: 60, goalsAgainst: 18, gd: 42, pts: 63 },
  { pos: 2, teamName: "Wrexham", played: 25, won: 17, drawn: 5, lost: 3, goalsFor: 52, goalsAgainst: 22, gd: 30, pts: 56 },
  { pos: 3, teamName: "Wigan Athletic", played: 25, won: 15, drawn: 6, lost: 4, goalsFor: 45, goalsAgainst: 25, gd: 20, pts: 51 },
  { pos: 4, teamName: "Huddersfield", played: 25, won: 14, drawn: 6, lost: 5, goalsFor: 40, goalsAgainst: 26, gd: 14, pts: 48 },
  { pos: 5, teamName: "Reading", played: 25, won: 13, drawn: 7, lost: 5, goalsFor: 38, goalsAgainst: 28, gd: 10, pts: 46 },
  { pos: 6, teamName: "Bolton", played: 25, won: 12, drawn: 8, lost: 5, goalsFor: 35, goalsAgainst: 25, gd: 10, pts: 44 },
];

export const leagueTwoTable: TableRow[] = [
  { pos: 1, teamName: "Port Vale", played: 25, won: 18, drawn: 4, lost: 3, goalsFor: 48, goalsAgainst: 18, gd: 30, pts: 58 },
  { pos: 2, teamName: "Doncaster", played: 25, won: 16, drawn: 6, lost: 3, goalsFor: 44, goalsAgainst: 20, gd: 24, pts: 54 },
  { pos: 3, teamName: "Crewe", played: 25, won: 15, drawn: 5, lost: 5, goalsFor: 40, goalsAgainst: 22, gd: 18, pts: 50 },
  { pos: 4, teamName: "Grimsby Town", played: 25, won: 14, drawn: 6, lost: 5, goalsFor: 38, goalsAgainst: 24, gd: 14, pts: 48 },
  { pos: 5, teamName: "Chesterfield", played: 25, won: 13, drawn: 7, lost: 5, goalsFor: 36, goalsAgainst: 26, gd: 10, pts: 46 },
  { pos: 6, teamName: "Notts County", played: 25, won: 12, drawn: 8, lost: 5, goalsFor: 34, goalsAgainst: 25, gd: 9, pts: 44 },
];

export const serieATable: TableRow[] = [
  { pos: 1, teamName: "Inter Milan", played: 20, won: 14, drawn: 4, lost: 2, goalsFor: 42, goalsAgainst: 18, gd: 24, pts: 46 },
  { pos: 2, teamName: "Napoli", played: 20, won: 13, drawn: 4, lost: 3, goalsFor: 38, goalsAgainst: 20, gd: 18, pts: 43 },
  { pos: 3, teamName: "Juventus", played: 20, won: 12, drawn: 5, lost: 3, goalsFor: 36, goalsAgainst: 22, gd: 14, pts: 41 },
  { pos: 4, teamName: "AC Milan", played: 20, won: 11, drawn: 5, lost: 4, goalsFor: 34, goalsAgainst: 24, gd: 10, pts: 38 },
  { pos: 5, teamName: "Atalanta", played: 20, won: 10, drawn: 6, lost: 4, goalsFor: 38, goalsAgainst: 28, gd: 10, pts: 36 },
  { pos: 6, teamName: "Lazio", played: 20, won: 10, drawn: 5, lost: 5, goalsFor: 32, goalsAgainst: 26, gd: 6, pts: 35 },
];

export const bundesligaTable: TableRow[] = [
  { pos: 1, teamName: "Bayern Munich", played: 17, won: 12, drawn: 3, lost: 2, goalsFor: 46, goalsAgainst: 20, gd: 26, pts: 39 },
  { pos: 2, teamName: "Bayer Leverkusen", played: 17, won: 11, drawn: 4, lost: 2, goalsFor: 42, goalsAgainst: 22, gd: 20, pts: 37 },
  { pos: 3, teamName: "Borussia Dortmund", played: 17, won: 10, drawn: 4, lost: 3, goalsFor: 38, goalsAgainst: 24, gd: 14, pts: 34 },
  { pos: 4, teamName: "RB Leipzig", played: 17, won: 10, drawn: 3, lost: 4, goalsFor: 36, goalsAgainst: 26, gd: 10, pts: 33 },
  { pos: 5, teamName: "Stuttgart", played: 17, won: 9, drawn: 4, lost: 4, goalsFor: 34, goalsAgainst: 24, gd: 10, pts: 31 },
  { pos: 6, teamName: "Eintracht Frankfurt", played: 17, won: 8, drawn: 5, lost: 4, goalsFor: 30, goalsAgainst: 22, gd: 8, pts: 29 },
];

export const ligue1Table: TableRow[] = [
  { pos: 1, teamName: "PSG", played: 18, won: 14, drawn: 2, lost: 2, goalsFor: 48, goalsAgainst: 18, gd: 30, pts: 44 },
  { pos: 2, teamName: "Monaco", played: 18, won: 12, drawn: 4, lost: 2, goalsFor: 40, goalsAgainst: 20, gd: 20, pts: 40 },
  { pos: 3, teamName: "Marseille", played: 18, won: 11, drawn: 4, lost: 3, goalsFor: 36, goalsAgainst: 22, gd: 14, pts: 37 },
  { pos: 4, teamName: "Lyon", played: 18, won: 10, drawn: 5, lost: 3, goalsFor: 34, goalsAgainst: 24, gd: 10, pts: 35 },
  { pos: 5, teamName: "Lille", played: 18, won: 9, drawn: 6, lost: 3, goalsFor: 30, goalsAgainst: 22, gd: 8, pts: 33 },
  { pos: 6, teamName: "Nice", played: 18, won: 8, drawn: 6, lost: 4, goalsFor: 28, goalsAgainst: 20, gd: 8, pts: 30 },
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
      return premierLeagueTable;
    case "championship":
      return championshipTable;
    case "league-one":
      return leagueOneTable;
    case "league-two":
      return leagueTwoTable;
    case "la-liga":
      return laLigaTable;
    case "serie-a":
      return serieATable;
    case "bundesliga":
      return bundesligaTable;
    case "ligue-1":
      return ligue1Table;
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
