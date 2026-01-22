import type { Request, Response } from "express";
import { goalserveFetch } from "../integrations/goalserve/client";

interface StandingsRow {
  position: string;
  teamGoalserveId: string;
  teamName: string;
  played: string;
  wins: string;
  draws: string;
  losses: string;
  goalsFor: string;
  goalsAgainst: string;
  goalDiff: string;
  points: string;
}

function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function parseStandingsRow(team: any): StandingsRow {
  // Confirmed structure from standings/1204.xml:
  // - position: team["@position"]
  // - teamGoalserveId: team["@id"]
  // - teamName: team["@name"]
  // - played: team.overall["@gp"]
  // - wins: team.overall["@w"]
  // - draws: team.overall["@d"]
  // - losses: team.overall["@l"]
  // - goalsFor: team.overall["@gs"]
  // - goalsAgainst: team.overall["@ga"]
  // - goalDiff: team.total["@gd"]
  // - points: team.total["@p"]
  
  const overall = team?.overall || {};
  const total = team?.total || {};

  return {
    position: String(team?.["@position"] || ""),
    teamGoalserveId: String(team?.["@id"] || ""),
    teamName: String(team?.["@name"] || ""),
    played: String(overall?.["@gp"] || ""),
    wins: String(overall?.["@w"] || ""),
    draws: String(overall?.["@d"] || ""),
    losses: String(overall?.["@l"] || ""),
    goalsFor: String(overall?.["@gs"] || ""),
    goalsAgainst: String(overall?.["@ga"] || ""),
    goalDiff: String(total?.["@gd"] || ""),
    points: String(total?.["@p"] || ""),
  };
}

function getDeepNestedKeys(obj: any, prefix = "", maxKeys = 200): string[] {
  if (!obj || typeof obj !== "object") return [];
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    if (keys.length >= maxKeys) break;
    const fullKey = prefix ? `${prefix}.${key}` : key;
    keys.push(fullKey);
    if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
      const nested = getDeepNestedKeys(obj[key], fullKey, maxKeys - keys.length);
      keys.push(...nested);
    } else if (Array.isArray(obj[key]) && obj[key].length > 0 && typeof obj[key][0] === "object") {
      const nested = getDeepNestedKeys(obj[key][0], `${fullKey}[0]`, maxKeys - keys.length);
      keys.push(...nested);
    }
  }
  return keys.slice(0, maxKeys);
}

export async function previewGoalserveTable(req: Request, res: Response) {
  const leagueId = req.query.leagueId as string;
  const debug = req.query.debug === "1";

  if (!leagueId) {
    return res.status(400).json({ ok: false, error: "leagueId query param required" });
  }

  const feedPath = `standings/${leagueId}.xml`;

  // Debug mode: return detailed diagnostics
  if (debug) {
    try {
      const data = await goalserveFetch(feedPath);
      const standings = data?.standings;
      
      return res.json({
        ok: true,
        leagueId,
        feedUsed: feedPath,
        standingsTopKeys: standings ? Object.keys(standings) : [],
        nestedKeysUnderStandings: standings ? getDeepNestedKeys(standings, "", 200) : [],
        responseSample: JSON.stringify(standings || {}).slice(0, 2000),
      });
    } catch (err: any) {
      return res.json({
        ok: false,
        leagueId,
        feedUsed: feedPath,
        error: err.message?.slice(0, 500) || "Unknown error",
      });
    }
  }

  // Normal mode: parse and return standings
  try {
    const data = await goalserveFetch(feedPath);
    
    // Confirmed structure: response.standings.tournament.team
    const tournament = data?.standings?.tournament;
    
    if (!tournament) {
      return res.json({
        ok: false,
        leagueId,
        feedUsed: feedPath,
        error: "No tournament node found in standings response",
        topLevelKeys: Object.keys(data || {}),
        standingsKeys: data?.standings ? Object.keys(data.standings) : [],
      });
    }

    const season = tournament?.["@season"] || "";
    const leagueName = tournament?.["@league"] || "";
    const teamRows = toArray(tournament?.team);

    if (teamRows.length === 0) {
      return res.json({
        ok: false,
        leagueId,
        feedUsed: feedPath,
        error: "No team rows found in standings.tournament.team",
        tournamentKeys: Object.keys(tournament),
      });
    }

    const sampleRows = teamRows.slice(0, 5).map(parseStandingsRow);

    return res.json({
      ok: true,
      leagueId,
      feedUsed: feedPath,
      season,
      leagueName,
      rowsCount: teamRows.length,
      sampleRows,
    });

  } catch (err: any) {
    return res.json({
      ok: false,
      leagueId,
      feedUsed: feedPath,
      error: err.message?.slice(0, 500) || "Unknown error",
    });
  }
}
