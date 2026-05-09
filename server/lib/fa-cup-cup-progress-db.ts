/**
 * FA Cup–specific helpers for /api/cup/progress (Goalserve competition id 1198).
 * DB fallback + qualifying-round exclusion only; other cups stay unchanged in routes.
 */

import { db } from "../db";
import { matches, teams } from "@shared/schema";
import { and, eq, inArray, sql, aliasedTable } from "drizzle-orm";

/** Mirrors routes FA_CUP_CANONICAL_ROUNDS order keys for qualifying cut-off */
export const FA_CUP_FIRST_PROPER_ORDER = 7;

const FA_CUP_ORDER_BY_NAME: Record<string, number> = {
  "Extra Preliminary Round": 1,
  "Preliminary Round": 2,
  "First Qualifying Round": 3,
  "Second Qualifying Round": 4,
  "Third Qualifying Round": 5,
  "Fourth Qualifying Round": 6,
  "First Round": 7,
  "Second Round": 8,
  "Third Round": 9,
  "Fourth Round": 10,
  "Fifth Round": 11,
  "Quarter-finals": 12,
  "Semi-finals": 13,
  "Final": 14,
};

export interface CupProgressMatchShape {
  id: string;
  home: { id?: string; name: string };
  away: { id?: string; name: string };
  score?: { home: number; away: number } | null;
  penalties?: { home: number; away: number } | null;
  kickoff?: string;
  kickoffDate?: string | null;
  kickoffTime?: string | null;
  status: string;
}

export interface CupProgressRoundShape {
  name: string;
  order: number;
  matches: CupProgressMatchShape[];
  status: "completed" | "in_progress" | "upcoming";
}

/** MVP: hide FA Cup qualifying / preliminary artefacts (proper = First Round onwards). */
export function shouldExcludeFaCupQualifyingRound(canonicalName: string): boolean {
  const ord = FA_CUP_ORDER_BY_NAME[canonicalName];
  if (ord !== undefined && ord < FA_CUP_FIRST_PROPER_ORDER) {
    return true;
  }
  const lower = canonicalName.toLowerCase();
  if (canonicalName.startsWith("Unknown: ")) {
    const inner = lower.slice("unknown:".length).trim();
    if (/(qualification|qualifying|preliminary|prelim|extra\s*preliminary)/.test(inner)) {
      return true;
    }
  }
  if (/(qualification|qualifying|preliminary|extra\s*preliminary)/.test(lower)) {
    return true;
  }
  return false;
}

/** Possible season_key values we store on matches for the same campaign */
export function seasonKeyCandidates(seasonParam: string | undefined): string[] | null {
  if (!seasonParam?.trim()) return null;
  const s = seasonParam.trim();
  const out = new Set<string>();
  out.add(s);
  const m = s.match(/^(\d{4})[\/\-](\d{2,4})$/);
  if (m) {
    const y1 = m[1];
    let y2 = m[2];
    if (y2.length === 2) {
      y2 = y1.slice(0, 2) + y2;
    }
    out.add(`${y1}/${y2}`);
    out.add(`${y1}-${y2.slice(2)}`);
  }
  return [...out];
}

export type DbRoundCountRow = { roundLabel: string | null; count: number };

