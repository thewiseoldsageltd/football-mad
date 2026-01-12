import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { format } from "date-fns";
import { 
  Calendar, MapPin, ArrowLeft, Users, Star,
  Target, Activity, AlertCircle, TrendingUp, Zap, ChevronDown, ChevronUp, BarChart3, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MainLayout } from "@/components/layout/main-layout";
import type { Match, Team } from "@shared/schema";

interface MatchTeam {
  name: string;
  shortName: string;
  slug: string;
  primaryColor: string;
}

interface MatchData {
  id: string;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  kickoffTime: Date;
  competition: string;
  competitionShort: string;
  matchweek?: number;
  round?: string;
  homeScore?: number;
  awayScore?: number;
  status: "scheduled" | "finished" | "postponed" | "live";
  venue: string;
}

interface KeyMoment {
  minute: number | "HT" | "FT";
  type: "goal" | "red_card" | "yellow_card" | "penalty" | "var" | "substitution" | "halftime" | "fulltime";
  team: "home" | "away" | "neutral";
  player: string;
  detail?: string;
}

interface HeadToHead {
  date: Date;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
}

interface MatchStats {
  label: string;
  home: number;
  away: number;
  format?: "percent" | "number" | "decimal";
}

const PL_TEAMS: MatchTeam[] = [
  { name: "Arsenal", shortName: "ARS", slug: "arsenal", primaryColor: "#EF0107" },
  { name: "Aston Villa", shortName: "AVL", slug: "aston-villa", primaryColor: "#670E36" },
  { name: "Bournemouth", shortName: "BOU", slug: "bournemouth", primaryColor: "#DA291C" },
  { name: "Brentford", shortName: "BRE", slug: "brentford", primaryColor: "#E30613" },
  { name: "Brighton", shortName: "BHA", slug: "brighton", primaryColor: "#0057B8" },
  { name: "Chelsea", shortName: "CHE", slug: "chelsea", primaryColor: "#034694" },
  { name: "Crystal Palace", shortName: "CRY", slug: "crystal-palace", primaryColor: "#1B458F" },
  { name: "Everton", shortName: "EVE", slug: "everton", primaryColor: "#003399" },
  { name: "Fulham", shortName: "FUL", slug: "fulham", primaryColor: "#000000" },
  { name: "Ipswich Town", shortName: "IPS", slug: "ipswich-town", primaryColor: "#0044AA" },
  { name: "Leicester City", shortName: "LEI", slug: "leicester-city", primaryColor: "#003090" },
  { name: "Liverpool", shortName: "LIV", slug: "liverpool", primaryColor: "#C8102E" },
  { name: "Manchester City", shortName: "MCI", slug: "manchester-city", primaryColor: "#6CABDD" },
  { name: "Manchester United", shortName: "MUN", slug: "manchester-united", primaryColor: "#DA291C" },
  { name: "Newcastle United", shortName: "NEW", slug: "newcastle", primaryColor: "#241F20" },
  { name: "Nottingham Forest", shortName: "NFO", slug: "nottingham-forest", primaryColor: "#E53233" },
  { name: "Southampton", shortName: "SOU", slug: "southampton", primaryColor: "#D71920" },
  { name: "Tottenham", shortName: "TOT", slug: "tottenham", primaryColor: "#132257" },
  { name: "West Ham", shortName: "WHU", slug: "west-ham", primaryColor: "#7A263A" },
  { name: "Wolves", shortName: "WOL", slug: "wolves", primaryColor: "#FDB913" },
];

function isDummyMatchId(matchId: string): boolean {
  return /^(pl|ucl|fac|efl)-mw\d+-/.test(matchId);
}

function parseDummyMatchId(matchId: string): MatchData | null {
  const parts = matchId.split("-");
  if (parts.length < 3) return null;
  
  const competition = parts[0];
  const matchweekPart = parts[1];
  const teamSlug = parts.slice(2).join("-");
  
  const team = PL_TEAMS.find(t => t.slug === teamSlug);
  if (!team) return null;
  
  const matchweek = parseInt(matchweekPart.replace("mw", ""), 10);
  if (isNaN(matchweek)) return null;
  
  const opponents = PL_TEAMS.filter(t => t.slug !== teamSlug);
  const oppIndex = (matchweek - 1) % opponents.length;
  const opponent = opponents[oppIndex];
  
  const seasonStart = new Date("2025-08-16");
  const matchDate = new Date(seasonStart);
  matchDate.setDate(matchDate.getDate() + (matchweek - 1) * 7);
  
  const hours = [12, 15, 17, 20][matchweek % 4];
  matchDate.setHours(hours, matchweek % 2 === 0 ? 30 : 0, 0, 0);
  
  const now = new Date();
  const isPast = matchDate < now;
  const isHome = matchweek % 2 === 0;
  
  const homeTeam = isHome ? team : opponent;
  const awayTeam = isHome ? opponent : team;
  
  let compName = "Premier League";
  let compShort = "PL";
  let round: string | undefined;
  
  if (competition === "ucl") {
    compName = "Champions League";
    compShort = "UCL";
    round = `Group Stage - Matchday ${matchweek}`;
  } else if (competition === "fac") {
    compName = "FA Cup";
    compShort = "FAC";
    round = ["Third Round", "Fourth Round", "Fifth Round", "Quarter-Final", "Semi-Final", "Final"][Math.min(matchweek - 1, 5)];
  } else if (competition === "efl") {
    compName = "EFL Cup";
    compShort = "EFL";
    round = ["Second Round", "Third Round", "Fourth Round", "Quarter-Final", "Semi-Final", "Final"][Math.min(matchweek - 1, 5)];
  }
  
  const seed = matchweek * 17 + teamSlug.length;
  const homeScore = isPast ? (seed % 4) : undefined;
  const awayScore = isPast ? ((seed * 3) % 3) : undefined;
  
  return {
    id: matchId,
    homeTeam,
    awayTeam,
    kickoffTime: matchDate,
    competition: compName,
    competitionShort: compShort,
    matchweek: competition === "pl" ? matchweek : undefined,
    round,
    homeScore,
    awayScore,
    status: isPast ? "finished" : "scheduled",
    venue: `${homeTeam.name} Stadium`,
  };
}

function apiMatchToMatchData(match: Match & { homeTeam?: Team; awayTeam?: Team }): MatchData {
  const homeTeam: MatchTeam = {
    name: match.homeTeam?.name || "Home Team",
    shortName: match.homeTeam?.shortName || "HOM",
    slug: match.homeTeam?.slug || "home",
    primaryColor: match.homeTeam?.primaryColor || "#1a1a2e",
  };
  
  const awayTeam: MatchTeam = {
    name: match.awayTeam?.name || "Away Team",
    shortName: match.awayTeam?.shortName || "AWY",
    slug: match.awayTeam?.slug || "away",
    primaryColor: match.awayTeam?.primaryColor || "#1a1a2e",
  };
  
  const competition = match.competition || "Premier League";
  
  return {
    id: match.slug,
    homeTeam,
    awayTeam,
    kickoffTime: new Date(match.kickoffTime),
    competition,
    competitionShort: competition === "Premier League" ? "PL" : competition,
    homeScore: match.homeScore ?? undefined,
    awayScore: match.awayScore ?? undefined,
    status: match.status as MatchData["status"],
    venue: match.venue || `${homeTeam.name} Stadium`,
  };
}

