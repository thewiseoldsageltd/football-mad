import { preferTimelineRawStatus } from "./match-centre-state";

/**
 * Helpers for Goalserve match detail payloads stored in matches.timeline.
 * Keep parsing shared so ingest and the Match page stay aligned.
 */

export type GoalserveMatchEvent = {
  type: string;
  minute: string;
  extraMin?: string;
  team: "home" | "away" | "neutral";
  player?: string;
  assist?: string;
  result?: string;
  playerId?: string;
  assistId?: string;
  /** Goalserve @eventid when present — strongest dedupe key. */
  eventId?: string;
};

export type GoalserveMatchStat = {
  key: string;
  label: string;
  home: number;
  away: number;
};

export type GoalserveMatchTimeline = {
  id?: string;
  staticId?: string;
  date?: string;
  time?: string;
  status?: string;
  timer?: string | null;
  venue?: string | null;
  referee?: string | null;
  commentaryAvailable?: boolean | null;
  htScore?: string | null;
  home?: { id?: string; name?: string; score?: number | null };
  away?: { id?: string; name?: string; score?: number | null };
  events?: GoalserveMatchEvent[];
  stats?: GoalserveMatchStat[];
  /** Raw Goalserve fragments retained for forward compatibility. */
  raw?: {
    events?: unknown;
    liveStats?: unknown;
    ht?: unknown;
    lineup?: unknown;
    lineups?: unknown;
  };
};

const STAT_LABELS: Record<string, string> = {
  ICorner: "Corners",
  IYellowCard: "Yellow cards",
  IRedCard: "Red cards",
  IThrowIn: "Throw-ins",
  IFreeKick: "Free kicks",
  IGoalKick: "Goal kicks",
  IPenalty: "Penalties",
  ISubstitution: "Substitutions",
  IAttacks: "Attacks",
  IDangerousAttacks: "Dangerous attacks",
  IOnTarget: "Shots on target",
  IOffTarget: "Shots off target",
  IPosession: "Possession",
  IPossession: "Possession",
  IShots: "Shots",
  IFouls: "Fouls",
  IOffsides: "Offsides",
  ISaves: "Saves",
};

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function parseTeamSide(raw: unknown): "home" | "away" | "neutral" {
  const s = String(raw ?? "").toLowerCase();
  if (s === "localteam" || s === "home" || s === "1") return "home";
  if (s === "visitorteam" || s === "away" || s === "2") return "away";
  return "neutral";
}

export function parseGoalserveLiveStats(raw: unknown): GoalserveMatchStat[] {
  let value = "";
  if (typeof raw === "string") {
    value = raw;
  } else if (raw && typeof raw === "object" && "@value" in (raw as object)) {
    value = String((raw as { "@value"?: unknown })["@value"] ?? "");
  } else if (raw && typeof raw === "object" && "value" in (raw as object)) {
    value = String((raw as { value?: unknown }).value ?? "");
  }
  if (!value) return [];

  const stats: GoalserveMatchStat[] = [];
  for (const part of value.split("|")) {
    const [keyPart, numbersPart] = part.split("=");
    if (!keyPart || !numbersPart) continue;
    const key = keyPart.trim();
    const homeMatch = numbersPart.match(/home\s*:\s*(-?\d+(?:\.\d+)?)/i);
    const awayMatch = numbersPart.match(/away\s*:\s*(-?\d+(?:\.\d+)?)/i);
    if (!homeMatch || !awayMatch) continue;
    const home = Number(homeMatch[1]);
    const away = Number(awayMatch[1]);
    if (!Number.isFinite(home) || !Number.isFinite(away)) continue;
    // Skip empty/zero-only rows that add no signal when both sides are 0 — still
    // keep possession and shot-style metrics even at 0–0 because they are real.
    const label = STAT_LABELS[key] ?? key.replace(/^I/, "").replace(/([A-Z])/g, " $1").trim();
    stats.push({ key, label, home, away });
  }
  return stats;
}

