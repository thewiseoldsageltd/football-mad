/**
 * FA Cup–specific helpers for /api/cup/progress (Goalserve competition id 1198).
 * DB fallback + qualifying-round exclusion only; other cups stay unchanged in routes.
 */

import { db } from "../db";
import { matches, teams } from "@shared/schema";
import { and, eq, inArray, sql, aliasedTable } from "drizzle-orm";

/** Mirrors routes FA_CUP_CANONICAL_ROUNDS order keys for qualifying cut-off */
export const FA_CUP_FIRST_PROPER_ORDER = 7;
const FA_CUP_FALLBACK_MIN_ORDER = 11; // Fifth Round+

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
  return Array.from(out);
}

export type DbRoundCountRow = { roundLabel: string | null; count: number };
type FallbackCanonical = "Fifth Round" | "Quarter-finals" | "Semi-finals" | "Final";
const FALLBACK_MAX_MATCHES: Record<FallbackCanonical, number> = {
  "Fifth Round": 8,
  "Quarter-finals": 4,
  "Semi-finals": 2,
  "Final": 1,
};

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

function normalizeFaCupDbLaterRoundLabel(rawLabel: string | null | undefined): {
  canonical: FallbackCanonical | null;
  reason: string;
} {
  const raw = String(rawLabel ?? "").trim();
  if (!raw) return { canonical: null, reason: "blank" };
  const lower = raw.toLowerCase();
  const squashed = lower.replace(/[\s._-]+/g, "");

  if (lower.includes("unknown")) return { canonical: null, reason: "unknown" };
  if (/(qualification|qualifying|preliminary|prelim|extra\s*preliminary)/.test(lower)) {
    return { canonical: null, reason: "qualifying_or_preliminary" };
  }

  // Explicit Fifth Round only.
  if (
    /(^|\s)(fifth|5th)\s+round($|\s)/.test(lower) ||
    /^round\s*5$/.test(lower) ||
    /^r5$/.test(squashed)
  ) {
    return { canonical: "Fifth Round", reason: "accepted" };
  }

  // Explicit Quarter-finals.
  if (
    lower === "qf" ||
    lower === "quarter-finals" ||
    lower === "quarter finals" ||
    lower === "quarter-final" ||
    lower === "quarter final" ||
    squashed === "quarterfinals" ||
    lower === "1/4-finals" ||
    lower === "1/4 finals" ||
    squashed === "1/4finals"
  ) {
    return { canonical: "Quarter-finals", reason: "accepted" };
  }

  // Explicit Semi-finals.
  if (
    lower === "sf" ||
    lower === "semi-finals" ||
    lower === "semi finals" ||
    lower === "semi-final" ||
    lower === "semi final" ||
    squashed === "semifinals" ||
    lower === "1/2-finals" ||
    lower === "1/2 finals" ||
    squashed === "1/2finals"
  ) {
    return { canonical: "Semi-finals", reason: "accepted" };
  }

  // Explicit Final only (not semi/quarter finals).
  if (/^(the\s+)?finals?$/.test(lower)) {
    return { canonical: "Final", reason: "accepted" };
  }

  // Reject numeric-only / vague / early round labels.
  if (/^round\s*[1-4]$/.test(lower) || /^r[1-4]$/.test(squashed)) {
    return { canonical: null, reason: "early_round_label" };
  }
  if (/^\d+$/.test(lower)) return { canonical: null, reason: "numeric_only" };
  if (/(round of|last)\s*(16|32|64)/.test(lower)) return { canonical: null, reason: "round_of_not_late_knockout" };

  return { canonical: null, reason: "unmapped" };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function dbRowToCupProgressMatch(row: {
  id: string;
  goalserveMatchId: string | null;
  goalserveStaticId: string | null;
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
    ...(row.goalserveStaticId ? ({ goalserveStaticId: row.goalserveStaticId } as any) : {}),
  } as CupProgressMatchShape;
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
      goalserveStaticId: matches.goalserveStaticId,
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
      goalserveStaticId: r.goalserveStaticId,
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
): boolean {
  for (const { roundLabel, count } of counts) {
    if (!count) continue;
    const mapped = normalizeFaCupDbLaterRoundLabel(roundLabel);
    if (mapped.canonical) return true;
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
  debug = false
): { rounds: CupProgressRoundShape[]; diagnostics: { rejectedLabelReasons: Record<string, number>; dedupeDropped: number; cappedRounds: Array<{ round: string; kept: number; dropped: number }>; acceptedByRound: Record<string, number> } } {
  const dbByCanonical = new Map<string, CupProgressMatchShape[]>();
  const rejectedLabelReasons = new Map<string, number>();
  const acceptedByRound = new Map<string, number>();
  let dedupeDropped = 0;
  const cappedRounds: Array<{ round: string; kept: number; dropped: number }> = [];

  for (const { goalserveRound, row } of dbRows) {
    const raw = goalserveRound?.trim() || "";
    const mapped = normalizeFaCupDbLaterRoundLabel(raw);
    if (!mapped.canonical) {
      rejectedLabelReasons.set(mapped.reason, (rejectedLabelReasons.get(mapped.reason) ?? 0) + 1);
      if (debug) {
        console.log(`[CupProgress][FA Cup][DB] reject raw="${raw || "<blank>"}" reason=${mapped.reason}`);
      }
      continue;
    }
    const canonical = mapped.canonical;

    const cm = dbRowToCupProgressMatch(row);
    if (!dbByCanonical.has(canonical)) dbByCanonical.set(canonical, []);
    dbByCanonical.get(canonical)!.push(cm);
    acceptedByRound.set(canonical, (acceptedByRound.get(canonical) ?? 0) + 1);
    if (debug) {
      console.log(`[CupProgress][FA Cup][DB] accept raw="${raw}" canonical="${canonical}"`);
    }
  }

  const byName = new Map<string, CupProgressRoundShape>();
  for (const r of feedRounds) {
    byName.set(r.name, { ...r, matches: [...r.matches] });
  }

  for (const [canonical, dbMatches] of Array.from(dbByCanonical.entries())) {
    const order = FA_CUP_ORDER_BY_NAME[canonical] ?? 99;
    const existing = byName.get(canonical);
    const seen = new Set<string>();

    const dedupeKey = (m: CupProgressMatchShape): string => {
      const anyMatch = m as any;
      const staticId = String(anyMatch.goalserveStaticId ?? "").trim();
      if (staticId) return `static:${staticId}`;
      const gsId = String(anyMatch.id ?? "").trim();
      if (gsId) return `match:${gsId}`;
      const h = String(m.home?.id ?? m.home?.name ?? "").trim().toLowerCase();
      const a = String(m.away?.id ?? m.away?.name ?? "").trim().toLowerCase();
      const d = String(m.kickoffDate ?? m.kickoff ?? "").trim();
      return `fallback:${d}:${h}:${a}`;
    };

    const reliabilityScore = (m: CupProgressMatchShape): number => {
      const anyMatch = m as any;
      let s = 0;
      if (String(anyMatch.goalserveStaticId ?? "").trim()) s += 8;
      if (String(anyMatch.id ?? "").trim()) s += 4;
      if (m.kickoffDate || m.kickoff) s += 2;
      if (m.home?.id && m.away?.id) s += 1;
      return s;
    };

    const sortReliableRecent = (a: CupProgressMatchShape, b: CupProgressMatchShape): number => {
      const ra = reliabilityScore(a);
      const rb = reliabilityScore(b);
      if (rb !== ra) return rb - ra;
      const ta = Date.parse(`${a.kickoffDate ?? ""}T${a.kickoffTime ?? "00:00"}:00Z`);
      const tb = Date.parse(`${b.kickoffDate ?? ""}T${b.kickoffTime ?? "00:00"}:00Z`);
      const aMs = Number.isFinite(ta) ? ta : 0;
      const bMs = Number.isFinite(tb) ? tb : 0;
      return bMs - aMs;
    };

    if (existing) {
      for (const m of existing.matches) seen.add(dedupeKey(m));
      const merged: CupProgressMatchShape[] = [...existing.matches];
      for (const m of dbMatches) {
        const k = dedupeKey(m);
        if (!seen.has(k)) {
          merged.push(m);
          seen.add(k);
        } else {
          dedupeDropped++;
        }
      }
      merged.sort(sortReliableRecent);
      const cap = FALLBACK_MAX_MATCHES[canonical as FallbackCanonical];
      const kept = cap ? merged.slice(0, cap) : merged;
      if (cap && merged.length > cap) {
        cappedRounds.push({ round: canonical, kept: kept.length, dropped: merged.length - kept.length });
        console.warn(`[CupProgress][FA Cup][DB] cap applied for ${canonical}: keeping ${kept.length}/${merged.length}`);
      }
      byName.set(canonical, { ...existing, matches: kept, order });
    } else {
      const unique: CupProgressMatchShape[] = [];
      for (const m of dbMatches) {
        const k = dedupeKey(m);
        if (!seen.has(k)) {
          seen.add(k);
          unique.push(m);
        } else {
          dedupeDropped++;
        }
      }
      unique.sort(sortReliableRecent);
      const cap = FALLBACK_MAX_MATCHES[canonical as FallbackCanonical];
      const kept = cap ? unique.slice(0, cap) : unique;
      if (cap && unique.length > cap) {
        cappedRounds.push({ round: canonical, kept: kept.length, dropped: unique.length - kept.length });
        console.warn(`[CupProgress][FA Cup][DB] cap applied for ${canonical}: keeping ${kept.length}/${unique.length}`);
      }
      byName.set(canonical, {
        name: canonical,
        order,
        matches: kept,
        status: "upcoming",
      });
    }
  }

  const out = Array.from(byName.values());
  out.sort((a, b) => a.order - b.order);
  const rounds = out.map((r) => ({
    ...r,
    status: computeRoundStatus(r.matches),
  }));
  return {
    rounds,
    diagnostics: {
      rejectedLabelReasons: Object.fromEntries(rejectedLabelReasons),
      dedupeDropped,
      cappedRounds,
      acceptedByRound: Object.fromEntries(acceptedByRound),
    },
  };
}