function generateKeyMoments(match: MatchData): KeyMoment[] {
  if (match.status !== "finished") return [];
  
  const moments: KeyMoment[] = [];
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  
  const homeScorers = ["Saka", "Havertz", "Martinelli", "Rice", "Saliba"];
  const awayScorers = ["Palmer", "Haaland", "Salah", "Son", "Watkins"];
  
  for (let i = 0; i < homeScore; i++) {
    const seed = match.id.length + i * 7;
    const minute = 15 + (i * 25) + (seed % 10);
    moments.push({
      minute: minute > 45 ? minute + 5 : minute,
      type: "goal",
      team: "home",
      player: homeScorers[i % homeScorers.length],
      detail: i === 0 && seed % 5 === 0 ? "Penalty" : undefined,
    });
  }
  
  for (let i = 0; i < awayScore; i++) {
    const seed = match.id.length + i * 11;
    const minute = 30 + (i * 20) + (seed % 8);
    moments.push({
      minute: minute > 45 ? minute + 5 : minute,
      type: "goal",
      team: "away",
      player: awayScorers[i % awayScorers.length],
    });
  }
  
  const seed = match.id.length;
  if (seed % 5 === 0) {
    moments.push({
      minute: 67,
      type: "red_card",
      team: seed % 2 === 0 ? "home" : "away",
      player: "Smith",
      detail: "Second yellow card",
    });
  }
  
  if (seed % 3 === 0) {
    moments.push({
      minute: 34,
      type: "yellow_card",
      team: "home",
      player: "Jones",
    });
  }
  
  const sortedMoments = moments.sort((a, b) => {
    const minA = typeof a.minute === "number" ? a.minute : 0;
    const minB = typeof b.minute === "number" ? b.minute : 0;
    return minA - minB;
  });
  
  const firstHalfGoals = sortedMoments.filter(m => typeof m.minute === "number" && m.minute <= 45 && m.type === "goal");
  const homeFirstHalf = firstHalfGoals.filter(m => m.team === "home").length;
  const awayFirstHalf = firstHalfGoals.filter(m => m.team === "away").length;
  
  const withMarkers: KeyMoment[] = [];
  let addedHT = false;
  
  for (const moment of sortedMoments) {
    const min = typeof moment.minute === "number" ? moment.minute : 0;
    if (!addedHT && min > 45) {
      withMarkers.push({
        minute: "HT",
        type: "halftime",
        team: "neutral",
        player: "",
        detail: `${homeFirstHalf} - ${awayFirstHalf}`,
      });
      addedHT = true;
    }
    withMarkers.push(moment);
  }
  
  if (!addedHT) {
    withMarkers.push({
      minute: "HT",
      type: "halftime",
      team: "neutral",
      player: "",
      detail: `${homeFirstHalf} - ${awayFirstHalf}`,
    });
  }
  
  withMarkers.push({
    minute: "FT",
    type: "fulltime",
    team: "neutral",
    player: "",
    detail: `${homeScore} - ${awayScore}`,
  });
  
  return withMarkers;
}

function generateMatchStats(match: MatchData): MatchStats[] {
  if (match.status !== "finished") return [];
  
  const seed = match.id.length * 7;
  return [
    { label: "Possession", home: 52 + (seed % 10), away: 48 - (seed % 10), format: "percent" },
    { label: "Shots", home: 12 + (seed % 6), away: 8 + (seed % 4), format: "number" },
    { label: "Shots on Target", home: 5 + (seed % 3), away: 3 + (seed % 2), format: "number" },
    { label: "xG", home: 1.2 + (seed % 10) / 10, away: 0.8 + (seed % 8) / 10, format: "decimal" },
    { label: "Corners", home: 6 + (seed % 4), away: 4 + (seed % 3), format: "number" },
  ];
}

function generateHeadToHead(match: MatchData): HeadToHead[] {
  const results: HeadToHead[] = [];
  const baseDate = new Date(match.kickoffTime);
  
  for (let i = 0; i < 5; i++) {
    const pastDate = new Date(baseDate);
    pastDate.setMonth(pastDate.getMonth() - (i + 1) * 4);
    
    const isHomeFirst = i % 2 === 0;
    const seed = match.id.length + i;
    results.push({
      date: pastDate,
      homeTeam: isHomeFirst ? match.homeTeam.shortName : match.awayTeam.shortName,
      awayTeam: isHomeFirst ? match.awayTeam.shortName : match.homeTeam.shortName,
      homeScore: (seed + 2) % 4,
      awayScore: (seed + 1) % 3,
      competition: i < 3 ? "Premier League" : "FA Cup",
    });
  }
  
  return results;
}

interface LineupPlayer {
  name: string;
  number: number | null;
  position: string;
}