export function parseGoalserveEvents(raw: unknown): GoalserveMatchEvent[] {
  if (!raw || typeof raw !== "object") return [];
  const container = raw as Record<string, unknown>;
  const list = asArray(container.event ?? container.events ?? raw);
  const out: GoalserveMatchEvent[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const e = item as Record<string, unknown>;
    const type = String(e["@type"] ?? e.type ?? "").trim();
    if (!type) continue;
    const player = String(e["@player"] ?? e.player ?? "").trim();
    const assist = String(e["@assist"] ?? e.assist ?? "").trim();
    const eventId = String(e["@eventid"] ?? e["@eventId"] ?? e.eventid ?? e.eventId ?? "").trim();
    out.push({
      type,
      minute: String(e["@minute"] ?? e.minute ?? "").trim(),
      extraMin: String(e["@extra_min"] ?? e.extra_min ?? "").trim() || undefined,
      team: parseTeamSide(e["@team"] ?? e.team),
      player: player || undefined,
      assist: assist || undefined,
      result: String(e["@result"] ?? e.result ?? "").trim() || undefined,
      playerId: String(e["@playerId"] ?? e.playerId ?? "").trim() || undefined,
      assistId: String(e["@assistid"] ?? e.assistId ?? "").trim() || undefined,
      eventId: eventId || undefined,
    });
  }
  return out;
}

export function goalserveEventIdentity(event: GoalserveMatchEvent): string {
  if (event.eventId) return `id:${event.eventId}`;
  return [
    "c",
    event.type,
    event.minute,
    event.extraMin ?? "",
    event.team,
    event.player ?? "",
    event.playerId ?? "",
    event.assist ?? "",
    event.result ?? "",
  ].join("|");
}

function isVarCancelEvent(event: GoalserveMatchEvent): boolean {
  const t = event.type.toLowerCase();
  return t.includes("var") && (t.includes("cancel") || t.includes("disallow") || t.includes("overturn"));
}

function isGoalLikeEvent(event: GoalserveMatchEvent): boolean {
  const t = event.type.toLowerCase();
  return t === "goal" || t === "g" || t === "owngoal" || t === "og" || t === "penalty" || t === "pen";
}

/**
 * Merge events with precedence:
 * 1. Same @eventid → incoming replaces existing (corrections / type changes).
 * 2. Compound identity → incoming replaces.
 * 3. When incoming carries eventIds and is terminal (or at least as rich), drop
 *    existing eventIds absent from incoming (provider removed a cancelled goal).
 * 4. Goal-like events cancelled by a VAR-cancel at same minute+team are dropped.
 */
export function mergeGoalserveEvents(
  existing: GoalserveMatchEvent[] | undefined,
  incoming: GoalserveMatchEvent[] | undefined,
  opts?: { incomingIsTerminal?: boolean },
): GoalserveMatchEvent[] | undefined {
  const a = existing ?? [];
  const b = incoming ?? [];
  if (!a.length && !b.length) return undefined;
  if (!a.length) return b;
  if (!b.length) return a;

  const incomingIds = new Set(b.map((e) => e.eventId).filter(Boolean) as string[]);
  const dropMissingIds =
    incomingIds.size > 0 && (opts?.incomingIsTerminal || b.length >= a.length);

  const map = new Map<string, GoalserveMatchEvent>();
  for (const e of b) map.set(goalserveEventIdentity(e), e);
  for (const e of a) {
    if (dropMissingIds && e.eventId && !incomingIds.has(e.eventId)) continue;
    const id = goalserveEventIdentity(e);
    if (!map.has(id)) map.set(id, e);
  }

  let merged = Array.from(map.values());

  const varCancels = merged.filter(isVarCancelEvent);
  if (varCancels.length) {
    merged = merged.filter((e) => {
      if (!isGoalLikeEvent(e)) return true;
      return !varCancels.some(
        (v) =>
          v.minute === e.minute &&
          v.team === e.team &&
          (!v.player || !e.player || v.player === e.player),
      );
    });
  }

  return merged;
}

function nonEmptyText(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const name = o["@name"] ?? o.name;
    if (name != null) {
      const s = String(name).trim();
      return s && s !== "[object Object]" ? s : null;
    }
    return null;
  }
  const s = String(v).trim();
  return s && s !== "[object Object]" ? s : null;
}

function timelineRichness(t: GoalserveMatchTimeline | null | undefined): number {
  if (!t) return 0;
  let score = 0;
  score += (t.events?.length ?? 0) * 3;
  score += (t.stats?.length ?? 0) * 4;
  if (t.htScore) score += 2;
  if (t.referee) score += 1;
  if (t.venue) score += 1;
  if (t.timer) score += 1;
  if (t.raw?.lineups || t.raw?.lineup) score += 5;
  if (t.raw?.liveStats) score += 2;
  if (t.raw?.events) score += 1;
  return score;
}

