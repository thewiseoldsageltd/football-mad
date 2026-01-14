/**
 * Mock data module for Goalserve-shaped squad and player profile data
 * This can be swapped for real API calls once the Goalserve API key is available
 */

export const USE_GOALSERVE_MOCK = true;

export type GoalservePosition = "G" | "D" | "M" | "A";

export interface GoalserveSquadPlayer {
  id: string;
  name: string;
  position: GoalservePosition;
  number: string;
  isCaptain: 0 | 1;
  minutes: string;
  appearances: string;
  goals: string;
  assists: string;
  yellowcards: string;
  redcards: string;
  rating: string;
  shots_total: string;
  shots_ontarget: string;
  key_passes: string;
  tackles: string;
  saves: string;
  goals_conceded: string;
}

export interface AvailabilityEntry {
  playerId: string;
  status: string;
}

export interface GoalserveSquadData {
  players: GoalserveSquadPlayer[];
  to_miss: AvailabilityEntry[];
  questionable: AvailabilityEntry[];
}

export interface CareerSeasonRow {
  season: string;
  club: string;
  apps: string;
  goals: string;
  assists: string;
  minutes: string;
}

export interface TransferEntry {
  date: string;
  from: string;
  to: string;
  fee: string;
}

export interface SidelinedEntry {
  type: "injury" | "suspension";
  start: string;
  end: string;
  description: string;
}

export interface TrophyEntry {
  competition: string;
  season: string;
}

export interface GoalservePlayerProfile {
  id: string;
  name: string;
  positionText: "Goalkeeper" | "Defender" | "Midfielder" | "Attacker";
  imageBase64: string;
  nationality?: string;
  age?: string;
  height?: string;
  preferredFoot?: string;
  currentClubName?: string;
  currentClubSlug?: string;
  seasonSummary: {
    minutes: string;
    appearances: string;
    goals: string;
    assists: string;
    yellowcards: string;
    redcards: string;
    rating: string;
  };
  careerStatsTabs: {
    domesticLeague: CareerSeasonRow[];
    domesticCups: CareerSeasonRow[];
    intlClubCups: CareerSeasonRow[];
    international: CareerSeasonRow[];
  };
  transfers: TransferEntry[];
  sidelined: SidelinedEntry[];
  trophies: TrophyEntry[];
}

export function slugifyPlayerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

