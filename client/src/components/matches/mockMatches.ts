import { addDays, setHours, setMinutes, startOfDay } from "date-fns";

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed";

export interface MockMatch {
  id: string;
  competition: string;
  rawCompetition?: string | null;
  dateISO: string;
  kickOffTime: string;
  status: MatchStatus;
  minute?: number;
  homeTeam: {
    id: string;
    name: string;
    shortName: string;
    primaryColor: string;
    logoUrl?: string;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string;
    primaryColor: string;
    logoUrl?: string;
  };
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
}

const today = startOfDay(new Date());
const tomorrow = addDays(today, 1);
const dayAfterTomorrow = addDays(today, 2);
const threeDaysAgo = addDays(today, -3);
const twoDaysAgo = addDays(today, -2);
const yesterday = addDays(today, -1);

export const mockMatches: MockMatch[] = [
  {
    id: "match-1",
    competition: "Premier League",
    dateISO: setMinutes(setHours(today, 15), 0).toISOString(),
    kickOffTime: setMinutes(setHours(today, 15), 0).toISOString(),
    status: "scheduled",
    homeTeam: {
      id: "arsenal",
      name: "Arsenal",
      shortName: "ARS",
      primaryColor: "#EF0107",
    },
    awayTeam: {
      id: "chelsea",
      name: "Chelsea",
      shortName: "CHE",
      primaryColor: "#034694",
    },
    homeScore: null,
    awayScore: null,
    venue: "Emirates Stadium",
  },
  {
    id: "match-2",
    competition: "Premier League",
    dateISO: setMinutes(setHours(today, 12), 30).toISOString(),
    kickOffTime: setMinutes(setHours(today, 12), 30).toISOString(),
    status: "live",
    minute: 67,
    homeTeam: {
      id: "liverpool",
      name: "Liverpool",
      shortName: "LIV",
      primaryColor: "#C8102E",
    },
    awayTeam: {
      id: "man-city",
      name: "Man City",
      shortName: "MCI",
      primaryColor: "#6CABDD",
    },
    homeScore: 2,
    awayScore: 1,
    venue: "Anfield",
  },
  {
    id: "match-3",
    competition: "Premier League",
    dateISO: setMinutes(setHours(today, 17), 30).toISOString(),
    kickOffTime: setMinutes(setHours(today, 17), 30).toISOString(),
    status: "scheduled",
    homeTeam: {
      id: "man-utd",
      name: "Man Utd",
      shortName: "MUN",
      primaryColor: "#DA291C",
    },
    awayTeam: {
      id: "tottenham",
      name: "Tottenham",
      shortName: "TOT",
      primaryColor: "#132257",
    },
    homeScore: null,
    awayScore: null,
    venue: "Old Trafford",
  },
  {
    id: "match-4",
    competition: "Premier League",
    dateISO: setMinutes(setHours(tomorrow, 15), 0).toISOString(),
    kickOffTime: setMinutes(setHours(tomorrow, 15), 0).toISOString(),
    status: "scheduled",
    homeTeam: {
      id: "newcastle",
      name: "Newcastle",
      shortName: "NEW",
      primaryColor: "#241F20",
    },
    awayTeam: {
      id: "aston-villa",
      name: "Aston Villa",
      shortName: "AVL",
      primaryColor: "#670E36",
    },
    homeScore: null,
    awayScore: null,
    venue: "St. James' Park",
  },
  {
    id: "match-5",
    competition: "Premier League",
    dateISO: setMinutes(setHours(tomorrow, 17), 30).toISOString(),
    kickOffTime: setMinutes(setHours(tomorrow, 17), 30).toISOString(),
    status: "scheduled",
    homeTeam: {
      id: "west-ham",
      name: "West Ham",
      shortName: "WHU",
      primaryColor: "#7A263A",
    },
    awayTeam: {
      id: "brighton",
      name: "Brighton",
      shortName: "BHA",
      primaryColor: "#0057B8",
    },
    homeScore: null,
    awayScore: null,
    venue: "London Stadium",
  },
  {
    id: "match-6",
    competition: "Premier League",
    dateISO: setMinutes(setHours(dayAfterTomorrow, 15), 0).toISOString(),
    kickOffTime: setMinutes(setHours(dayAfterTomorrow, 15), 0).toISOString(),
    status: "scheduled",
    homeTeam: {
      id: "everton",
      name: "Everton",
      shortName: "EVE",
      primaryColor: "#003399",
    },
    awayTeam: {
      id: "fulham",
      name: "Fulham",
      shortName: "FUL",
      primaryColor: "#CC0000",
    },
    homeScore: null,
    awayScore: null,
    venue: "Goodison Park",
  },
  {
    id: "match-7",
    competition: "Premier League",
    dateISO: setMinutes(setHours(yesterday, 15), 0).toISOString(),
    kickOffTime: setMinutes(setHours(yesterday, 15), 0).toISOString(),
    status: "finished",
    homeTeam: {
      id: "brentford",
      name: "Brentford",
      shortName: "BRE",
      primaryColor: "#E30613",
    },
    awayTeam: {
      id: "wolves",
      name: "Wolves",
      shortName: "WOL",
      primaryColor: "#FDB913",
    },
    homeScore: 3,
    awayScore: 1,
    venue: "Gtech Community Stadium",
  },
  {
    id: "match-8",
    competition: "Premier League",
    dateISO: setMinutes(setHours(twoDaysAgo, 17), 30).toISOString(),
    kickOffTime: setMinutes(setHours(twoDaysAgo, 17), 30).toISOString(),
    status: "finished",
    homeTeam: {
      id: "chelsea",
      name: "Chelsea",
      shortName: "CHE",
      primaryColor: "#034694",
    },
    awayTeam: {
      id: "man-city",
      name: "Man City",
      shortName: "MCI",
      primaryColor: "#6CABDD",
    },
    homeScore: 1,
    awayScore: 1,
    venue: "Stamford Bridge",
  },
  {
    id: "match-9",
    competition: "Premier League",
    dateISO: setMinutes(setHours(threeDaysAgo, 20), 0).toISOString(),
    kickOffTime: setMinutes(setHours(threeDaysAgo, 20), 0).toISOString(),
    status: "postponed",
    homeTeam: {
      id: "crystal-palace",
      name: "Crystal Palace",
      shortName: "CRY",
      primaryColor: "#1B458F",
    },
    awayTeam: {
      id: "bournemouth",
      name: "Bournemouth",
      shortName: "BOU",
      primaryColor: "#DA291C",
    },
    homeScore: null,
    awayScore: null,
    venue: "Selhurst Park",
  },
];