interface LineupData {
  formation: string;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

function generatePredictedXI(team: MatchTeam): LineupData {
  const formations = ["4-3-3", "4-2-3-1", "3-4-3", "3-5-2"];
  const formation = formations[team.name.length % formations.length];
  
  const playersByTeam: Record<string, { startingXI: LineupPlayer[]; substitutes: LineupPlayer[] }> = {
    "arsenal": {
      startingXI: [
        { name: "Raya", number: 22, position: "GK" },
        { name: "White", number: 4, position: "RB" },
        { name: "Saliba", number: 2, position: "CB" },
        { name: "Gabriel", number: 6, position: "CB" },
        { name: "Zinchenko", number: 35, position: "LB" },
        { name: "Rice", number: 41, position: "CDM" },
        { name: "Odegaard", number: 8, position: "CM" },
        { name: "Havertz", number: 29, position: "CM" },
        { name: "Saka", number: 7, position: "RW" },
        { name: "Martinelli", number: 11, position: "LW" },
        { name: "Jesus", number: 9, position: "ST" },
      ],
      substitutes: [
        { name: "Ramsdale", number: 1, position: "GK" },
        { name: "Tomiyasu", number: 18, position: "DEF" },
        { name: "Kiwior", number: 15, position: "DEF" },
        { name: "Jorginho", number: 20, position: "MID" },
        { name: "Trossard", number: 19, position: "FWD" },
      ],
    },
    "liverpool": {
      startingXI: [
        { name: "Alisson", number: 1, position: "GK" },
        { name: "Alexander-Arnold", number: 66, position: "RB" },
        { name: "Konate", number: 5, position: "CB" },
        { name: "Van Dijk", number: 4, position: "CB" },
        { name: "Robertson", number: 26, position: "LB" },
        { name: "Mac Allister", number: 10, position: "CM" },
        { name: "Gravenberch", number: 38, position: "CM" },
        { name: "Szoboszlai", number: 8, position: "CAM" },
        { name: "Salah", number: 11, position: "RW" },
        { name: "Gakpo", number: 18, position: "LW" },
        { name: "Diaz", number: 7, position: "ST" },
      ],
      substitutes: [
        { name: "Kelleher", number: 62, position: "GK" },
        { name: "Gomez", number: 2, position: "DEF" },
        { name: "Jones", number: 17, position: "MID" },
        { name: "Elliott", number: 19, position: "MID" },
        { name: "Nunez", number: 9, position: "FWD" },
      ],
    },
    "manchester-city": {
      startingXI: [
        { name: "Ederson", number: 31, position: "GK" },
        { name: "Walker", number: 2, position: "RB" },
        { name: "Dias", number: 3, position: "CB" },
        { name: "Akanji", number: 25, position: "CB" },
        { name: "Gvardiol", number: 24, position: "LB" },
        { name: "Rodri", number: 16, position: "CDM" },
        { name: "De Bruyne", number: 17, position: "CM" },
        { name: "Bernardo", number: 20, position: "CM" },
        { name: "Foden", number: 47, position: "RW" },
        { name: "Grealish", number: 10, position: "LW" },
        { name: "Haaland", number: 9, position: "ST" },
      ],
      substitutes: [
        { name: "Ortega", number: 18, position: "GK" },
        { name: "Stones", number: 5, position: "DEF" },
        { name: "Kovacic", number: 8, position: "MID" },
        { name: "Doku", number: 11, position: "FWD" },
        { name: "Alvarez", number: 19, position: "FWD" },
      ],
    },
    "chelsea": {
      startingXI: [
        { name: "Sanchez", number: 1, position: "GK" },
        { name: "James", number: 24, position: "RB" },
        { name: "Fofana", number: 33, position: "CB" },
        { name: "Colwill", number: 26, position: "CB" },
        { name: "Cucurella", number: 3, position: "LB" },
        { name: "Caicedo", number: 25, position: "CDM" },
        { name: "Fernandez", number: 8, position: "CM" },
        { name: "Palmer", number: 20, position: "CAM" },
        { name: "Madueke", number: 11, position: "RW" },
        { name: "Jackson", number: 15, position: "ST" },
        { name: "Mudryk", number: 10, position: "LW" },
      ],
      substitutes: [
        { name: "Petrovic", number: 28, position: "GK" },
        { name: "Disasi", number: 2, position: "DEF" },
        { name: "Gallagher", number: 23, position: "MID" },
        { name: "Sterling", number: 7, position: "FWD" },
        { name: "Nkunku", number: 18, position: "FWD" },
      ],
    },
    "tottenham": {
      startingXI: [
        { name: "Vicario", number: 1, position: "GK" },
        { name: "Porro", number: 23, position: "RB" },
        { name: "Romero", number: 17, position: "CB" },
        { name: "Van de Ven", number: 37, position: "CB" },
        { name: "Udogie", number: 13, position: "LB" },
        { name: "Bentancur", number: 30, position: "CDM" },
        { name: "Bissouma", number: 38, position: "CM" },
        { name: "Maddison", number: 10, position: "CAM" },
        { name: "Kulusevski", number: 21, position: "RW" },
        { name: "Son", number: 7, position: "LW" },
        { name: "Richarlison", number: 9, position: "ST" },
      ],
      substitutes: [
        { name: "Forster", number: 20, position: "GK" },
        { name: "Emerson", number: 12, position: "DEF" },
        { name: "Sarr", number: 29, position: "MID" },
        { name: "Werner", number: 16, position: "FWD" },
        { name: "Johnson", number: 22, position: "FWD" },
      ],
    },
  };
  
  const defaultLineup: { startingXI: LineupPlayer[]; substitutes: LineupPlayer[] } = {
    startingXI: [
      { name: "Goalkeeper", number: 1, position: "GK" },
      { name: "Right Back", number: 2, position: "RB" },
      { name: "Center Back", number: 4, position: "CB" },
      { name: "Center Back", number: 5, position: "CB" },
      { name: "Left Back", number: 3, position: "LB" },
      { name: "Midfielder", number: 6, position: "CDM" },
      { name: "Midfielder", number: 8, position: "CM" },
      { name: "Midfielder", number: 10, position: "CM" },
      { name: "Right Winger", number: 7, position: "RW" },
      { name: "Left Winger", number: 11, position: "LW" },
      { name: "Striker", number: 9, position: "ST" },
    ],
    substitutes: [
      { name: "Sub Keeper", number: 12, position: "GK" },
      { name: "Sub Defender", number: 14, position: "DEF" },
      { name: "Sub Midfielder", number: 15, position: "MID" },
      { name: "Sub Forward", number: 17, position: "FWD" },
      { name: "Sub Forward", number: 18, position: "FWD" },
    ],
  };
  
  const lineup = playersByTeam[team.slug] || defaultLineup;
  
  return { formation, ...lineup };
}

type FormationSlot = {
  id: string;
  role: string;
  home: { x: number; y: number };
  away: { x: number; y: number };
};

const formationTemplates: Record<string, FormationSlot[]> = {
  "4-3-3": [
    { id: "GK", role: "GK", home: { x: 50, y: 8 }, away: { x: 50, y: 92 } },
    { id: "LB", role: "DEF", home: { x: 15, y: 24 }, away: { x: 85, y: 76 } },
    { id: "LCB", role: "DEF", home: { x: 35, y: 24 }, away: { x: 65, y: 76 } },
    { id: "RCB", role: "DEF", home: { x: 65, y: 24 }, away: { x: 35, y: 76 } },
    { id: "RB", role: "DEF", home: { x: 85, y: 24 }, away: { x: 15, y: 76 } },
    { id: "LCM", role: "MID", home: { x: 25, y: 42 }, away: { x: 75, y: 58 } },
    { id: "CM", role: "MID", home: { x: 50, y: 38 }, away: { x: 50, y: 62 } },
    { id: "RCM", role: "MID", home: { x: 75, y: 42 }, away: { x: 25, y: 58 } },
    { id: "LW", role: "FWD", home: { x: 20, y: 58 }, away: { x: 80, y: 42 } },
    { id: "ST", role: "FWD", home: { x: 50, y: 62 }, away: { x: 50, y: 38 } },
    { id: "RW", role: "FWD", home: { x: 80, y: 58 }, away: { x: 20, y: 42 } },
  ],
  "4-2-3-1": [
    { id: "GK", role: "GK", home: { x: 50, y: 8 }, away: { x: 50, y: 92 } },
    { id: "LB", role: "DEF", home: { x: 15, y: 22 }, away: { x: 85, y: 78 } },
    { id: "LCB", role: "DEF", home: { x: 35, y: 22 }, away: { x: 65, y: 78 } },
    { id: "RCB", role: "DEF", home: { x: 65, y: 22 }, away: { x: 35, y: 78 } },
    { id: "RB", role: "DEF", home: { x: 85, y: 22 }, away: { x: 15, y: 78 } },
    { id: "LDM", role: "MID", home: { x: 35, y: 34 }, away: { x: 65, y: 66 } },
    { id: "RDM", role: "MID", home: { x: 65, y: 34 }, away: { x: 35, y: 66 } },
    { id: "LAM", role: "MID", home: { x: 20, y: 48 }, away: { x: 80, y: 52 } },
    { id: "CAM", role: "MID", home: { x: 50, y: 46 }, away: { x: 50, y: 54 } },
    { id: "RAM", role: "MID", home: { x: 80, y: 48 }, away: { x: 20, y: 52 } },
    { id: "ST", role: "FWD", home: { x: 50, y: 62 }, away: { x: 50, y: 38 } },
  ],
  "3-5-2": [
    { id: "GK", role: "GK", home: { x: 50, y: 8 }, away: { x: 50, y: 92 } },
    { id: "LCB", role: "DEF", home: { x: 25, y: 22 }, away: { x: 75, y: 78 } },
    { id: "CB", role: "DEF", home: { x: 50, y: 22 }, away: { x: 50, y: 78 } },
    { id: "RCB", role: "DEF", home: { x: 75, y: 22 }, away: { x: 25, y: 78 } },
    { id: "LWB", role: "MID", home: { x: 10, y: 38 }, away: { x: 90, y: 62 } },
    { id: "LCM", role: "MID", home: { x: 30, y: 42 }, away: { x: 70, y: 58 } },
    { id: "CM", role: "MID", home: { x: 50, y: 38 }, away: { x: 50, y: 62 } },
    { id: "RCM", role: "MID", home: { x: 70, y: 42 }, away: { x: 30, y: 58 } },
    { id: "RWB", role: "MID", home: { x: 90, y: 38 }, away: { x: 10, y: 62 } },
    { id: "LST", role: "FWD", home: { x: 35, y: 58 }, away: { x: 65, y: 42 } },
    { id: "RST", role: "FWD", home: { x: 65, y: 58 }, away: { x: 35, y: 42 } },
  ],
  "4-4-2": [
    { id: "GK", role: "GK", home: { x: 50, y: 8 }, away: { x: 50, y: 92 } },
    { id: "LB", role: "DEF", home: { x: 15, y: 24 }, away: { x: 85, y: 76 } },
    { id: "LCB", role: "DEF", home: { x: 35, y: 24 }, away: { x: 65, y: 76 } },
    { id: "RCB", role: "DEF", home: { x: 65, y: 24 }, away: { x: 35, y: 76 } },
    { id: "RB", role: "DEF", home: { x: 85, y: 24 }, away: { x: 15, y: 76 } },
    { id: "LM", role: "MID", home: { x: 15, y: 42 }, away: { x: 85, y: 58 } },
    { id: "LCM", role: "MID", home: { x: 35, y: 42 }, away: { x: 65, y: 58 } },
    { id: "RCM", role: "MID", home: { x: 65, y: 42 }, away: { x: 35, y: 58 } },
    { id: "RM", role: "MID", home: { x: 85, y: 42 }, away: { x: 15, y: 58 } },
    { id: "LST", role: "FWD", home: { x: 35, y: 58 }, away: { x: 65, y: 42 } },
    { id: "RST", role: "FWD", home: { x: 65, y: 58 }, away: { x: 35, y: 42 } },
  ],
  "3-4-3": [
    { id: "GK", role: "GK", home: { x: 50, y: 8 }, away: { x: 50, y: 92 } },
    { id: "LCB", role: "DEF", home: { x: 25, y: 22 }, away: { x: 75, y: 78 } },
    { id: "CB", role: "DEF", home: { x: 50, y: 22 }, away: { x: 50, y: 78 } },
    { id: "RCB", role: "DEF", home: { x: 75, y: 22 }, away: { x: 25, y: 78 } },
    { id: "LM", role: "MID", home: { x: 15, y: 40 }, away: { x: 85, y: 60 } },
    { id: "LCM", role: "MID", home: { x: 35, y: 40 }, away: { x: 65, y: 60 } },
    { id: "RCM", role: "MID", home: { x: 65, y: 40 }, away: { x: 35, y: 60 } },
    { id: "RM", role: "MID", home: { x: 85, y: 40 }, away: { x: 15, y: 60 } },
    { id: "LW", role: "FWD", home: { x: 20, y: 58 }, away: { x: 80, y: 42 } },
    { id: "ST", role: "FWD", home: { x: 50, y: 62 }, away: { x: 50, y: 38 } },
    { id: "RW", role: "FWD", home: { x: 80, y: 58 }, away: { x: 20, y: 42 } },
  ],
};

function getFormationTemplate(formation: string): FormationSlot[] {
  return formationTemplates[formation] || formationTemplates["4-3-3"];
}

const positionNormalization: Record<string, { slotId: string; role: string }> = {
  "GK": { slotId: "GK", role: "GK" },
  "RB": { slotId: "RB", role: "DEF" },
  "LB": { slotId: "LB", role: "DEF" },
  "CB": { slotId: "CB", role: "DEF" },
  "RCB": { slotId: "RCB", role: "DEF" },
  "LCB": { slotId: "LCB", role: "DEF" },
  "RWB": { slotId: "RWB", role: "DEF" },
  "LWB": { slotId: "LWB", role: "DEF" },
  "DEF": { slotId: "CB", role: "DEF" },
  "CM": { slotId: "CM", role: "MID" },
  "CDM": { slotId: "CM", role: "MID" },
  "CAM": { slotId: "CAM", role: "MID" },
  "DM": { slotId: "CM", role: "MID" },
  "AM": { slotId: "CAM", role: "MID" },
  "LM": { slotId: "LM", role: "MID" },
  "RM": { slotId: "RM", role: "MID" },
  "LCM": { slotId: "LCM", role: "MID" },
  "RCM": { slotId: "RCM", role: "MID" },
  "MID": { slotId: "CM", role: "MID" },
  "ST": { slotId: "ST", role: "FWD" },
  "CF": { slotId: "ST", role: "FWD" },
  "LW": { slotId: "LW", role: "FWD" },
  "RW": { slotId: "RW", role: "FWD" },
  "LST": { slotId: "LST", role: "FWD" },
  "RST": { slotId: "RST", role: "FWD" },
  "FWD": { slotId: "ST", role: "FWD" },
  "ATT": { slotId: "ST", role: "FWD" },
};

function normalizePlayerPosition(pos: string | undefined): { slotId: string; role: string } {
  if (!pos) return { slotId: "CM", role: "MID" };
  const norm = positionNormalization[pos.toUpperCase()];
  return norm || { slotId: "CM", role: "MID" };
}

function assignPlayersToSlots(
  lineup: LineupData,
  isHome: boolean
): { player: LineupPlayer | null; slotId: string; x: number; y: number }[] {
  const template = getFormationTemplate(lineup.formation);
  const players = [...lineup.startingXI];
  const assigned: { player: LineupPlayer | null; slotId: string; x: number; y: number }[] = [];
  const usedPlayers = new Set<number>();
  
  template.forEach((slot) => {
    const coords = isHome ? slot.home : slot.away;
    
    let bestPlayer: LineupPlayer | null = null;
    let bestIdx = -1;
    
    for (let i = 0; i < players.length; i++) {
      if (usedPlayers.has(i)) continue;
      const p = players[i];
      if (!p) continue;
      
      const { slotId: playerSlotId } = normalizePlayerPosition(p.position);
      
      if (slot.id === playerSlotId) {
        bestPlayer = p;
        bestIdx = i;
        break;
      }
    }
    
    if (!bestPlayer) {
      for (let i = 0; i < players.length; i++) {
        if (usedPlayers.has(i)) continue;
        const p = players[i];
        if (!p) continue;
        
        const { role: playerRole } = normalizePlayerPosition(p.position);
        
        if (slot.role === playerRole) {
          bestPlayer = p;
          bestIdx = i;
          break;
        }
      }
    }
    
    if (!bestPlayer) {
      for (let i = 0; i < players.length; i++) {
        if (usedPlayers.has(i)) continue;
        const p = players[i];
        if (p) {
          bestPlayer = p;
          bestIdx = i;
          break;
        }
      }
    }
    
    if (bestIdx >= 0) {
      usedPlayers.add(bestIdx);
    }
    
    assigned.push({
      player: bestPlayer,
      slotId: slot.id,
      x: coords.x,
      y: coords.y,
    });
  });
  
  return assigned;
}

function getFormationRows(formation: string): number[] {
  const formationMap: Record<string, number[]> = {
    "4-3-3": [1, 4, 3, 3],
    "4-2-3-1": [1, 4, 2, 3, 1],
    "3-4-3": [1, 3, 4, 3],
    "3-5-2": [1, 3, 5, 2],
    "4-4-2": [1, 4, 4, 2],
    "5-3-2": [1, 5, 3, 2],
    "4-1-4-1": [1, 4, 1, 4, 1],
  };
  return formationMap[formation] || [1, 4, 3, 3];
}

function getPlayerInitials(name: string): string {
  if (!name) return "??";
  const parts = name.split(" ");
  if (parts.length === 1) {
    return name.slice(0, 2).toUpperCase();
  }
  return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
}

function getTeamPositions(
  lineup: LineupData, 
  isHome: boolean
): { player: typeof lineup.startingXI[0]; x: number; y: number }[] {
  const rows = getFormationRows(lineup.formation);
  const positions: { player: typeof lineup.startingXI[0]; x: number; y: number }[] = [];
  let playerIndex = 0;
  
  // Fixed row bands for consistent positioning (user-specified values)
  // Home team (top half): GK=12%, DEF=26%, MID=42%, ATT=58%
  // Away team (bottom half): ATT=42%, MID=58%, DEF=74%, GK=88%
  const homeRowBands = [12, 26, 42, 58]; // GK, DEF, MID, ATT
  const awayRowBands = [88, 74, 58, 42]; // GK, DEF, MID, ATT
  
  // Get Y position based on row index and formation structure
  const getYPosition = (rowIdx: number, totalRows: number): number => {
    const bands = isHome ? homeRowBands : awayRowBands;
    
    if (totalRows === 4) {
      // Standard 4-row formation (GK + DEF + MID + ATT)
      return bands[rowIdx] ?? bands[bands.length - 1];
    } else if (totalRows === 5) {
      // 5-row formation (e.g., 4-2-3-1): interpolate middle rows
      const fiveRowBands = isHome 
        ? [12, 26, 34, 42, 58]   // GK, DEF, DM, AM, ATT
        : [88, 74, 66, 58, 42]; // GK, DEF, DM, AM, ATT
      return fiveRowBands[rowIdx] ?? fiveRowBands[fiveRowBands.length - 1];
    } else {
      // Fallback: interpolate between first and last band
      if (rowIdx === 0) return bands[0];
      const lastBand = bands[bands.length - 1];
      const firstOutfield = bands[1];
      return firstOutfield + ((rowIdx - 1) * (lastBand - firstOutfield) / (totalRows - 2 || 1));
    }
  };
  
  // X positioning: evenly distributed between 15% and 85%
  const xMin = 15;
  const xMax = 85;
  
  rows.forEach((count, rowIdx) => {
    const yBase = getYPosition(rowIdx, rows.length);
    
    for (let i = 0; i < count; i++) {
      const player = lineup.startingXI[playerIndex++];
      // X position: evenly space players between xMin and xMax
      const x = count === 1 
        ? 50 
        : xMin + (i * (xMax - xMin) / (count - 1));
      
      positions.push({ player, x, y: yBase });
    }
  });
  
  return positions;
}

function BroadcastPlayerMarker({ 
  player, 
  teamColor, 
  x, 
  y,
  headshot
}: { 
  player: { name: string; number: number | null; position?: string } | null | undefined;
  teamColor: string;
  x: number;
  y: number;
  headshot?: string;
}) {
  const lastName = player?.name?.split(" ").pop() || "TBC";
  const number = player?.number ?? 0;
  const hasHeadshot = !!headshot;
  
  return (
    <div 
      className="absolute flex flex-col items-center"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)"
      }}
    >
      {/* Headshot circle or fallback with team color + number */}
      <div className="relative">
        {hasHeadshot ? (
          <img 
            src={headshot} 
            alt={lastName}
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover shadow-lg border-2 border-white/50"
          />
        ) : (
          <div 
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50 text-white text-xs sm:text-sm font-bold"
            style={{ backgroundColor: teamColor }}
          >
            {number || "?"}
          </div>
        )}
        {/* Number pill - positioned at bottom-right (only if headshot exists) */}
        {hasHeadshot && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-gray-900/90 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-md">
            {number}
          </div>
        )}
      </div>
      {/* Player name label */}
      <div className="mt-1 bg-gray-900/85 text-white text-[8px] sm:text-[9px] font-medium px-2 py-0.5 rounded-md shadow-md max-w-[60px] sm:max-w-[70px] truncate text-center">
        {lastName}
      </div>
    </div>
  );
}

