import type { GoalserveMatchEvent } from "./goalserve-match-detail";
import { eventTypeLabel } from "./goalserve-match-detail";

export type TimelineSide = "HOME" | "AWAY" | "NEUTRAL";

export type TimelineTeamIdentity = {
  id?: string | null;
  goalserveTeamId?: string | null;
  name?: string | null;
  shortName?: string | null;
  slug?: string | null;
};

/** Optional richer ownership fields when present on parsed events. */
export type TimelineEventOwnership = GoalserveMatchEvent & {
  teamId?: string | null;
  teamName?: string | null;
};

function normalizeTeamToken(value: string | null | undefined): string {
  let n = String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
  // Safe suffix strip only — not fuzzy edit-distance matching.
  n = n.replace(/(afc|fc|cf|sc)$/i, "");
  return n;
}

function identityTokens(team: TimelineTeamIdentity | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!team) return out;
  for (const raw of [team.name, team.shortName, team.slug]) {
    const n = normalizeTeamToken(raw);
    if (n.length >= 3) out.add(n);
  }
  // Common abbreviation: "St. Mirren" / "St Mirren" → also keep without leading st
  for (const token of Array.from(out)) {
    if (token.startsWith("st") && token.length > 4) out.add(token.slice(2));
  }
  return out;
}

function isSystemNeutralType(type: string): boolean {
  const t = type.toLowerCase().replace(/[_\s.-]+/g, "");
  return (
    t === "ht" ||
    t === "halftime" ||
    t === "ft" ||
    t === "fulltime" ||
    t === "aet" ||
    t === "pen" ||
    t === "kickoff" ||
    t === "ko" ||
    t === "secondhalf" ||
    t === "2ndhalf" ||
    t === "extratime" ||
    t === "et" ||
    t.includes("suspend") ||
    t.includes("resume") ||
    t.includes("abandon") ||
    t.includes("interrupt")
  );
}

/**
 * Resolve which side of the split timeline an event belongs to.
 *
 * Priority:
 * 1. Structured Goalserve side (`event.team` home/away) — provider ownership
 * 2. Provider / Goalserve team ID vs fixture teams
 * 3. Canonical Football Mad team ID (when present on the event)
 * 4. Exact normalized name / shortName / slug match (no fuzzy guessing)
 * 5. NEUTRAL for system events or unknown ownership
 *
 * Never infers ownership from player identity alone.
 */
export function resolveTimelineEventSide(input: {
  event: TimelineEventOwnership;
  homeTeam: TimelineTeamIdentity;
  awayTeam: TimelineTeamIdentity;
}): TimelineSide {
  const { event, homeTeam, awayTeam } = input;

  if (isSystemNeutralType(event.type)) return "NEUTRAL";

  // 1. Structured provider side (localteam / visitorteam → home / away)
  if (event.team === "home") return "HOME";
  if (event.team === "away") return "AWAY";

  const eventTeamId = String(event.teamId ?? "").trim();
  if (eventTeamId) {
    // 2. Goalserve team IDs
    if (homeTeam.goalserveTeamId && eventTeamId === String(homeTeam.goalserveTeamId)) return "HOME";
    if (awayTeam.goalserveTeamId && eventTeamId === String(awayTeam.goalserveTeamId)) return "AWAY";
    // 3. Canonical FM team IDs
    if (homeTeam.id && eventTeamId === String(homeTeam.id)) return "HOME";
    if (awayTeam.id && eventTeamId === String(awayTeam.id)) return "AWAY";
  }

  // 4. Normalized name match only (exact token equality after normalization)
  const nameToken = normalizeTeamToken(event.teamName);
  if (nameToken) {
    const homeTokens = identityTokens(homeTeam);
    const awayTokens = identityTokens(awayTeam);
    const homeHit = homeTokens.has(nameToken);
    const awayHit = awayTokens.has(nameToken);
    if (homeHit && !awayHit) return "HOME";
    if (awayHit && !homeHit) return "AWAY";
    // Ambiguous or no match → neutral
  }

  return "NEUTRAL";
}

export function formatTimelineMinute(event: Pick<GoalserveMatchEvent, "minute" | "extraMin">): string {
  const minute = String(event.minute ?? "").trim();
  const extra = String(event.extraMin ?? "").trim();
  if (!minute && !extra) return "";
  if (extra) {
    const base = minute || "90";
    return `${base}+${extra}'`;
  }
  if (minute.includes("'")) return minute;
  return `${minute}'`;
}

export function isDisallowedGoalPresentation(event: GoalserveMatchEvent): boolean {
  const t = event.type.toLowerCase();
  const detail = `${event.assist ?? ""} ${event.result ?? ""} ${event.player ?? ""}`.toLowerCase();
  return (
    (t.includes("var") && (detail.includes("disallow") || detail.includes("cancel") || detail.includes("handball"))) ||
    t.includes("disallow") ||
    t.includes("cancel")
  );
}

export function timelineEventKind(
  event: GoalserveMatchEvent,
):
  | "goal"
  | "own_goal"
  | "penalty"
  | "missed_penalty"
  | "yellow"
  | "red"
  | "substitution"
  | "var"
  | "disallowed"
  | "period"
  | "other" {
  const t = event.type.toLowerCase();
  if (isDisallowedGoalPresentation(event)) return "disallowed";
  if (t.includes("var")) return "var";
  if (t === "owngoal" || t === "og") return "own_goal";
  if (t === "missed_penalty" || t === "penmiss") return "missed_penalty";
  if (t === "penalty" || t === "pen") return "penalty";
  if (t === "goal" || t === "g") return "goal";
  if (t === "yellowcard" || t === "yellow" || t === "yc") return "yellow";
  if (t === "redcard" || t === "red" || t === "rc") return "red";
  if (t === "subst" || t === "substitution" || t.includes("sub")) return "substitution";
  if (isSystemNeutralType(event.type)) return "period";
  return "other";
}

export function timelineEventTitle(event: GoalserveMatchEvent): string {
  const kind = timelineEventKind(event);
  if (kind === "disallowed") return "Goal disallowed";
  if (kind === "var") return "VAR";
  if (kind === "own_goal") return "Own goal";
  if (kind === "missed_penalty") return "Missed penalty";
  if (kind === "penalty") return "Penalty";
  if (kind === "goal") return "Goal";
  if (kind === "yellow") return "Yellow card";
  if (kind === "red") return "Red card";
  if (kind === "substitution") return "Substitution";
  if (kind === "period") return eventTypeLabel(event.type);
  return eventTypeLabel(event.type);
}

/** Enhance parser capture without breaking existing events. */
export function withOptionalOwnershipFields(
  event: GoalserveMatchEvent,
  raw?: Record<string, unknown> | null,
): TimelineEventOwnership {
  if (!raw) return event;
  const teamId = String(raw["@team_id"] ?? raw.team_id ?? raw.teamId ?? "").trim() || null;
  const teamName = String(raw["@team_name"] ?? raw.team_name ?? raw.teamName ?? "").trim() || null;
  return {
    ...event,
    ...(teamId ? { teamId } : {}),
    ...(teamName ? { teamName } : {}),
  };
}