function isTerminalRawStatus(status?: string | null): boolean {
  const s = String(status ?? "").trim().toLowerCase();
  if (!s) return false;
  return (
    s === "ft" ||
    s === "aet" ||
    s === "pen." ||
    s.includes("finished") ||
    s.includes("full-time") ||
    s.includes("full time") ||
    s.includes("postpon") ||
    s.includes("cancel") ||
    s.includes("abandon") ||
    s.includes("awarded")
  );
}

/**
 * Merge an incoming Goalserve timeline onto a stored one without erasing richer data.
 * Preserves stats/HT/referee/venue/lineups when later feeds omit them.
 * Does not let stale live status revert a finished match.
 */
export function mergeGoalserveMatchTimeline(
  existing: GoalserveMatchTimeline | null | undefined,
  incoming: GoalserveMatchTimeline,
): GoalserveMatchTimeline {
  if (!existing) return incoming;

  const incomingIsTerminal = isTerminalRawStatus(incoming.status);
  const events = mergeGoalserveEvents(existing.events, incoming.events, { incomingIsTerminal });
  const stats =
    incoming.stats && incoming.stats.length > 0
      ? incoming.stats
      : existing.stats && existing.stats.length > 0
        ? existing.stats
        : undefined;

  const raw: GoalserveMatchTimeline["raw"] = {
    ...(existing.raw ?? {}),
  };
  if (incoming.raw?.events) raw.events = incoming.raw.events;
  if (incoming.raw?.liveStats) raw.liveStats = incoming.raw.liveStats;
  else if (existing.raw?.liveStats) raw.liveStats = existing.raw.liveStats;
  if (incoming.raw?.ht) raw.ht = incoming.raw.ht;
  else if (existing.raw?.ht) raw.ht = existing.raw.ht;
  if (incoming.raw?.lineup) raw.lineup = incoming.raw.lineup;
  else if (existing.raw?.lineup) raw.lineup = existing.raw.lineup;
  if (incoming.raw?.lineups) raw.lineups = incoming.raw.lineups;
  else if (existing.raw?.lineups) raw.lineups = existing.raw.lineups;

  const merged: GoalserveMatchTimeline = {
    id: incoming.id || existing.id,
    staticId: incoming.staticId || existing.staticId,
    date: incoming.date || existing.date,
    time: incoming.time || existing.time,
    status: preferTimelineRawStatus(existing.status, incoming.status),
    timer: incomingIsTerminal
      ? incoming.timer != null && String(incoming.timer).trim() !== ""
        ? incoming.timer
        : null
      : incoming.timer != null && String(incoming.timer).trim() !== ""
        ? incoming.timer
        : existing.timer ?? null,
    venue: nonEmptyText(incoming.venue) || nonEmptyText(existing.venue),
    referee: nonEmptyText(incoming.referee) || nonEmptyText(existing.referee),
    commentaryAvailable:
      incoming.commentaryAvailable != null
        ? incoming.commentaryAvailable
        : existing.commentaryAvailable ?? null,
    htScore: nonEmptyText(incoming.htScore) || nonEmptyText(existing.htScore),
    home: {
      id: incoming.home?.id || existing.home?.id,
      name: incoming.home?.name || existing.home?.name,
      score:
        incoming.home?.score != null ? incoming.home.score : existing.home?.score ?? null,
    },
    away: {
      id: incoming.away?.id || existing.away?.id,
      name: incoming.away?.name || existing.away?.name,
      score:
        incoming.away?.score != null ? incoming.away.score : existing.away?.score ?? null,
    },
  };

  if (events?.length) merged.events = events;
  if (stats?.length) merged.stats = stats;
  if (Object.keys(raw).length) merged.raw = raw;

  // Never replace a clearly richer timeline with a thinner one that lost everything.
  if (timelineRichness(merged) < timelineRichness(existing) && timelineRichness(incoming) === 0) {
    return {
      ...existing,
      status: preferTimelineRawStatus(existing.status, incoming.status),
      timer: merged.timer,
      home: merged.home,
      away: merged.away,
    };
  }

  return merged;
}