const arsenalSquad: GoalserveSquadPlayer[] = [
  { id: "p1", name: "David Raya", position: "G", number: "22", isCaptain: 0, minutes: "2520", appearances: "28", goals: "0", assists: "0", yellowcards: "1", redcards: "0", rating: "7.2", shots_total: "0", shots_ontarget: "0", key_passes: "2", tackles: "0", saves: "78", goals_conceded: "24" },
  { id: "p2", name: "Aaron Ramsdale", position: "G", number: "1", isCaptain: 0, minutes: "360", appearances: "4", goals: "0", assists: "0", yellowcards: "0", redcards: "0", rating: "6.8", shots_total: "0", shots_ontarget: "0", key_passes: "1", tackles: "0", saves: "12", goals_conceded: "4" },
  { id: "p3", name: "William Saliba", position: "D", number: "2", isCaptain: 0, minutes: "2700", appearances: "30", goals: "2", assists: "1", yellowcards: "4", redcards: "0", rating: "7.4", shots_total: "8", shots_ontarget: "4", key_passes: "12", tackles: "58", saves: "0", goals_conceded: "0" },
  { id: "p4", name: "Gabriel Magalhães", position: "D", number: "6", isCaptain: 0, minutes: "2610", appearances: "29", goals: "4", assists: "0", yellowcards: "6", redcards: "0", rating: "7.3", shots_total: "22", shots_ontarget: "8", key_passes: "8", tackles: "42", saves: "0", goals_conceded: "0" },
  { id: "p5", name: "Ben White", position: "D", number: "4", isCaptain: 0, minutes: "2340", appearances: "26", goals: "0", assists: "4", yellowcards: "3", redcards: "0", rating: "7.1", shots_total: "5", shots_ontarget: "1", key_passes: "28", tackles: "45", saves: "0", goals_conceded: "0" },
  { id: "p6", name: "Jurriën Timber", position: "D", number: "12", isCaptain: 0, minutes: "1800", appearances: "20", goals: "1", assists: "2", yellowcards: "2", redcards: "0", rating: "7.0", shots_total: "6", shots_ontarget: "2", key_passes: "18", tackles: "38", saves: "0", goals_conceded: "0" },
  { id: "p7", name: "Takehiro Tomiyasu", position: "D", number: "18", isCaptain: 0, minutes: "720", appearances: "8", goals: "0", assists: "0", yellowcards: "1", redcards: "0", rating: "6.7", shots_total: "1", shots_ontarget: "0", key_passes: "4", tackles: "12", saves: "0", goals_conceded: "0" },
  { id: "p8", name: "Oleksandr Zinchenko", position: "D", number: "35", isCaptain: 0, minutes: "900", appearances: "10", goals: "0", assists: "2", yellowcards: "1", redcards: "0", rating: "6.9", shots_total: "3", shots_ontarget: "1", key_passes: "22", tackles: "14", saves: "0", goals_conceded: "0" },
  { id: "p9", name: "Martin Ødegaard", position: "M", number: "8", isCaptain: 1, minutes: "2430", appearances: "27", goals: "8", assists: "10", yellowcards: "2", redcards: "0", rating: "7.8", shots_total: "45", shots_ontarget: "18", key_passes: "78", tackles: "28", saves: "0", goals_conceded: "0" },
  { id: "p10", name: "Declan Rice", position: "M", number: "41", isCaptain: 0, minutes: "2700", appearances: "30", goals: "6", assists: "8", yellowcards: "8", redcards: "0", rating: "7.5", shots_total: "32", shots_ontarget: "12", key_passes: "52", tackles: "85", saves: "0", goals_conceded: "0" },
  { id: "p11", name: "Thomas Partey", position: "M", number: "5", isCaptain: 0, minutes: "1620", appearances: "18", goals: "1", assists: "2", yellowcards: "4", redcards: "0", rating: "7.0", shots_total: "12", shots_ontarget: "4", key_passes: "24", tackles: "48", saves: "0", goals_conceded: "0" },
  { id: "p12", name: "Jorginho", position: "M", number: "20", isCaptain: 0, minutes: "1080", appearances: "12", goals: "0", assists: "1", yellowcards: "3", redcards: "0", rating: "6.8", shots_total: "4", shots_ontarget: "1", key_passes: "18", tackles: "22", saves: "0", goals_conceded: "0" },
  { id: "p13", name: "Fabio Vieira", position: "M", number: "21", isCaptain: 0, minutes: "450", appearances: "8", goals: "1", assists: "2", yellowcards: "0", redcards: "0", rating: "6.7", shots_total: "8", shots_ontarget: "3", key_passes: "14", tackles: "6", saves: "0", goals_conceded: "0" },
  { id: "p14", name: "Bukayo Saka", position: "A", number: "7", isCaptain: 0, minutes: "2520", appearances: "28", goals: "14", assists: "11", yellowcards: "2", redcards: "0", rating: "7.9", shots_total: "68", shots_ontarget: "32", key_passes: "62", tackles: "24", saves: "0", goals_conceded: "0" },
  { id: "p15", name: "Gabriel Martinelli", position: "A", number: "11", isCaptain: 0, minutes: "2160", appearances: "28", goals: "8", assists: "5", yellowcards: "3", redcards: "0", rating: "7.2", shots_total: "52", shots_ontarget: "22", key_passes: "38", tackles: "18", saves: "0", goals_conceded: "0" },
  { id: "p16", name: "Kai Havertz", position: "A", number: "29", isCaptain: 0, minutes: "2340", appearances: "30", goals: "12", assists: "6", yellowcards: "4", redcards: "0", rating: "7.3", shots_total: "58", shots_ontarget: "28", key_passes: "32", tackles: "22", saves: "0", goals_conceded: "0" },
  { id: "p17", name: "Leandro Trossard", position: "A", number: "19", isCaptain: 0, minutes: "1620", appearances: "26", goals: "10", assists: "4", yellowcards: "2", redcards: "0", rating: "7.1", shots_total: "42", shots_ontarget: "18", key_passes: "28", tackles: "12", saves: "0", goals_conceded: "0" },
  { id: "p18", name: "Gabriel Jesus", position: "A", number: "9", isCaptain: 0, minutes: "720", appearances: "12", goals: "3", assists: "2", yellowcards: "1", redcards: "0", rating: "6.9", shots_total: "24", shots_ontarget: "10", key_passes: "16", tackles: "8", saves: "0", goals_conceded: "0" },
  { id: "p19", name: "Eddie Nketiah", position: "A", number: "14", isCaptain: 0, minutes: "540", appearances: "14", goals: "4", assists: "1", yellowcards: "0", redcards: "0", rating: "6.8", shots_total: "18", shots_ontarget: "8", key_passes: "6", tackles: "4", saves: "0", goals_conceded: "0" },
  { id: "p20", name: "Reiss Nelson", position: "A", number: "24", isCaptain: 0, minutes: "270", appearances: "8", goals: "1", assists: "1", yellowcards: "0", redcards: "0", rating: "6.5", shots_total: "6", shots_ontarget: "2", key_passes: "8", tackles: "2", saves: "0", goals_conceded: "0" },
];

const arsenalToMiss: AvailabilityEntry[] = [
  { playerId: "p7", status: "Knee ligament injury" },
  { playerId: "p18", status: "Groin injury" },
];

const arsenalQuestionable: AvailabilityEntry[] = [
  { playerId: "p11", status: "Hamstring tightness" },
  { playerId: "p8", status: "Calf issue" },
];

