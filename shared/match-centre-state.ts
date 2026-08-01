/**
 * Match Centre presentation-state resolver.
 * Prefers raw Goalserve status (timeline.status); falls back to stored DB status.
 * Never infers LIVE/COMPLETED from kickoff elapsed time alone.
 * Terminal stored status wins over stale live/pre-event raw values.
 */

export type MatchCentrePresentationState =
  | "PRE_EVENT"
  | "LIVE"
  | "COMPLETED"
  | "POSTPONED"
  | "CANCELLED"
  | "ABANDONED";

export type MatchCentreState = {
  presentationState: MatchCentrePresentationState;
  isLive: boolean;
  isTerminal: boolean;
  shouldPoll: boolean;
  /** Provider interruptions that remain LIVE for polling but need clear labelling. */
  interruptionKind: "suspended" | "interrupted" | "delayed" | null;
  rawStatus: string;
  storedStatus: string;
};

const LIVE_POLL_MS = 15_000;
const SCHEDULED_POLL_MS = 30_000;
export const MATCH_CENTRE_PRE_KICKOFF_POLL_MS = 30 * 60 * 1000;
export const MATCH_CENTRE_POST_KICKOFF_POLL_MS = 90 * 60 * 1000;

/** Stored DB statuses that must not be overwritten by live/scheduled ingest. */
export const TERMINAL_STORED_STATUSES = [
  "finished",
  "postponed",
  "cancelled",
  "canceled",
  "abandoned",
] as const;

export type MatchCentrePollInput = {
  presentationState: MatchCentrePresentationState;
  kickoffTime?: string | Date | null;
  nowMs?: number;
};

function isTerminalPresentation(state: MatchCentrePresentationState): boolean {
  return (
    state === "COMPLETED" ||
    state === "POSTPONED" ||
    state === "CANCELLED" ||
    state === "ABANDONED"
  );
}

/** Normalize provider/DB status for storage (text column — no migration). */
export function normalizeGoalserveMatchStatus(rawStatus: string): string {
  const s = String(rawStatus ?? "").trim().toLowerCase();
  if (!s) return "scheduled";

  if (
    s === "ft" ||
    s === "aet" ||
    s === "pen." ||
    s === "full-time" ||
    s === "full time" ||
    s.includes("finished") ||
    s === "awarded" ||
    s.includes("awarded")
  ) {
    return "finished";
  }

  if (
    s === "ht" ||
    s === "et" ||
    s === "1st half" ||
    s === "2nd half" ||
    s === "live" ||
    s === "pen" ||
    s === "penalties" ||
    /^\d+$/.test(s) ||
    s === "susp." ||
    s === "suspended" ||
    s === "int." ||
    s === "interrupted" ||
    s === "delay" ||
    s === "delayed"
  ) {
    return "live";
  }

  if (s === "postp." || s === "postp" || s === "pstp" || s === "postponed" || s.includes("postpon")) {
    return "postponed";
  }

  if (
    s === "cancl." ||
    s === "canc." ||
    s === "cancelled" ||
    s === "canceled" ||
    s.includes("cancel")
  ) {
    return "cancelled";
  }

  if (s === "aban." || s === "abn" || s === "abandoned" || s.includes("abandon")) {
    return "abandoned";
  }

  if (s === "ns" || s === "not started" || /^\d{1,2}:\d{2}$/.test(s)) {
    return "scheduled";
  }

  // Unknown raw — fail safe to scheduled (not live/finished).
  return "scheduled";
}

/**
 * Prefer an existing terminal DB status over a stale live/scheduled ingest value.
 * Terminal → terminal updates are allowed (e.g. postponed → finished if awarded).
 */
export function preferStoredMatchStatus(
  existingStatus: string | null | undefined,
  incomingStatus: string,
): string {
  const existing = String(existingStatus ?? "").trim().toLowerCase();
  const incoming = String(incomingStatus ?? "").trim().toLowerCase() || "scheduled";
  const existingTerminal = (TERMINAL_STORED_STATUSES as readonly string[]).includes(existing);
  const incomingTerminal = (TERMINAL_STORED_STATUSES as readonly string[]).includes(incoming);
  if (existingTerminal && !incomingTerminal) return existing;
  return incoming;
}

function interruptionKindFromRaw(rawLower: string): MatchCentreState["interruptionKind"] {
  if (rawLower === "susp." || rawLower === "suspended" || rawLower.includes("suspend")) {
    return "suspended";
  }
  if (rawLower === "int." || rawLower === "interrupted" || rawLower.includes("interrupt")) {
    return "interrupted";
  }
  if (rawLower === "delay" || rawLower === "delayed" || rawLower.includes("delay")) {
    return "delayed";
  }
  return null;
}