function BroadcastPitch({ 
  homeLineup, 
  awayLineup,
  homeColor,
  awayColor,
  className = ""
}: { 
  homeLineup: LineupData; 
  awayLineup: LineupData;
  homeColor: string;
  awayColor: string;
  className?: string;
}) {
  const homeSlots = assignPlayersToSlots(homeLineup, true);
  const awaySlots = assignPlayersToSlots(awayLineup, false);
  
  return (
    <div 
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{ 
        background: `linear-gradient(180deg, #2d5a27 0%, #1e4a1c 50%, #2d5a27 100%)`
      }}
    >
      {/* Professional pitch markings */}
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        style={{ opacity: 0.4 }}
      >
        {/* Pitch outline */}
        <rect x="2" y="2" width="96" height="96" fill="none" stroke="white" strokeWidth="0.3" />
        
        {/* Top half (Home goal at top) */}
        <rect x="25" y="2" width="50" height="14" fill="none" stroke="white" strokeWidth="0.3" />
        <rect x="37" y="2" width="26" height="5" fill="none" stroke="white" strokeWidth="0.3" />
        <circle cx="50" cy="10" r="0.5" fill="white" />
        <path d="M 37 16 A 8 8 0 0 0 63 16" fill="none" stroke="white" strokeWidth="0.3" />
        
        {/* Halfway line and centre circle */}
        <line x1="2" y1="50" x2="98" y2="50" stroke="white" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="8" fill="none" stroke="white" strokeWidth="0.3" />
        <circle cx="50" cy="50" r="0.4" fill="white" />
        
        {/* Bottom half (Away goal at bottom) */}
        <rect x="25" y="84" width="50" height="14" fill="none" stroke="white" strokeWidth="0.3" />
        <rect x="37" y="93" width="26" height="5" fill="none" stroke="white" strokeWidth="0.3" />
        <circle cx="50" cy="90" r="0.5" fill="white" />
        <path d="M 37 84 A 8 8 0 0 1 63 84" fill="none" stroke="white" strokeWidth="0.3" />
      </svg>
      
      {/* Player markers - broadcast style with role-based positioning */}
      <div className="absolute inset-0">
        {homeSlots.map((slot, idx) => (
          <BroadcastPlayerMarker
            key={`home-${slot.slotId}-${idx}`}
            player={slot.player}
            teamColor={homeColor}
            x={slot.x}
            y={slot.y}
          />
        ))}
        
        {awaySlots.map((slot, idx) => (
          <BroadcastPlayerMarker
            key={`away-${slot.slotId}-${idx}`}
            player={slot.player}
            teamColor={awayColor}
            x={slot.x}
            y={slot.y}
          />
        ))}
      </div>
    </div>
  );
}