function extractHtScore(ht: unknown): string | null {
  if (!ht) return null;
  if (typeof ht === "string") return ht.trim() || null;
  if (typeof ht === "object") {
    const o = ht as Record<string, unknown>;
    const score = o["@score"] ?? o.score;
    if (score != null) return String(score).trim() || null;
  }
  return null;
}

function truthyFlag(v: unknown): boolean | null {
  if (v == null || v === "") return null;
  const s = String(v).toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return null;
}

/**
 * Build the JSONB payload stored on matches.timeline from a Goalserve match node.
 * Preserves events / live_stats / HT / timer when present; never invents values.
 */
export function buildGoalserveMatchTimeline(
  match: Record<string, any>,
  opts: {
    goalserveMatchId: string;
    goalserveStaticId?: string;
    formattedDate?: string;
    timeStr?: string;
    rawStatus?: string;
    home: { id?: string; name?: unknown; score?: number | null };
    away: { id?: string; name?: unknown; score?: number | null };
  },
): GoalserveMatchTimeline {
  const eventsRaw = match.events ?? match.event ?? null;
  const liveStatsRaw = match.live_stats ?? match.stats ?? match.statistics ?? null;
  const lineupRaw = match.lineup ?? null;
  const lineupsRaw = match.lineups ?? null;
  const events = parseGoalserveEvents(eventsRaw);
  const stats = parseGoalserveLiveStats(liveStatsRaw);

  const timer = match["@timer"] ?? match.timer ?? null;
  const referee = nonEmptyText(match["@referee"] ?? match.referee);
  const venue = nonEmptyText(match["@venue"] ?? match.venue);
  const commentaryAvailable = truthyFlag(
    match["@commentary_available"] ?? match.commentary_available,
  );
  const htScore = extractHtScore(match.ht ?? match["@ht"]);

  const payload: GoalserveMatchTimeline = {
    id: opts.goalserveMatchId,
    staticId: opts.goalserveStaticId || undefined,
    date: opts.formattedDate || undefined,
    time: opts.timeStr || undefined,
    status: opts.rawStatus || undefined,
    timer: timer != null && String(timer).trim() !== "" ? String(timer).trim() : null,
    venue,
    referee,
    commentaryAvailable,
    htScore,
    home: {
      id: opts.home.id,
      name: opts.home.name != null ? String(opts.home.name) : undefined,
      score: opts.home.score ?? null,
    },
    away: {
      id: opts.away.id,
      name: opts.away.name != null ? String(opts.away.name) : undefined,
      score: opts.away.score ?? null,
    },
  };

  if (events.length) payload.events = events;
  if (stats.length) payload.stats = stats;

  const raw: GoalserveMatchTimeline["raw"] = {};
  if (eventsRaw) raw.events = eventsRaw;
  if (liveStatsRaw) raw.liveStats = liveStatsRaw;
  if (match.ht ?? match["@ht"]) raw.ht = match.ht ?? match["@ht"];
  if (lineupRaw) raw.lineup = lineupRaw;
  if (lineupsRaw) raw.lineups = lineupsRaw;
  if (Object.keys(raw).length) payload.raw = raw;

  return payload;
}

export function readGoalserveMatchTimeline(value: unknown): GoalserveMatchTimeline | null {
  if (!value || typeof value !== "object") return null;
  return value as GoalserveMatchTimeline;
}

export function eventTypeLabel(type: string): string {
  const t = type.toLowerCase();
  if (t === "goal" || t === "g") return "Goal";
  if (t === "yellowcard" || t === "yellow" || t === "yc") return "Yellow card";
  if (t === "redcard" || t === "red" || t === "rc") return "Red card";
  if (t === "subst" || t === "substitution" || t.includes("sub")) return "Substitution";
  if (t === "penalty" || t === "pen") return "Penalty";
  if (t === "missed_penalty" || t === "penmiss") return "Missed penalty";
  if (t === "owngoal" || t === "og") return "Own goal";
  if (t.includes("var")) return "VAR";
  // Unknown types: humanise without implying a goal.
  const cleaned = type.replace(/_/g, " ").trim();
  return cleaned || "Event";
}

export function hasMeaningfulMatchStats(stats: GoalserveMatchStat[] | undefined | null): boolean {
  if (!stats?.length) return false;
  return stats.some((s) => Number.isFinite(s.home) || Number.isFinite(s.away));
}
