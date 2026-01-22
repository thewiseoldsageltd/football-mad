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

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function extractStandingsRows(data: any): StandingsRow[] | null {
  // Try various possible node paths for standings data
  // Common patterns: response.standings.table.team[], response.league.table.team[], etc.
  
  const pathsToTry = [
    // soccerleague feed patterns
    () => data?.standings?.league?.team,
    () => data?.standings?.team,
    () => data?.league?.standings?.team,
    () => data?.league?.team,
    () => data?.table?.team,
    () => data?.team,
    // Alternative structures
    () => data?.standings?.league?.table?.team,
    () => data?.standings?.table?.team,
    () => data?.league?.table?.team,
    () => data?.table?.row,
    () => data?.standings?.row,
    // Direct team array
    () => data?.standings,
    () => data?.league?.standings,
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
  return hasPosition || (hasPoints && hasPlayed);
}

function parseStandingsRow(row: any): StandingsRow {
  // Handle both direct fields and @-prefixed attributes
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

  // Try different feed paths for standings
  const feedPaths = [
    `soccerleague/${leagueId}`,
    `soccer/${leagueId}`,
    `soccerstandings/${leagueId}`,
  ];

  let lastResponse: any = null;
  let feedUsed: string = "";

  for (const feedPath of feedPaths) {
    try {
      const data = await goalserveFetch(feedPath);
      lastResponse = data;
      feedUsed = feedPath;

      const standingsRows = extractStandingsRows(data);

      if (standingsRows && standingsRows.length > 0) {
        // Find the key path that contains standings data
        const topLevelKeys = Object.keys(data || {});
        const standingsKeys = getNestedKeys(data);

        return res.json({
          ok: true,
          leagueId,
          feedUsed,
          topLevelKeys,
          standingsKeys: standingsKeys.slice(0, 30),
          rowsCount: standingsRows.length,
          sampleRows: standingsRows.slice(0, 5),
        });
      }
    } catch (err: any) {
      console.error(`[preview-goalserve-table] Feed ${feedPath} failed:`, err.message);
      // Continue to next feed path
    }
  }

  // No standings found in any feed
  const topLevelKeys = lastResponse ? Object.keys(lastResponse) : [];
  const responseSample = JSON.stringify(lastResponse || {}).slice(0, 800);

  return res.json({
    ok: false,
    leagueId,
    feedUsed,
    topLevelKeys,
    nestedKeys: getNestedKeys(lastResponse).slice(0, 30),
    responseSample,
    message: "Could not locate standings rows in response. Check nestedKeys and responseSample to identify correct path.",
  });
}