function presentationFromRaw(rawLower: string): MatchCentrePresentationState | null {
  if (!rawLower) return null;

  if (
    rawLower === "ft" ||
    rawLower === "aet" ||
    rawLower === "pen." ||
    rawLower === "full-time" ||
    rawLower === "full time" ||
    rawLower.includes("finished") ||
    rawLower === "awarded" ||
    rawLower.includes("awarded")
  ) {
    return "COMPLETED";
  }

  if (
    rawLower === "postp." ||
    rawLower === "postp" ||
    rawLower === "pstp" ||
    rawLower === "postponed" ||
    rawLower.includes("postpon")
  ) {
    return "POSTPONED";
  }

  if (
    rawLower === "cancl." ||
    rawLower === "canc." ||
    rawLower === "cancelled" ||
    rawLower === "canceled" ||
    rawLower.includes("cancel")
  ) {
    return "CANCELLED";
  }

  if (
    rawLower === "aban." ||
    rawLower === "abn" ||
    rawLower === "abandoned" ||
    rawLower.includes("abandon")
  ) {
    return "ABANDONED";
  }

  const interruption = interruptionKindFromRaw(rawLower);
  if (
    /^\d+$/.test(rawLower) ||
    rawLower === "ht" ||
    rawLower === "et" ||
    rawLower === "1st half" ||
    rawLower === "2nd half" ||
    rawLower === "live" ||
    rawLower === "pen" ||
    rawLower === "penalties" ||
    interruption
  ) {
    return "LIVE";
  }

  if (rawLower === "ns" || rawLower === "not started" || /^\d{1,2}:\d{2}$/.test(rawLower)) {
    return "PRE_EVENT";
  }

  return null;
}

function presentationFromStored(storedLower: string): MatchCentrePresentationState {
  if (storedLower === "finished") return "COMPLETED";
  if (storedLower === "live") return "LIVE";
  if (storedLower === "postponed") return "POSTPONED";
  if (storedLower === "cancelled" || storedLower === "canceled") return "CANCELLED";
  if (storedLower === "abandoned") return "ABANDONED";
  return "PRE_EVENT";
}

/**
 * Resolve Match Centre presentation state from raw Goalserve + stored DB status.
 */
export function resolveMatchCentreState(input: {
  rawStatus?: string | null;
  storedStatus?: string | null;
}): MatchCentreState {
  const raw = String(input.rawStatus ?? "").trim();
  const stored = String(input.storedStatus ?? "").trim();
  const rawLower = raw.toLowerCase();
  const storedLower = stored.toLowerCase();

  const fromRaw = presentationFromRaw(rawLower);
  const fromStored = presentationFromStored(storedLower);

  // Stale live/pre raw must not reopen a terminal stored match.
  let presentationState: MatchCentrePresentationState;
  if (fromRaw && isTerminalPresentation(fromRaw)) {
    presentationState = fromRaw;
  } else if (isTerminalPresentation(fromStored) && (!fromRaw || !isTerminalPresentation(fromRaw))) {
    presentationState = fromStored;
  } else {
    presentationState = fromRaw ?? fromStored;
  }

  const isLive = presentationState === "LIVE";
  const isTerminal = isTerminalPresentation(presentationState);
  const interruptionKind =
    presentationState === "LIVE" ? interruptionKindFromRaw(rawLower) : null;

  return {
    presentationState,
    isLive,
    isTerminal,
    shouldPoll: !isTerminal,
    interruptionKind,
    rawStatus: raw || stored,
    storedStatus: stored,
  };
}

/** Client adaptive refetch interval (ms) or false to stop — core match only. */
export function matchCentreRefetchIntervalMs(input: MatchCentrePollInput): number | false {
  const { presentationState } = input;
  if (isTerminalPresentation(presentationState)) return false;
  if (presentationState === "LIVE") return LIVE_POLL_MS;

  if (presentationState === "PRE_EVENT" && input.kickoffTime) {
    const kickoffMs = new Date(input.kickoffTime).getTime();
    if (Number.isNaN(kickoffMs)) return false;
    const now = input.nowMs ?? Date.now();
    const diffMs = kickoffMs - now;
    const withinPre = diffMs > 0 && diffMs <= MATCH_CENTRE_PRE_KICKOFF_POLL_MS;
    const withinPost = diffMs <= 0 && -diffMs <= MATCH_CENTRE_POST_KICKOFF_POLL_MS;
    if (withinPre || withinPost) return SCHEDULED_POLL_MS;
  }

  return false;
}

export function matchCentreResultLabel(rawStatus?: string | null): string {
  const s = String(rawStatus ?? "").trim().toLowerCase();
  if (s === "aet") return "AET";
  if (s === "pen.") return "Penalties";
  if (s === "ft" || s === "full-time" || s === "full time" || s.includes("finished")) return "FT";
  if (s === "awarded" || s.includes("awarded")) return "Awarded";
  return "FT";
}

/** Prefer terminal raw timeline status over a later non-terminal raw value. */
export function preferTimelineRawStatus(
  existing?: string | null,
  incoming?: string | null,
): string | undefined {
  const a = String(existing ?? "").trim();
  const b = String(incoming ?? "").trim();
  if (!a) return b || undefined;
  if (!b) return a || undefined;
  const aState = presentationFromRaw(a.toLowerCase());
  const bState = presentationFromRaw(b.toLowerCase());
  if (aState && isTerminalPresentation(aState) && (!bState || !isTerminalPresentation(bState))) {
    return a;
  }
  return b || a;
}