function FullPitchFormation({ 
  homeLineup, 
  awayLineup,
  homeColor,
  awayColor,
  className = ""
}: { 
  homeLineup: LineupData; 
  awayLineup: LineupData;
  homeColor: string;
  awayColor: string;
  className?: string;
}) {
  return (
    <BroadcastPitch
      homeLineup={homeLineup}
      awayLineup={awayLineup}
      homeColor={homeColor}
      awayColor={awayColor}
      className={className}
    />
  );
}

function generateKeyAbsences(team: MatchTeam): { player: string; reason: string; status: "out" | "doubt" }[] {
  const absencePool = [
    { player: "Timber", reason: "ACL injury", status: "out" as const },
    { player: "Tomiyasu", reason: "Knee injury", status: "out" as const },
    { player: "Partey", reason: "Hamstring", status: "doubt" as const },
    { player: "Jota", reason: "Muscle injury", status: "out" as const },
    { player: "Elliott", reason: "Ankle", status: "doubt" as const },
    { player: "Stones", reason: "Hamstring", status: "out" as const },
    { player: "Phillips", reason: "Muscle injury", status: "doubt" as const },
  ];
  
  const seed = team.name.length * 3;
  return absencePool.slice(seed % 3, (seed % 3) + 2);
}

function TeamCrest({ team, size = "lg" }: { team: MatchTeam; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-20 h-20 text-xl",
  };
  
  return (
    <div 
      className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold shrink-0`}
      style={{ backgroundColor: team.primaryColor, color: "#fff" }}
      title={team.name}
    >
      {team.shortName.slice(0, 3)}
    </div>
  );
}

function StatusBadge({ match }: { match: MatchData }) {
  const now = new Date();
  const kickoff = new Date(match.kickoffTime);
  const isToday = kickoff.toDateString() === now.toDateString();
  
  if (match.status === "finished") {
    return <Badge variant="secondary" data-testid="badge-status-ft">FT</Badge>;
  }
  if (match.status === "live") {
    return <Badge className="bg-red-500 text-white border-0 animate-pulse" data-testid="badge-status-live">LIVE</Badge>;
  }
  if (match.status === "postponed") {
    return <Badge variant="outline" className="border-amber-500 text-amber-600" data-testid="badge-status-ppd">Postponed</Badge>;
  }
  if (isToday) {
    return <Badge className="bg-green-600 text-white border-0" data-testid="badge-status-today">Today</Badge>;
  }
  return null;
}

function MatchHeader({ match }: { match: MatchData }) {
  const isFinished = match.status === "finished";
  const kickoff = new Date(match.kickoffTime);
  
  return (
    <div className="bg-card border-b" data-testid="match-header">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
          <Badge variant="outline" data-testid="badge-competition">{match.competition}</Badge>
          {match.round && <Badge variant="secondary" data-testid="badge-round">{match.round}</Badge>}
          <StatusBadge match={match} />
        </div>
        
        <div className="grid grid-cols-3 items-center gap-4">
          <Link href={`/teams/${match.homeTeam.slug}`}>
            <div className="flex flex-col items-center group cursor-pointer h-[120px] justify-center" data-testid="home-team-link">
              <TeamCrest team={match.homeTeam} size="xl" />
              <p className="font-semibold mt-3 text-sm sm:text-base group-hover:text-primary transition-colors text-center line-clamp-2">
                {match.homeTeam.name}
              </p>
            </div>
          </Link>
          
          <div className="flex items-center justify-center h-[120px]">
            {isFinished ? (
              <div className="text-4xl sm:text-5xl font-bold tabular-nums" data-testid="match-score">
                {match.homeScore ?? 0} - {match.awayScore ?? 0}
              </div>
            ) : (
              <p className="text-2xl sm:text-3xl font-semibold text-muted-foreground" data-testid="kickoff-time">
                {format(kickoff, "HH:mm")}
              </p>
            )}
          </div>
          
          <Link href={`/teams/${match.awayTeam.slug}`}>
            <div className="flex flex-col items-center group cursor-pointer h-[120px] justify-center" data-testid="away-team-link">
              <TeamCrest team={match.awayTeam} size="xl" />
              <p className="font-semibold mt-3 text-sm sm:text-base group-hover:text-primary transition-colors text-center line-clamp-2">
                {match.awayTeam.name}
              </p>
            </div>
          </Link>
        </div>
        
        <div className="flex flex-col items-center gap-1.5 mt-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(kickoff, "EEEE d MMMM yyyy")}
          </span>
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {match.venue || "TBD"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PreMatchNarrative({ match }: { match: MatchData }) {
  const narratives: Record<string, string> = {
    "arsenal": `${match.homeTeam.name} will be looking to continue their title charge as they welcome ${match.awayTeam.name} to ${match.venue}. With the race for the Premier League tighter than ever, three points here could prove crucial in the hunt for silverware.`,
    "default": `A crucial ${match.competition} clash awaits as ${match.homeTeam.name} host ${match.awayTeam.name}. Both sides will be eager to secure all three points with plenty at stake at this stage of the season.`,
  };
  
  const narrative = narratives[match.homeTeam.slug] || narratives["default"];
  
  return (
    <Card data-testid="pre-match-narrative">
      <CardContent className="pt-4">
        <p className="text-muted-foreground leading-relaxed">{narrative}</p>
      </CardContent>
    </Card>
  );
}

function PostMatchSummary({ match }: { match: MatchData }) {
  const homeScore = match.homeScore ?? 0;
  const awayScore = match.awayScore ?? 0;
  
  let outcome = "shared the spoils in";
  if (homeScore > awayScore) outcome = `secured a ${homeScore}-${awayScore} victory in`;
  if (awayScore > homeScore) outcome = `suffered a ${homeScore}-${awayScore} defeat in`;
  
  const summary = `${match.homeTeam.name} ${outcome} an entertaining ${match.competition} encounter at ${match.venue}. The result leaves both sides with plenty to reflect on as the season progresses.`;
  
  return (
    <Card data-testid="post-match-summary">
      <CardContent className="pt-4">
        <p className="text-muted-foreground leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}

function TeamXIColumn({ 
  team, 
  lineup,
  align = "left"
}: { 
  team: MatchTeam; 
  lineup: LineupData;
  align?: "left" | "right";
}) {
  const isRight = align === "right";
  
  return (
    <div className={isRight ? "text-right" : ""}>
      {/* Team header */}
      <div className={`flex items-center gap-2 mb-2 ${isRight ? "flex-row-reverse" : ""}`}>
        <TeamCrest team={team} size="sm" />
        <div className={isRight ? "text-right" : ""}>
          <p className="font-semibold text-sm">{team.name}</p>
          <div className={isRight ? "flex justify-end" : ""}>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {lineup.formation}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Starting XI list - natural height defines column */}
      <div className="space-y-1">
        {lineup.startingXI.map((player, idx) => (
          <div 
            key={idx} 
            className={`flex items-baseline gap-3 text-sm w-full ${isRight ? "justify-end" : ""}`}
          >
            {isRight ? (
              <>
                <span className="truncate text-right">
                  {player?.name || "TBC"}
                </span>
                <span className="w-6 text-right tabular-nums text-xs text-muted-foreground font-medium shrink-0">
                  {player?.number ?? idx + 1}
                </span>
              </>
            ) : (
              <>
                <span className="w-6 text-left tabular-nums text-xs text-muted-foreground font-medium shrink-0">
                  {player?.number ?? idx + 1}
                </span>
                <span className="truncate">
                  {player?.name || "TBC"}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      
      {/* Substitutes - tight spacing below XI */}
      {lineup.substitutes && lineup.substitutes.length > 0 && (
        <div className={`mt-3 pt-2 border-t border-border/50 text-xs text-muted-foreground ${isRight ? "text-right" : ""}`}>
          <p className="font-medium mb-0.5">Substitutes</p>
          <p className="leading-relaxed">
            {lineup.substitutes.map(s => s?.name || "TBC").join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}

function PredictedXI({ match }: { match: MatchData }) {
  const homeXI = generatePredictedXI(match.homeTeam);
  const awayXI = generatePredictedXI(match.awayTeam);
  
  return (
    <Card data-testid="predicted-xi" className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          Predicted Lineups
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop 3-column layout (>= lg): Home List | Full Pitch | Away List */}
        {/* Pitch drives section height; lists scroll within bounds */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(140px,180px)_minmax(0,1fr)_minmax(140px,180px)] gap-4 items-start">
          {/* Home team column - scrollable within max height */}
          <div className="max-h-[520px] overflow-y-auto">
            <TeamXIColumn team={match.homeTeam} lineup={homeXI} align="left" />
          </div>
          
          {/* Pitch column - drives section height via aspect ratio */}
          <div className="flex items-center justify-center">
            <div className="w-full max-w-[300px] aspect-[3/5]">
              <BroadcastPitch
                homeLineup={homeXI}
                awayLineup={awayXI}
                homeColor={match.homeTeam.primaryColor}
                awayColor={match.awayTeam.primaryColor}
                className="w-full h-full"
              />
            </div>
          </div>
          
          {/* Away team column - scrollable within max height */}
          <div className="max-h-[520px] overflow-y-auto">
            <TeamXIColumn team={match.awayTeam} lineup={awayXI} align="right" />
          </div>
        </div>
        
        {/* Mobile layout (< lg): XI lists side-by-side above pitch */}
        <div className="lg:hidden space-y-4">
          {/* Combined match sheet - side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Home team mini-column */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TeamCrest team={match.homeTeam} size="sm" />
                <div>
                  <p className="font-semibold text-xs">{match.homeTeam.shortName}</p>
                  <Badge variant="secondary" className="text-[9px] px-1">
                    {homeXI.formation}
                  </Badge>
                </div>
              </div>
              <div className="space-y-0.5">
                {homeXI.startingXI.map((player, idx) => (
                  <div key={idx} className="flex items-baseline gap-1 text-xs py-0.5">
                    <span className="w-5 text-left tabular-nums text-[10px] text-muted-foreground font-medium shrink-0">
                      {player?.number ?? idx + 1}
                    </span>
                    <span className="truncate">{player?.name || "TBC"}</span>
                  </div>
                ))}
              </div>
              {homeXI.substitutes && homeXI.substitutes.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-border/50">
                  <p className="text-[9px] font-medium text-muted-foreground mb-0.5">Subs</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    {homeXI.substitutes.map(s => s?.name || "TBC").join(", ")}
                  </p>
                </div>
              )}
            </div>
            
            {/* Away team mini-column */}
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2 flex-row-reverse">
                <TeamCrest team={match.awayTeam} size="sm" />
                <div className="text-right">
                  <p className="font-semibold text-xs">{match.awayTeam.shortName}</p>
                  <div className="flex justify-end">
                    <Badge variant="secondary" className="text-[9px] px-1">
                      {awayXI.formation}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-0.5">
                {awayXI.startingXI.map((player, idx) => (
                  <div key={idx} className="flex items-baseline gap-1 text-xs py-0.5 justify-end">
                    <span className="truncate">{player?.name || "TBC"}</span>
                    <span className="w-5 text-right tabular-nums text-[10px] text-muted-foreground font-medium shrink-0">
                      {player?.number ?? idx + 1}
                    </span>
                  </div>
                ))}
              </div>
              {awayXI.substitutes && awayXI.substitutes.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-border/50">
                  <p className="text-[9px] font-medium text-muted-foreground mb-0.5">Subs</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed">
                    {awayXI.substitutes.map(s => s?.name || "TBC").join(", ")}
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Pitch below with fixed aspect ratio */}
          <div className="flex justify-center">
            <div className="w-full max-w-md aspect-[3/5]">
              <BroadcastPitch
                homeLineup={homeXI}
                awayLineup={awayXI}
                homeColor={match.homeTeam.primaryColor}
                awayColor={match.awayTeam.primaryColor}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InjuriesAndSuspensions({ match }: { match: MatchData }) {
  const homeAbsences = generateKeyAbsences(match.homeTeam);
  const awayAbsences = generateKeyAbsences(match.awayTeam);
  
  if (homeAbsences.length === 0 && awayAbsences.length === 0) return null;
  
  return (
    <Card data-testid="injuries-suspensions">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4" />
          Injuries & Suspensions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-4">
          {homeAbsences.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: match.homeTeam.primaryColor }}>
                {match.homeTeam.name}
              </p>
              <div className="space-y-1.5">
                {homeAbsences.map((absence, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{absence.player}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{absence.reason}</span>
                      <Badge 
                        variant="outline" 
                        className={absence.status === "out" 
                          ? "border-red-500 text-red-600 text-[10px] px-1.5" 
                          : "border-amber-500 text-amber-600 text-[10px] px-1.5"
                        }
                      >
                        {absence.status === "out" ? "OUT" : "DOUBT"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {awayAbsences.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2" style={{ color: match.awayTeam.primaryColor }}>
                {match.awayTeam.name}
              </p>
              <div className="space-y-1.5">
                {awayAbsences.map((absence, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span>{absence.player}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{absence.reason}</span>
                      <Badge 
                        variant="outline" 
                        className={absence.status === "out" 
                          ? "border-red-500 text-red-600 text-[10px] px-1.5" 
                          : "border-amber-500 text-amber-600 text-[10px] px-1.5"
                        }
                      >
                        {absence.status === "out" ? "OUT" : "DOUBT"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function HeadToHeadSection({ match }: { match: MatchData }) {
  const h2h = generateHeadToHead(match);
  
  return (
    <Card data-testid="head-to-head">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Head to Head
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {h2h.slice(0, 5).map((result, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border/50 last:border-0">
              <span className="text-xs text-muted-foreground w-20">
                {format(result.date, "MMM yyyy")}
              </span>
              <div className="flex items-center gap-2 flex-1 justify-center">
                <span className={`font-medium ${result.homeScore > result.awayScore ? "" : "text-muted-foreground"}`}>
                  {result.homeTeam}
                </span>
                <span className="font-bold tabular-nums">
                  {result.homeScore} - {result.awayScore}
                </span>
                <span className={`font-medium ${result.awayScore > result.homeScore ? "" : "text-muted-foreground"}`}>
                  {result.awayTeam}
                </span>
              </div>
              <span className="text-xs text-muted-foreground w-20 text-right">{result.competition}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Timeline({ match }: { match: MatchData }) {
  const moments = generateKeyMoments(match);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const COLLAPSED_LIMIT = 6;
  const shouldCollapse = moments.length > COLLAPSED_LIMIT;
  const displayMoments = shouldCollapse && !isExpanded ? moments.slice(0, COLLAPSED_LIMIT) : moments;
  
  if (moments.length === 0) {
    return (
      <Card data-testid="timeline">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">No key moments recorded</p>
        </CardContent>
      </Card>
    );
  }
  
  const getIcon = (type: KeyMoment["type"]) => {
    switch (type) {
      case "goal": return <Target className="h-4 w-4 text-green-600" />;
      case "red_card": return <div className="w-3 h-4 bg-red-600 rounded-sm" />;
      case "yellow_card": return <div className="w-3 h-4 bg-yellow-500 rounded-sm" />;
      case "penalty": return <Target className="h-4 w-4 text-green-600" />;
      case "halftime":
      case "fulltime": return null;
      default: return <Activity className="h-4 w-4" />;
    }
  };
  
  const renderMoment = (moment: KeyMoment, idx: number) => {
    if (moment.type === "halftime" || moment.type === "fulltime") {
      return (
        <div 
          key={idx} 
          className="flex items-center justify-center py-2 border-y border-border/50 my-2"
        >
          <Badge variant="secondary" className="font-bold">
            {moment.minute} {moment.detail && `(${moment.detail})`}
          </Badge>
        </div>
      );
    }
    
    const isAway = moment.team === "away";
    const minuteDisplay = typeof moment.minute === "number" ? `${moment.minute}'` : moment.minute;
    
    return (
      <div 
        key={idx} 
        className={`flex items-center gap-3 ${isAway ? "flex-row-reverse text-right" : ""}`}
      >
        <div className={`flex items-center gap-2 shrink-0 ${isAway ? "flex-row-reverse" : ""}`}>
          <span className="text-xs font-medium text-muted-foreground w-8 text-center">{minuteDisplay}</span>
          {getIcon(moment.type)}
        </div>
        <div className="flex-1">
          {moment.player && <span className="font-medium text-sm">{moment.player}</span>}
          {moment.detail && (
            <span className="text-xs text-muted-foreground ml-2">({moment.detail})</span>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <Card data-testid="timeline">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4" />
          Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayMoments.map((moment, idx) => renderMoment(moment, idx))}
        </div>
        {shouldCollapse && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-4"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="button-toggle-timeline"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-2" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-2" />
                Show All ({moments.length} events)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function MatchStatsSection({ match }: { match: MatchData }) {
  const stats = generateMatchStats(match);
  
  if (stats.length === 0) return null;
  
  const formatValue = (value: number, formatType?: string) => {
    if (formatType === "percent") return `${value}%`;
    if (formatType === "decimal") return value.toFixed(1);
    return value.toString();
  };
  
  return (
    <Card data-testid="match-stats">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          Match Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, idx) => {
            const total = stat.home + stat.away;
            const homePercent = total > 0 ? (stat.home / total) * 100 : 50;
            
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="font-medium tabular-nums">{formatValue(stat.home, stat.format)}</span>
                  <span className="text-muted-foreground">{stat.label}</span>
                  <span className="font-medium tabular-nums">{formatValue(stat.away, stat.format)}</span>
                </div>
                <div className="flex gap-1 h-2">
                  <div 
                    className="rounded-l-full transition-all"
                    style={{ 
                      width: `${homePercent}%`, 
                      backgroundColor: match.homeTeam.primaryColor 
                    }}
                  />
                  <div 
                    className="rounded-r-full transition-all"
                    style={{ 
                      width: `${100 - homePercent}%`, 
                      backgroundColor: match.awayTeam.primaryColor 
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FormLast5({ match }: { match: MatchData }) {
  const generateForm = (team: MatchTeam): ("W" | "D" | "L")[] => {
    const seed = team.name.length * 7;
    const results: ("W" | "D" | "L")[] = [];
    for (let i = 0; i < 5; i++) {
      const val = (seed + i * 3) % 5;
      if (val < 2) results.push("W");
      else if (val < 3) results.push("D");
      else results.push("L");
    }
    return results;
  };
  
  const homeForm = generateForm(match.homeTeam);
  const awayForm = generateForm(match.awayTeam);
  
  const getFormColor = (result: "W" | "D" | "L") => {
    switch (result) {
      case "W": return "bg-green-600 text-white";
      case "D": return "bg-amber-500 text-white";
      case "L": return "bg-red-600 text-white";
    }
  };
  
  return (
    <Card data-testid="form-last-5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Form (Last 5)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: match.homeTeam.primaryColor }}>
              {match.homeTeam.name}
            </p>
            <div className="flex gap-1">
              {homeForm.map((result, idx) => (
                <div 
                  key={idx}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${getFormColor(result)}`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: match.awayTeam.primaryColor }}>
              {match.awayTeam.name}
            </p>
            <div className="flex gap-1">
              {awayForm.map((result, idx) => (
                <div 
                  key={idx}
                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${getFormColor(result)}`}
                >
                  {result}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopPerformers({ match }: { match: MatchData }) {
  const performers = [
    { name: "Player A", team: match.homeTeam, rating: 8.5, goals: 1, assists: 1 },
    { name: "Player B", team: match.awayTeam, rating: 8.2, goals: 0, assists: 2 },
    { name: "Player C", team: match.homeTeam, rating: 7.9, goals: 1, assists: 0 },
  ];
  
  return (
    <Card data-testid="top-performers">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Star className="h-4 w-4" />
          Top Performers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-3 gap-3">
          {performers.map((player, idx) => (
            <div 
              key={idx}
              className="p-3 rounded-lg border bg-muted/30"
            >
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: player.team.primaryColor }}
                >
                  <User className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-sm">{player.name}</p>
                  <p className="text-xs text-muted-foreground">{player.team.shortName}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rating</span>
                <Badge variant="secondary" className="font-bold">{player.rating.toFixed(1)}</Badge>
              </div>
              {(player.goals > 0 || player.assists > 0) && (
                <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                  {player.goals > 0 && <span>{player.goals}G</span>}
                  {player.assists > 0 && <span>{player.assists}A</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Momentum({ match }: { match: MatchData }) {
  const segments = [
    { start: 0, end: 15, team: "home" as const, intensity: 0.6 },
    { start: 15, end: 30, team: "away" as const, intensity: 0.8 },
    { start: 30, end: 45, team: "home" as const, intensity: 0.5 },
    { start: 45, end: 60, team: "away" as const, intensity: 0.7 },
    { start: 60, end: 75, team: "home" as const, intensity: 0.9 },
    { start: 75, end: 90, team: "home" as const, intensity: 0.4 },
  ];
  
  return (
    <Card data-testid="momentum">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Momentum
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-0.5 h-6 rounded overflow-hidden">
          {segments.map((segment, idx) => (
            <div 
              key={idx}
              className="flex-1 transition-all"
              style={{ 
                backgroundColor: segment.team === "home" ? match.homeTeam.primaryColor : match.awayTeam.primaryColor,
                opacity: segment.intensity
              }}
              title={`${segment.start}'-${segment.end}': ${segment.team === "home" ? match.homeTeam.shortName : match.awayTeam.shortName}`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>0'</span>
          <span>45'</span>
          <span>90'</span>
        </div>
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: match.homeTeam.primaryColor }} />
            <span className="text-xs">{match.homeTeam.shortName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: match.awayTeam.primaryColor }} />
            <span className="text-xs">{match.awayTeam.shortName}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-48 w-full rounded-lg mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </MainLayout>
  );
}

export default function MatchPage() {
  const { slug } = useParams<{ slug: string }>();
  
  const isDummy = useMemo(() => slug ? isDummyMatchId(slug) : false, [slug]);
  
  const { data: apiMatch, isLoading, isError } = useQuery<Match & { homeTeam?: Team; awayTeam?: Team }>({
    queryKey: ["/api/matches", slug],
    enabled: !!slug && !isDummy,
    retry: false,
    throwOnError: false,
  });
  
  const match = useMemo(() => {
    if (!slug) return null;
    
    if (isDummy) {
      return parseDummyMatchId(slug);
    }
    
    if (apiMatch) {
      return apiMatchToMatchData(apiMatch);
    }
    
    return null;
  }, [slug, isDummy, apiMatch]);
  
  if (!isDummy && isLoading) {
    return <LoadingSkeleton />;
  }
  
  if (!isDummy && isError) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Match not found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the match you're looking for.</p>
          <Link href="/matches">
            <Button data-testid="button-back-to-matches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  if (!match) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Match not found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the match you're looking for.</p>
          <Link href="/matches">
            <Button data-testid="button-back-to-matches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Matches
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }
  
  const isPreMatch = match.status === "scheduled" || match.status === "postponed";
  const isPostMatch = match.status === "finished";
  
  const backLink = match.homeTeam.slug ? `/teams/${match.homeTeam.slug}/matches` : "/matches";
  
  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = backLink;
    }
  };
  
  return (
    <MainLayout>
      <div className="mb-4 px-4 pt-4 max-w-7xl mx-auto">
        <Button 
          variant="ghost" 
          size="sm" 
          className="-ml-2" 
          onClick={handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>
      
      <MatchHeader match={match} />
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {isPreMatch && (
            <>
              <PreMatchNarrative match={match} />
              <HeadToHeadSection match={match} />
              <FormLast5 match={match} />
              <InjuriesAndSuspensions match={match} />
              <PredictedXI match={match} />
            </>
          )}
          
          {isPostMatch && (
            <>
              <PostMatchSummary match={match} />
              <MatchStatsSection match={match} />
              <Timeline match={match} />
              <TopPerformers match={match} />
              <Momentum match={match} />
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
