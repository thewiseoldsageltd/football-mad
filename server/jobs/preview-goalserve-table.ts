import type { Request, Response } from "express";
import { goalserveFetch } from "../integrations/goalserve/client";

interface StandingsRow {
  position: string | number;
  teamGoalserveId: string;
  teamName: string;
  played: string | number;
  wins: string | number;
  draws: string | number;
  losses: string | number;
  goalsFor: string | number;
  goalsAgainst: string | number;
  goalDiff: string | number;
  points: string | number;
}

interface FeedAttempt {
  feed: string;
  ok: boolean;
  status?: number;
  error?: string;
  topLevelKeys?: string[];
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function looksLikeSquadsData(data: any): boolean {
  // Check if this looks like squads data: league.team[].squad.player[]
  const teams = data?.league?.team || data?.standings?.league?.team;
  if (!teams) return false;
  const teamArr = toArray(teams);
  if (teamArr.length === 0) return false;
  const firstTeam = teamArr[0];
  // If first team has squad.player and does NOT have points/position/played, it's squads
  if (firstTeam?.squad?.player) {
    const hasStandingsFields = 
      ("pos" in firstTeam || "position" in firstTeam || "@pos" in firstTeam) ||
      ("points" in firstTeam || "pts" in firstTeam || "@points" in firstTeam) ||
      ("played" in firstTeam || "pld" in firstTeam || "@played" in firstTeam);
    if (!hasStandingsFields) return true;
  }
  return false;
}

function extractStandingsRows(data: any): StandingsRow[] | null {
  // Try various possible node paths for standings data from standings feed
  const pathsToTry = [
    // Primary standings feed structure
    () => data?.standings?.team,
    () => data?.standings?.league?.team,
    () => data?.standings?.table?.team,
    () => data?.league?.standings?.team,
    () => data?.league?.table?.team,
    () => data?.table?.team,
    // Direct team array (only if it has standings fields)
    () => {
      const teams = data?.standings?.league?.team || data?.league?.team || data?.team;
      if (!teams) return null;
      const arr = toArray(teams);
      // Make sure it's not squads data
      if (arr.length > 0 && arr[0]?.squad?.player) {
        // Check if it also has standings fields
        const first = arr[0];
        const hasStandingsFields = 
          ("pos" in first || "position" in first || "@pos" in first) ||
          ("points" in first || "pts" in first || "@points" in first);
        if (!hasStandingsFields) return null;
      }
      return arr;
    },
    // Alternative structures
    () => data?.table?.row,
    () => data?.standings?.row,
    () => data?.standings,
  ];

  for (const pathFn of pathsToTry) {
    try {
      const result = pathFn();
      if (result) {
        const arr = toArray(result);
        if (arr.length > 0 && isLikelyStandingsRow(arr[0])) {
          return arr.map(parseStandingsRow);
        }
      }
    } catch {
      // continue to next path
    }
  }

  return null;
}

function isLikelyStandingsRow(obj: any): boolean {
  if (!obj || typeof obj !== "object") return false;
  // Check for common standings fields
  const hasPosition = "pos" in obj || "position" in obj || "@pos" in obj || "@position" in obj;
  const hasPoints = "points" in obj || "@points" in obj || "pts" in obj || "@pts" in obj;
  const hasPlayed = "played" in obj || "@played" in obj || "pld" in obj || "@pld" in obj || "p" in obj || "@p" in obj;
  // Must NOT have squad data without standings fields
  const hasSquad = "squad" in obj;
  if (hasSquad && !hasPosition && !hasPoints && !hasPlayed) return false;
  return hasPosition || (hasPoints && hasPlayed);
}

function parseStandingsRow(row: any): StandingsRow {
  const get = (keys: string[]): string => {
    for (const k of keys) {
      if (row[k] !== undefined) return String(row[k]);
      if (row[`@${k}`] !== undefined) return String(row[`@${k}`]);
    }
    return "";
  };

  return {
    position: get(["pos", "position", "rank"]),
    teamGoalserveId: get(["id", "team_id", "teamid"]),
    teamName: get(["name", "team", "team_name", "teamname"]),
    played: get(["played", "pld", "p", "matches"]),
    wins: get(["win", "wins", "w", "won"]),
    draws: get(["draw", "draws", "d"]),
    losses: get(["loss", "losses", "l", "lost"]),
    goalsFor: get(["gf", "goals_for", "goalsfor", "scored", "f"]),
    goalsAgainst: get(["ga", "goals_against", "goalsagainst", "conceded", "a"]),
    goalDiff: get(["gd", "goal_diff", "goaldiff", "diff"]),
    points: get(["points", "pts", "pt"]),
  };
}

function getNestedKeys(obj: any, prefix = ""): string[] {
  if (!obj || typeof obj !== "object") return [];
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      keys.push(...getNestedKeys(obj[key], fullKey).slice(0, 20));
    }
  }
  return keys.slice(0, 50);
}

export async function previewGoalserveTable(req: Request, res: Response) {
  const leagueId = req.query.leagueId as string;

  if (!leagueId) {
    return res.status(400).json({ ok: false, error: "leagueId query param required" });
  }

  // Feed paths per Goalserve docs - standings first, squads last
  const feedPaths = [
    `standings/${leagueId}.xml`,       // Primary standings endpoint (from docs)
    `standings/${leagueId}`,           // Fallback without .xml
    `soccerleague/${leagueId}`,        // LAST - this returns squads, not standings
  ];

  const attemptedFeeds: FeedAttempt[] = [];
  let lastResponse: any = null;
  let lastFeedUsed: string = "";

  for (const feedPath of feedPaths) {
    try {
      const data = await goalserveFetch(feedPath);
      const topLevelKeys = Object.keys(data || {});
      
      attemptedFeeds.push({
        feed: feedPath,
        ok: true,
        topLevelKeys,
      });

      lastResponse = data;
      lastFeedUsed = feedPath;

      // Check if this looks like squads data without standings fields - skip if so
      if (looksLikeSquadsData(data)) {
        console.log(`[preview-goalserve-table] Feed ${feedPath} returned squads data, skipping`);
        continue;
      }

      const standingsRows = extractStandingsRows(data);

      if (standingsRows && standingsRows.length > 0) {
        const standingsKeys = getNestedKeys(data);

        return res.json({
          ok: true,
          leagueId,
          feedUsed: feedPath,
          attemptedFeeds,
          topLevelKeys,
          standingsKeys: standingsKeys.slice(0, 30),
          rowsCount: standingsRows.length,
          sampleRows: standingsRows.slice(0, 5),
        });
      }
    } catch (err: any) {
      const errorMsg = err.message?.slice(0, 200) || "Unknown error";
      console.error(`[preview-goalserve-table] Feed ${feedPath} failed:`, errorMsg);
      attemptedFeeds.push({
        feed: feedPath,
        ok: false,
        error: errorMsg,
      });
      // Continue to next feed path
    }
  }

  // No standings found in any feed
  const topLevelKeys = lastResponse ? Object.keys(lastResponse) : [];
  const responseSample = JSON.stringify(lastResponse || {}).slice(0, 800);

  return res.json({
    ok: false,
    leagueId,
    feedUsed: lastFeedUsed,
    attemptedFeeds,
    topLevelKeys,
    nestedKeys: getNestedKeys(lastResponse).slice(0, 30),
    responseSample,
    message: "Could not locate standings rows in any attempted feed. Check attemptedFeeds and responseSample to identify correct path.",
  });
}
