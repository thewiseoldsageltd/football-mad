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
    });
  }
  return out;
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
  const referee = String(match["@referee"] ?? match.referee ?? "").trim() || null;
  const venue = String(match["@venue"] ?? match.venue ?? "").trim() || null;
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
  return type.replace(/_/g, " ");
}