const liverpoolSquad: GoalserveSquadPlayer[] = [
  { id: "lp1", name: "Alisson Becker", position: "G", number: "1", isCaptain: 0, minutes: "2700", appearances: "30", goals: "0", assists: "1", yellowcards: "0", redcards: "0", rating: "7.4", shots_total: "0", shots_ontarget: "0", key_passes: "4", tackles: "0", saves: "92", goals_conceded: "28" },
  { id: "lp2", name: "Caoimhin Kelleher", position: "G", number: "62", isCaptain: 0, minutes: "270", appearances: "3", goals: "0", assists: "0", yellowcards: "0", redcards: "0", rating: "6.9", shots_total: "0", shots_ontarget: "0", key_passes: "0", tackles: "0", saves: "8", goals_conceded: "2" },
  { id: "lp3", name: "Virgil van Dijk", position: "D", number: "4", isCaptain: 1, minutes: "2700", appearances: "30", goals: "3", assists: "1", yellowcards: "3", redcards: "0", rating: "7.5", shots_total: "18", shots_ontarget: "8", key_passes: "14", tackles: "42", saves: "0", goals_conceded: "0" },
  { id: "lp4", name: "Trent Alexander-Arnold", position: "D", number: "66", isCaptain: 0, minutes: "2340", appearances: "26", goals: "2", assists: "12", yellowcards: "4", redcards: "0", rating: "7.6", shots_total: "22", shots_ontarget: "8", key_passes: "88", tackles: "32", saves: "0", goals_conceded: "0" },
  { id: "lp5", name: "Andrew Robertson", position: "D", number: "26", isCaptain: 0, minutes: "2160", appearances: "24", goals: "1", assists: "8", yellowcards: "5", redcards: "0", rating: "7.2", shots_total: "8", shots_ontarget: "2", key_passes: "62", tackles: "38", saves: "0", goals_conceded: "0" },
  { id: "lp6", name: "Ibrahima Konaté", position: "D", number: "5", isCaptain: 0, minutes: "1800", appearances: "20", goals: "2", assists: "0", yellowcards: "2", redcards: "0", rating: "7.1", shots_total: "12", shots_ontarget: "4", key_passes: "6", tackles: "35", saves: "0", goals_conceded: "0" },
  { id: "lp7", name: "Joe Gomez", position: "D", number: "2", isCaptain: 0, minutes: "1080", appearances: "14", goals: "0", assists: "1", yellowcards: "1", redcards: "0", rating: "6.9", shots_total: "2", shots_ontarget: "0", key_passes: "8", tackles: "22", saves: "0", goals_conceded: "0" },
  { id: "lp8", name: "Alexis Mac Allister", position: "M", number: "10", isCaptain: 0, minutes: "2520", appearances: "28", goals: "5", assists: "7", yellowcards: "6", redcards: "0", rating: "7.4", shots_total: "28", shots_ontarget: "12", key_passes: "48", tackles: "52", saves: "0", goals_conceded: "0" },
  { id: "lp9", name: "Dominik Szoboszlai", position: "M", number: "8", isCaptain: 0, minutes: "2340", appearances: "28", goals: "6", assists: "5", yellowcards: "4", redcards: "0", rating: "7.2", shots_total: "38", shots_ontarget: "14", key_passes: "42", tackles: "35", saves: "0", goals_conceded: "0" },
  { id: "lp10", name: "Wataru Endo", position: "M", number: "3", isCaptain: 0, minutes: "1440", appearances: "18", goals: "1", assists: "2", yellowcards: "5", redcards: "0", rating: "6.9", shots_total: "8", shots_ontarget: "2", key_passes: "18", tackles: "45", saves: "0", goals_conceded: "0" },
  { id: "lp11", name: "Curtis Jones", position: "M", number: "17", isCaptain: 0, minutes: "1260", appearances: "16", goals: "3", assists: "3", yellowcards: "2", redcards: "0", rating: "7.0", shots_total: "18", shots_ontarget: "6", key_passes: "22", tackles: "28", saves: "0", goals_conceded: "0" },
  { id: "lp12", name: "Ryan Gravenberch", position: "M", number: "38", isCaptain: 0, minutes: "1080", appearances: "14", goals: "2", assists: "2", yellowcards: "1", redcards: "0", rating: "6.8", shots_total: "12", shots_ontarget: "4", key_passes: "16", tackles: "24", saves: "0", goals_conceded: "0" },
  { id: "lp13", name: "Mohamed Salah", position: "A", number: "11", isCaptain: 0, minutes: "2700", appearances: "30", goals: "18", assists: "12", yellowcards: "1", redcards: "0", rating: "8.2", shots_total: "92", shots_ontarget: "42", key_passes: "68", tackles: "14", saves: "0", goals_conceded: "0" },
  { id: "lp14", name: "Luis Díaz", position: "A", number: "7", isCaptain: 0, minutes: "2340", appearances: "28", goals: "12", assists: "6", yellowcards: "2", redcards: "0", rating: "7.5", shots_total: "62", shots_ontarget: "28", key_passes: "42", tackles: "18", saves: "0", goals_conceded: "0" },
  { id: "lp15", name: "Darwin Núñez", position: "A", number: "9", isCaptain: 0, minutes: "1980", appearances: "26", goals: "10", assists: "5", yellowcards: "4", redcards: "1", rating: "7.0", shots_total: "68", shots_ontarget: "28", key_passes: "22", tackles: "12", saves: "0", goals_conceded: "0" },
  { id: "lp16", name: "Diogo Jota", position: "A", number: "20", isCaptain: 0, minutes: "1440", appearances: "18", goals: "8", assists: "3", yellowcards: "2", redcards: "0", rating: "7.2", shots_total: "42", shots_ontarget: "18", key_passes: "18", tackles: "8", saves: "0", goals_conceded: "0" },
  { id: "lp17", name: "Cody Gakpo", position: "A", number: "18", isCaptain: 0, minutes: "1620", appearances: "22", goals: "7", assists: "4", yellowcards: "1", redcards: "0", rating: "7.1", shots_total: "38", shots_ontarget: "16", key_passes: "28", tackles: "10", saves: "0", goals_conceded: "0" },
];