/** Diagnostic: matches grouped by goalserve_round for a cup competition */
export async function getCupDbRoundCounts(
  goalserveCompetitionId: string,
  seasonParam: string | undefined
): Promise<DbRoundCountRow[]> {
  const keys = seasonKeyCandidates(seasonParam);
  const conditions = [eq(matches.goalserveCompetitionId, goalserveCompetitionId)];
  if (keys && keys.length > 0) {
    conditions.push(inArray(matches.seasonKey, keys));
  }

  const rows = await db
    .select({
      roundLabel: matches.goalserveRound,
      count: sql<number>`count(*)::int`,
    })
    .from(matches)
    .where(and(...conditions))
    .groupBy(matches.goalserveRound);

  return rows.map((r) => ({
    roundLabel: r.roundLabel,
    count: Number(r.count) || 0,
  }));
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dbRowToCupProgressMatch(row: {
  id: string;
  goalserveMatchId: string | null;
  homeGoalserveTeamId: string | null;
  awayGoalserveTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  status: string | null;
  kickoffTime: Date | null;
  homeName: string | null;
  awayName: string | null;
}): CupProgressMatchShape {
  let kickoffDate: string | null = null;
  let kickoffTimeStr: string | null = null;
  let kickoff: string | undefined;
  if (row.kickoffTime) {
    const d = new Date(row.kickoffTime);
    if (!isNaN(d.getTime())) {
      kickoffDate = d.toISOString().slice(0, 10);
      kickoffTimeStr = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
      kickoff = kickoffDate;
    }
  }

  const st = (row.status || "").toLowerCase();
  let statusOut = "NS";
  if (st === "finished" || st === "ft") statusOut = "FT";
  else if (st === "postponed" || st === "cancelled") statusOut = row.status || "NS";
  else if (st === "scheduled" || st === "ns" || st === "") statusOut = "NS";
  else if (/^\d+$/.test(st) || st === "ht" || st === "live") statusOut = row.status || "LIVE";
  else statusOut = row.status || "NS";

  const hasScore = row.homeScore != null && row.awayScore != null;

  return {
    id: row.goalserveMatchId || row.id,
    home: {
      id: row.homeGoalserveTeamId ?? undefined,
      name: row.homeName || "TBD",
    },
    away: {
      id: row.awayGoalserveTeamId ?? undefined,
      name: row.awayName || "TBD",
    },
    score: hasScore ? { home: row.homeScore!, away: row.awayScore! } : null,
    kickoff,
    kickoffDate,
    kickoffTime: kickoffTimeStr,
    status: statusOut,
  };
}

/** Fetch matches for FA Cup DB fallback (same competition id + season keys) */
export async function fetchFaCupMatchesFromDb(
  goalserveCompetitionId: string,
  seasonParam: string | undefined
): Promise<
  Array<{
    goalserveRound: string | null;
    row: Parameters<typeof dbRowToCupProgressMatch>[0];
  }>
> {
  const keys = seasonKeyCandidates(seasonParam);
  const conditions = [eq(matches.goalserveCompetitionId, goalserveCompetitionId)];
  if (keys && keys.length > 0) {
    conditions.push(inArray(matches.seasonKey, keys));
  }

  const homeTeam = aliasedTable(teams, "cup_home_team");
  const awayTeam = aliasedTable(teams, "cup_away_team");

  const rows = await db
    .select({
      id: matches.id,
      goalserveMatchId: matches.goalserveMatchId,
      goalserveRound: matches.goalserveRound,
      homeGoalserveTeamId: matches.homeGoalserveTeamId,
      awayGoalserveTeamId: matches.awayGoalserveTeamId,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      status: matches.status,
      kickoffTime: matches.kickoffTime,
      homeName: homeTeam.name,
      awayName: awayTeam.name,
    })
    .from(matches)
    .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
    .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
    .where(and(...conditions));

  return rows.map((r) => ({
    goalserveRound: r.goalserveRound,
    row: {
      id: r.id,
      goalserveMatchId: r.goalserveMatchId,
      homeGoalserveTeamId: r.homeGoalserveTeamId,
      awayGoalserveTeamId: r.awayGoalserveTeamId,
      homeScore: r.homeScore,
      awayScore: r.awayScore,
      status: r.status,
      kickoffTime: r.kickoffTime,
      homeName: r.homeName,
      awayName: r.awayName,
    },
  }));
}

/** Feed has no proper rounds from Fifth Round onward (order >= 11) */
export function faCupFeedMissingLaterKnockoutRounds(feedRounds: CupProgressRoundShape[]): boolean {
  const has = feedRounds.some((r) => r.matches.length > 0 && r.order >= 11);
  return !has;
}

/** True if DB has any match rows in Fifth Round or later (canonical order >= 11). */
export function faCupDbCountsIncludeLaterKnockout(
  counts: DbRoundCountRow[],
  normalizeRound: (raw: string) => string | null
): boolean {
  for (const { roundLabel, count } of counts) {
    if (!count) continue;
    const c = normalizeRound(roundLabel || "") ?? "";
    if (!c || shouldExcludeFaCupQualifyingRound(c)) continue;
    const ord = FA_CUP_ORDER_BY_NAME[c] ?? 99;
    if (ord >= 11) return true;
  }
  return false;
}

function computeRoundStatus(matches: CupProgressMatchShape[]): "completed" | "in_progress" | "upcoming" {
  if (matches.length === 0) return "upcoming";
  const completedStatuses = ["ft", "aet", "pen", "awarded", "cancelled", "postponed"];
  const liveIndicators = ["ht", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const allCompleted = matches.every((m) => {
    const s = m.status.toLowerCase();
    return completedStatuses.some((cs) => s.includes(cs));
  });
  const anyLive = matches.some((m) => {
    const s = m.status.toLowerCase();
    if (s === "ht") return true;
    if (/^\d+$/.test(s)) return true;
    return liveIndicators.some((li) => s === li);
  });
  if (anyLive) return "in_progress";
  if (allCompleted) return "completed";
  return "upcoming";
}

/**
 * Merge DB-derived matches into feed rounds for FA Cup only.
 * `normalizeRound` must be the same FA Cup normalizer used for Goalserve keys.
 */
export function mergeFaCupDbFallback(
  feedRounds: CupProgressRoundShape[],
  dbRows: Array<{ goalserveRound: string | null; row: Parameters<typeof dbRowToCupProgressMatch>[0] }>,
  normalizeRound: (raw: string) => string | null
): CupProgressRoundShape[] {
  const dbByCanonical = new Map<string, CupProgressMatchShape[]>();

  for (const { goalserveRound, row } of dbRows) {
    const raw = goalserveRound?.trim() || "";
    if (!raw) continue;

    const canonical = normalizeRound(raw) ?? `Unknown: ${raw}`;
    if (shouldExcludeFaCupQualifyingRound(canonical)) continue;

    const cm = dbRowToCupProgressMatch(row);
    if (!dbByCanonical.has(canonical)) dbByCanonical.set(canonical, []);
    dbByCanonical.get(canonical)!.push(cm);
  }

  const byName = new Map<string, CupProgressRoundShape>();
  for (const r of feedRounds) {
    byName.set(r.name, { ...r, matches: [...r.matches] });
  }

  for (const [canonical, dbMatches] of dbByCanonical) {
    const order = FA_CUP_ORDER_BY_NAME[canonical] ?? 99;
    const existing = byName.get(canonical);
    const seen = new Set<string>();

    if (existing) {
      for (const m of existing.matches) seen.add(m.id);
      const merged: CupProgressMatchShape[] = [...existing.matches];
      for (const m of dbMatches) {
        if (!seen.has(m.id)) {
          merged.push(m);
          seen.add(m.id);
        }
      }
      merged.sort((a, b) => {
        if (!a.kickoff && !b.kickoff) return 0;
        if (!a.kickoff) return 1;
        if (!b.kickoff) return -1;
        return (a.kickoff || "").localeCompare(b.kickoff || "");
      });
      byName.set(canonical, { ...existing, matches: merged, order });
    } else {
      dbMatches.sort((a, b) => {
        if (!a.kickoff && !b.kickoff) return 0;
        if (!a.kickoff) return 1;
        if (!b.kickoff) return -1;
        return (a.kickoff || "").localeCompare(b.kickoff || "");
      });
      byName.set(canonical, {
        name: canonical,
        order,
        matches: dbMatches,
        status: "upcoming",
      });
    }
  }

  const out = [...byName.values()];
  out.sort((a, b) => a.order - b.order);
  return out.map((r) => ({
    ...r,
    status: computeRoundStatus(r.matches),
  }));
}