const liverpoolToMiss: AvailabilityEntry[] = [
  { playerId: "lp16", status: "Knee injury" },
];

const liverpoolQuestionable: AvailabilityEntry[] = [
  { playerId: "lp7", status: "Muscle fatigue" },
];

const manchesterCitySquad: GoalserveSquadPlayer[] = [
  { id: "mc1", name: "Ederson", position: "G", number: "31", isCaptain: 0, minutes: "2700", appearances: "30", goals: "0", assists: "0", yellowcards: "1", redcards: "0", rating: "7.3", shots_total: "0", shots_ontarget: "0", key_passes: "6", tackles: "0", saves: "85", goals_conceded: "26" },
  { id: "mc2", name: "Stefan Ortega", position: "G", number: "18", isCaptain: 0, minutes: "270", appearances: "3", goals: "0", assists: "0", yellowcards: "0", redcards: "0", rating: "6.8", shots_total: "0", shots_ontarget: "0", key_passes: "1", tackles: "0", saves: "9", goals_conceded: "3" },
  { id: "mc3", name: "Rúben Dias", position: "D", number: "3", isCaptain: 0, minutes: "2520", appearances: "28", goals: "1", assists: "0", yellowcards: "4", redcards: "0", rating: "7.3", shots_total: "12", shots_ontarget: "4", key_passes: "8", tackles: "45", saves: "0", goals_conceded: "0" },
  { id: "mc4", name: "John Stones", position: "D", number: "5", isCaptain: 0, minutes: "1800", appearances: "20", goals: "2", assists: "1", yellowcards: "2", redcards: "0", rating: "7.2", shots_total: "8", shots_ontarget: "4", key_passes: "12", tackles: "32", saves: "0", goals_conceded: "0" },
  { id: "mc5", name: "Nathan Aké", position: "D", number: "6", isCaptain: 0, minutes: "1620", appearances: "18", goals: "1", assists: "1", yellowcards: "3", redcards: "0", rating: "7.0", shots_total: "6", shots_ontarget: "2", key_passes: "8", tackles: "28", saves: "0", goals_conceded: "0" },
  { id: "mc6", name: "Manuel Akanji", position: "D", number: "25", isCaptain: 0, minutes: "2340", appearances: "26", goals: "0", assists: "2", yellowcards: "2", redcards: "0", rating: "7.1", shots_total: "4", shots_ontarget: "1", key_passes: "10", tackles: "38", saves: "0", goals_conceded: "0" },
  { id: "mc7", name: "Kyle Walker", position: "D", number: "2", isCaptain: 1, minutes: "2160", appearances: "24", goals: "0", assists: "3", yellowcards: "5", redcards: "0", rating: "7.0", shots_total: "8", shots_ontarget: "2", key_passes: "22", tackles: "35", saves: "0", goals_conceded: "0" },
  { id: "mc8", name: "Joško Gvardiol", position: "D", number: "24", isCaptain: 0, minutes: "2520", appearances: "28", goals: "5", assists: "4", yellowcards: "4", redcards: "0", rating: "7.4", shots_total: "18", shots_ontarget: "8", key_passes: "24", tackles: "42", saves: "0", goals_conceded: "0" },
  { id: "mc9", name: "Rodri", position: "M", number: "16", isCaptain: 0, minutes: "2700", appearances: "30", goals: "4", assists: "6", yellowcards: "7", redcards: "0", rating: "7.8", shots_total: "28", shots_ontarget: "12", key_passes: "52", tackles: "72", saves: "0", goals_conceded: "0" },
  { id: "mc10", name: "Kevin De Bruyne", position: "M", number: "17", isCaptain: 0, minutes: "1620", appearances: "18", goals: "4", assists: "10", yellowcards: "1", redcards: "0", rating: "7.9", shots_total: "32", shots_ontarget: "14", key_passes: "68", tackles: "18", saves: "0", goals_conceded: "0" },
  { id: "mc11", name: "Bernardo Silva", position: "M", number: "20", isCaptain: 0, minutes: "2340", appearances: "28", goals: "5", assists: "7", yellowcards: "3", redcards: "0", rating: "7.5", shots_total: "38", shots_ontarget: "16", key_passes: "48", tackles: "32", saves: "0", goals_conceded: "0" },
  { id: "mc12", name: "Mateo Kovačić", position: "M", number: "8", isCaptain: 0, minutes: "1800", appearances: "22", goals: "2", assists: "3", yellowcards: "4", redcards: "0", rating: "7.1", shots_total: "18", shots_ontarget: "6", key_passes: "28", tackles: "38", saves: "0", goals_conceded: "0" },
  { id: "mc13", name: "Phil Foden", position: "A", number: "47", isCaptain: 0, minutes: "2340", appearances: "28", goals: "14", assists: "8", yellowcards: "2", redcards: "0", rating: "7.8", shots_total: "58", shots_ontarget: "28", key_passes: "52", tackles: "16", saves: "0", goals_conceded: "0" },
  { id: "mc14", name: "Erling Haaland", position: "A", number: "9", isCaptain: 0, minutes: "2520", appearances: "28", goals: "24", assists: "5", yellowcards: "2", redcards: "0", rating: "8.0", shots_total: "98", shots_ontarget: "52", key_passes: "18", tackles: "8", saves: "0", goals_conceded: "0" },
  { id: "mc15", name: "Jack Grealish", position: "A", number: "10", isCaptain: 0, minutes: "1260", appearances: "18", goals: "3", assists: "4", yellowcards: "1", redcards: "0", rating: "6.9", shots_total: "22", shots_ontarget: "8", key_passes: "28", tackles: "12", saves: "0", goals_conceded: "0" },
  { id: "mc16", name: "Jeremy Doku", position: "A", number: "11", isCaptain: 0, minutes: "1440", appearances: "20", goals: "4", assists: "8", yellowcards: "1", redcards: "0", rating: "7.2", shots_total: "32", shots_ontarget: "12", key_passes: "42", tackles: "14", saves: "0", goals_conceded: "0" },
  { id: "mc17", name: "Julián Álvarez", position: "A", number: "19", isCaptain: 0, minutes: "1800", appearances: "24", goals: "8", assists: "4", yellowcards: "2", redcards: "0", rating: "7.3", shots_total: "42", shots_ontarget: "18", key_passes: "22", tackles: "10", saves: "0", goals_conceded: "0" },
];

const manchesterCityToMiss: AvailabilityEntry[] = [
  { playerId: "mc10", status: "Hamstring injury" },
];

const manchesterCityQuestionable: AvailabilityEntry[] = [
  { playerId: "mc4", status: "Muscle tightness" },
  { playerId: "mc15", status: "Groin concern" },
];

const squadDataByTeam: Record<string, GoalserveSquadData> = {
  arsenal: {
    players: arsenalSquad,
    to_miss: arsenalToMiss,
    questionable: arsenalQuestionable,
  },
  liverpool: {
    players: liverpoolSquad,
    to_miss: liverpoolToMiss,
    questionable: liverpoolQuestionable,
  },
  "manchester-city": {
    players: manchesterCitySquad,
    to_miss: manchesterCityToMiss,
    questionable: manchesterCityQuestionable,
  },
  "man-city": {
    players: manchesterCitySquad,
    to_miss: manchesterCityToMiss,
    questionable: manchesterCityQuestionable,
  },
};

export function getSquadData(teamSlug: string): GoalserveSquadData | null {
  return squadDataByTeam[teamSlug] || null;
}

const playerProfiles: Record<string, GoalservePlayerProfile> = {
  "bukayo-saka": {
    id: "p14",
    name: "Bukayo Saka",
    positionText: "Attacker",
    imageBase64: "",
    nationality: "England",
    age: "22",
    height: "178cm",
    preferredFoot: "Left",
    currentClubName: "Arsenal",
    currentClubSlug: "arsenal",
    seasonSummary: {
      minutes: "2520",
      appearances: "28",
      goals: "14",
      assists: "11",
      yellowcards: "2",
      redcards: "0",
      rating: "7.9",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Arsenal", apps: "28", goals: "14", assists: "11", minutes: "2520" },
        { season: "2023/24", club: "Arsenal", apps: "35", goals: "16", assists: "9", minutes: "2980" },
        { season: "2022/23", club: "Arsenal", apps: "38", goals: "14", assists: "11", minutes: "3200" },
        { season: "2021/22", club: "Arsenal", apps: "38", goals: "11", assists: "7", minutes: "3100" },
        { season: "2020/21", club: "Arsenal", apps: "32", goals: "5", assists: "4", minutes: "2400" },
      ],
      domesticCups: [
        { season: "2024/25", club: "Arsenal", apps: "4", goals: "2", assists: "1", minutes: "320" },
        { season: "2023/24", club: "Arsenal", apps: "6", goals: "3", assists: "2", minutes: "480" },
      ],
      intlClubCups: [
        { season: "2024/25", club: "Arsenal", apps: "8", goals: "3", assists: "4", minutes: "680" },
        { season: "2023/24", club: "Arsenal", apps: "10", goals: "4", assists: "3", minutes: "850" },
      ],
      international: [
        { season: "2024", club: "England", apps: "12", goals: "3", assists: "4", minutes: "920" },
        { season: "2023", club: "England", apps: "10", goals: "2", assists: "3", minutes: "780" },
        { season: "2022", club: "England", apps: "14", goals: "4", assists: "2", minutes: "1100" },
      ],
    },
    transfers: [
      { date: "2018-09-01", from: "Arsenal Academy", to: "Arsenal", fee: "Youth Graduate" },
    ],
    sidelined: [
      { type: "injury", start: "2024-01-15", end: "2024-02-10", description: "Hamstring strain" },
      { type: "injury", start: "2023-03-20", end: "2023-04-05", description: "Ankle knock" },
    ],
    trophies: [
      { competition: "FA Cup", season: "2019/20" },
      { competition: "Community Shield", season: "2020" },
    ],
  },
  "martin-odegaard": {
    id: "p9",
    name: "Martin Ødegaard",
    positionText: "Midfielder",
    imageBase64: "",
    nationality: "Norway",
    age: "25",
    height: "178cm",
    preferredFoot: "Left",
    currentClubName: "Arsenal",
    currentClubSlug: "arsenal",
    seasonSummary: {
      minutes: "2430",
      appearances: "27",
      goals: "8",
      assists: "10",
      yellowcards: "2",
      redcards: "0",
      rating: "7.8",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Arsenal", apps: "27", goals: "8", assists: "10", minutes: "2430" },
        { season: "2023/24", club: "Arsenal", apps: "35", goals: "11", assists: "8", minutes: "2950" },
        { season: "2022/23", club: "Arsenal", apps: "37", goals: "15", assists: "7", minutes: "3100" },
        { season: "2021/22", club: "Arsenal", apps: "36", goals: "7", assists: "4", minutes: "2850" },
        { season: "2020/21", club: "Arsenal", apps: "14", goals: "2", assists: "2", minutes: "1100" },
        { season: "2019/20", club: "Real Sociedad", apps: "28", goals: "4", assists: "6", minutes: "2200" },
        { season: "2018/19", club: "Vitesse", apps: "32", goals: "7", assists: "9", minutes: "2600" },
      ],
      domesticCups: [
        { season: "2024/25", club: "Arsenal", apps: "3", goals: "1", assists: "2", minutes: "250" },
      ],
      intlClubCups: [
        { season: "2024/25", club: "Arsenal", apps: "6", goals: "2", assists: "3", minutes: "520" },
        { season: "2023/24", club: "Arsenal", apps: "8", goals: "3", assists: "2", minutes: "680" },
      ],
      international: [
        { season: "2024", club: "Norway", apps: "8", goals: "4", assists: "3", minutes: "680" },
        { season: "2023", club: "Norway", apps: "10", goals: "3", assists: "5", minutes: "820" },
      ],
    },
    transfers: [
      { date: "2021-08-20", from: "Real Madrid", to: "Arsenal", fee: "£30m" },
      { date: "2021-01-15", from: "Real Madrid", to: "Arsenal (Loan)", fee: "Loan" },
      { date: "2019-07-01", from: "Real Madrid", to: "Real Sociedad (Loan)", fee: "Loan" },
      { date: "2015-01-22", from: "Strømsgodset", to: "Real Madrid", fee: "£2.3m" },
    ],
    sidelined: [
      { type: "injury", start: "2024-09-02", end: "2024-11-01", description: "Ankle ligament damage" },
    ],
    trophies: [],
  },
  "declan-rice": {
    id: "p10",
    name: "Declan Rice",
    positionText: "Midfielder",
    imageBase64: "",
    nationality: "England",
    age: "25",
    height: "185cm",
    preferredFoot: "Right",
    currentClubName: "Arsenal",
    currentClubSlug: "arsenal",
    seasonSummary: {
      minutes: "2700",
      appearances: "30",
      goals: "6",
      assists: "8",
      yellowcards: "8",
      redcards: "0",
      rating: "7.5",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Arsenal", apps: "30", goals: "6", assists: "8", minutes: "2700" },
        { season: "2023/24", club: "Arsenal", apps: "38", goals: "7", assists: "8", minutes: "3380" },
        { season: "2022/23", club: "West Ham", apps: "37", goals: "3", assists: "4", minutes: "3280" },
        { season: "2021/22", club: "West Ham", apps: "38", goals: "5", assists: "4", minutes: "3400" },
        { season: "2020/21", club: "West Ham", apps: "35", goals: "1", assists: "2", minutes: "3100" },
      ],
      domesticCups: [
        { season: "2024/25", club: "Arsenal", apps: "4", goals: "1", assists: "1", minutes: "360" },
      ],
      intlClubCups: [
        { season: "2024/25", club: "Arsenal", apps: "7", goals: "1", assists: "2", minutes: "620" },
        { season: "2022/23", club: "West Ham", apps: "13", goals: "1", assists: "1", minutes: "1150" },
      ],
      international: [
        { season: "2024", club: "England", apps: "14", goals: "1", assists: "2", minutes: "1200" },
        { season: "2023", club: "England", apps: "10", goals: "0", assists: "1", minutes: "820" },
      ],
    },
    transfers: [
      { date: "2023-07-15", from: "West Ham", to: "Arsenal", fee: "£105m" },
      { date: "2017-07-01", from: "West Ham Academy", to: "West Ham", fee: "Youth Graduate" },
    ],
    sidelined: [],
    trophies: [
      { competition: "UEFA Conference League", season: "2022/23" },
    ],
  },
  "erling-haaland": {
    id: "mc14",
    name: "Erling Haaland",
    positionText: "Attacker",
    imageBase64: "",
    nationality: "Norway",
    age: "24",
    height: "194cm",
    preferredFoot: "Left",
    currentClubName: "Manchester City",
    currentClubSlug: "manchester-city",
    seasonSummary: {
      minutes: "2520",
      appearances: "28",
      goals: "24",
      assists: "5",
      yellowcards: "2",
      redcards: "0",
      rating: "8.0",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Manchester City", apps: "28", goals: "24", assists: "5", minutes: "2520" },
        { season: "2023/24", club: "Manchester City", apps: "31", goals: "27", assists: "5", minutes: "2650" },
        { season: "2022/23", club: "Manchester City", apps: "35", goals: "36", assists: "8", minutes: "2980" },
        { season: "2021/22", club: "Borussia Dortmund", apps: "24", goals: "22", assists: "7", minutes: "1980" },
        { season: "2020/21", club: "Borussia Dortmund", apps: "28", goals: "27", assists: "8", minutes: "2340" },
      ],
      domesticCups: [
        { season: "2024/25", club: "Manchester City", apps: "3", goals: "4", assists: "1", minutes: "250" },
        { season: "2022/23", club: "Manchester City", apps: "4", goals: "6", assists: "0", minutes: "320" },
      ],
      intlClubCups: [
        { season: "2024/25", club: "Manchester City", apps: "6", goals: "5", assists: "1", minutes: "520" },
        { season: "2022/23", club: "Manchester City", apps: "12", goals: "12", assists: "2", minutes: "1020" },
      ],
      international: [
        { season: "2024", club: "Norway", apps: "8", goals: "7", assists: "2", minutes: "680" },
        { season: "2023", club: "Norway", apps: "6", goals: "5", assists: "1", minutes: "510" },
      ],
    },
    transfers: [
      { date: "2022-07-01", from: "Borussia Dortmund", to: "Manchester City", fee: "£51m" },
      { date: "2020-01-01", from: "RB Salzburg", to: "Borussia Dortmund", fee: "£18m" },
      { date: "2019-01-01", from: "Molde", to: "RB Salzburg", fee: "£5m" },
    ],
    sidelined: [
      { type: "injury", start: "2024-12-10", end: "2025-01-15", description: "Foot injury" },
    ],
    trophies: [
      { competition: "Premier League", season: "2022/23" },
      { competition: "Premier League", season: "2023/24" },
      { competition: "UEFA Champions League", season: "2022/23" },
      { competition: "FA Cup", season: "2022/23" },
      { competition: "Bundesliga", season: "2020/21" },
      { competition: "DFB-Pokal", season: "2020/21" },
    ],
  },
  "mohamed-salah": {
    id: "lp13",
    name: "Mohamed Salah",
    positionText: "Attacker",
    imageBase64: "",
    nationality: "Egypt",
    age: "32",
    height: "175cm",
    preferredFoot: "Left",
    currentClubName: "Liverpool",
    currentClubSlug: "liverpool",
    seasonSummary: {
      minutes: "2700",
      appearances: "30",
      goals: "18",
      assists: "12",
      yellowcards: "1",
      redcards: "0",
      rating: "8.2",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Liverpool", apps: "30", goals: "18", assists: "12", minutes: "2700" },
        { season: "2023/24", club: "Liverpool", apps: "32", goals: "18", assists: "10", minutes: "2700" },
        { season: "2022/23", club: "Liverpool", apps: "38", goals: "19", assists: "12", minutes: "3200" },
        { season: "2021/22", club: "Liverpool", apps: "35", goals: "23", assists: "13", minutes: "2950" },
        { season: "2020/21", club: "Liverpool", apps: "37", goals: "22", assists: "5", minutes: "3100" },
        { season: "2019/20", club: "Liverpool", apps: "34", goals: "19", assists: "10", minutes: "2850" },
        { season: "2018/19", club: "Liverpool", apps: "38", goals: "22", assists: "8", minutes: "3200" },
        { season: "2017/18", club: "Liverpool", apps: "36", goals: "32", assists: "10", minutes: "3000" },
      ],
      domesticCups: [
        { season: "2024/25", club: "Liverpool", apps: "3", goals: "2", assists: "1", minutes: "240" },
        { season: "2021/22", club: "Liverpool", apps: "6", goals: "4", assists: "2", minutes: "480" },
      ],
      intlClubCups: [
        { season: "2024/25", club: "Liverpool", apps: "6", goals: "4", assists: "3", minutes: "520" },
        { season: "2021/22", club: "Liverpool", apps: "13", goals: "8", assists: "2", minutes: "1100" },
        { season: "2018/19", club: "Liverpool", apps: "12", goals: "5", assists: "2", minutes: "1020" },
      ],
      international: [
        { season: "2024", club: "Egypt", apps: "6", goals: "3", assists: "2", minutes: "510" },
        { season: "2023", club: "Egypt", apps: "8", goals: "5", assists: "3", minutes: "680" },
      ],
    },
    transfers: [
      { date: "2017-06-22", from: "Roma", to: "Liverpool", fee: "£36.9m" },
      { date: "2016-08-06", from: "Chelsea", to: "Roma", fee: "£12m" },
      { date: "2015-02-02", from: "Chelsea", to: "Fiorentina (Loan)", fee: "Loan" },
      { date: "2014-01-26", from: "Basel", to: "Chelsea", fee: "£11m" },
    ],
    sidelined: [],
    trophies: [
      { competition: "Premier League", season: "2019/20" },
      { competition: "UEFA Champions League", season: "2018/19" },
      { competition: "FA Cup", season: "2021/22" },
      { competition: "EFL Cup", season: "2021/22" },
      { competition: "Club World Cup", season: "2019" },
      { competition: "UEFA Super Cup", season: "2019" },
    ],
  },
  "virgil-van-dijk": {
    id: "lp3",
    name: "Virgil van Dijk",
    positionText: "Defender",
    imageBase64: "",
    nationality: "Netherlands",
    age: "33",
    height: "193cm",
    preferredFoot: "Right",
    currentClubName: "Liverpool",
    currentClubSlug: "liverpool",
    seasonSummary: {
      minutes: "2700",
      appearances: "30",
      goals: "3",
      assists: "1",
      yellowcards: "3",
      redcards: "0",
      rating: "7.5",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Liverpool", apps: "30", goals: "3", assists: "1", minutes: "2700" },
        { season: "2023/24", club: "Liverpool", apps: "33", goals: "2", assists: "2", minutes: "2900" },
        { season: "2022/23", club: "Liverpool", apps: "36", goals: "3", assists: "1", minutes: "3150" },
        { season: "2021/22", club: "Liverpool", apps: "34", goals: "3", assists: "2", minutes: "2950" },
        { season: "2018/19", club: "Liverpool", apps: "38", goals: "4", assists: "2", minutes: "3400" },
        { season: "2017/18", club: "Liverpool", apps: "13", goals: "1", assists: "0", minutes: "1170" },
        { season: "2017/18", club: "Southampton", apps: "11", goals: "1", assists: "0", minutes: "990" },
      ],
      domesticCups: [
        { season: "2021/22", club: "Liverpool", apps: "5", goals: "1", assists: "0", minutes: "420" },
      ],
      intlClubCups: [
        { season: "2024/25", club: "Liverpool", apps: "6", goals: "0", assists: "0", minutes: "540" },
        { season: "2021/22", club: "Liverpool", apps: "13", goals: "1", assists: "1", minutes: "1170" },
        { season: "2018/19", club: "Liverpool", apps: "13", goals: "1", assists: "0", minutes: "1170" },
      ],
      international: [
        { season: "2024", club: "Netherlands", apps: "6", goals: "0", assists: "0", minutes: "540" },
        { season: "2022", club: "Netherlands", apps: "5", goals: "0", assists: "0", minutes: "450" },
      ],
    },
    transfers: [
      { date: "2018-01-01", from: "Southampton", to: "Liverpool", fee: "£75m" },
      { date: "2015-09-01", from: "Celtic", to: "Southampton", fee: "£13m" },
      { date: "2013-06-21", from: "Groningen", to: "Celtic", fee: "£2.6m" },
    ],
    sidelined: [
      { type: "injury", start: "2020-10-17", end: "2021-07-15", description: "ACL injury" },
    ],
    trophies: [
      { competition: "Premier League", season: "2019/20" },
      { competition: "UEFA Champions League", season: "2018/19" },
      { competition: "FA Cup", season: "2021/22" },
      { competition: "EFL Cup", season: "2021/22" },
      { competition: "Club World Cup", season: "2019" },
    ],
  },
  "david-raya": {
    id: "p1",
    name: "David Raya",
    positionText: "Goalkeeper",
    imageBase64: "",
    nationality: "Spain",
    age: "29",
    height: "183cm",
    preferredFoot: "Right",
    currentClubName: "Arsenal",
    currentClubSlug: "arsenal",
    seasonSummary: {
      minutes: "2520",
      appearances: "28",
      goals: "0",
      assists: "0",
      yellowcards: "1",
      redcards: "0",
      rating: "7.2",
    },
    careerStatsTabs: {
      domesticLeague: [
        { season: "2024/25", club: "Arsenal", apps: "28", goals: "0", assists: "0", minutes: "2520" },
        { season: "2023/24", club: "Arsenal", apps: "32", goals: "0", assists: "0", minutes: "2880" },
        { season: "2022/23", club: "Brentford", apps: "38", goals: "0", assists: "0", minutes: "3420" },
        { season: "2021/22", club: "Brentford", apps: "33", goals: "0", assists: "0", minutes: "2970" },
      ],
      domesticCups: [],
      intlClubCups: [
        { season: "2024/25", club: "Arsenal", apps: "6", goals: "0", assists: "0", minutes: "540" },
      ],
      international: [
        { season: "2024", club: "Spain", apps: "4", goals: "0", assists: "0", minutes: "360" },
      ],
    },
    transfers: [
      { date: "2024-07-01", from: "Brentford", to: "Arsenal", fee: "£27m" },
      { date: "2023-08-10", from: "Brentford", to: "Arsenal (Loan)", fee: "Loan" },
      { date: "2019-07-01", from: "Blackburn", to: "Brentford", fee: "£3m" },
    ],
    sidelined: [],
    trophies: [],
  },
};

export function getPlayerProfile(playerSlug: string): GoalservePlayerProfile | null {
  return playerProfiles[playerSlug] || null;
}

export function getPlayerSlugFromSquadPlayer(player: GoalserveSquadPlayer): string {
  return slugifyPlayerName(player.name);
}
