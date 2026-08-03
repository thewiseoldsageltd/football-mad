/**
 * Pure helpers for reconciling player-team memberships against squad snapshots
 * and independent Goalserve evidence.
 */

export type MembershipCloseCandidate = {
  id: string;
  playerId: string;
  teamId: string;
};

/**
 * Observed priority-league open-squad minima (staging, Aug 2026):
 * Scottish Divisions ~22, EFL/PL ~24–26. Guard below that floor with margin.
 */
export const MIN_AUTHORITATIVE_SQUAD_SIZE = 18;

/**
 * Memberships on a team that should close because the player is absent from
 * an authoritative non-empty squad snapshot.
 */
export function selectMembershipsToClose(input: {
  teamId: string;
  presentPlayerIds: Iterable<string>;
  openMembershipsForTeam: MembershipCloseCandidate[];
}): MembershipCloseCandidate[] {
  const present = new Set(
    Array.from(input.presentPlayerIds).filter((id) => typeof id === "string" && id.length > 0),
  );
  if (present.size === 0) return [];
  return input.openMembershipsForTeam.filter(
    (m) => m.teamId === input.teamId && !present.has(m.playerId),
  );
}

/**
 * Whether a squad feed for one team is safe to reconcile (close absentees).
 * Empty/malformed/partial squads must not close anyone.
 */
export function isAuthoritativeSquadSnapshot(
  playerCount: number,
  opts?: { minPlayers?: number },
): boolean {
  const min = opts?.minPlayers ?? MIN_AUTHORITATIVE_SQUAD_SIZE;
  return Number.isFinite(playerCount) && playerCount >= min;
}

export type MembershipRepairEvidenceClass =
  | "SAFE_BOTH_SIGNALS"
  | "SAFE_CURRENT_SQUAD"
  | "SAFE_PLAYER_PROFILE"
  | "CONFLICT"
  | "INSUFFICIENT_EVIDENCE";

export type MembershipRepairEvidenceInput = {
  /** Open memberships on distinct teams (caller ensures multi-team). */
  openMemberships: Array<{
    id: string;
    teamId: string;
    lastSeenAt?: Date | string | null;
    startDate?: Date | string | null;
  }>;
  /**
   * FM team id implied by Goalserve soccerstats/player teamid (mapped), if known.
   * Null when profile missing / unmapped.
   */
  profileTeamId?: string | null;
  /**
   * Per competing FM teamId: whether the Goalserve player appears in that team's
   * latest authoritative squad snapshot. Omit teams whose squad could not be validated.
   */
  squadPresenceByTeamId?: Record<string, boolean | null | undefined>;
  /** Supporting only — never sole authority for a close. */
  playerTeamId?: string | null;
};

export type MembershipRepairDecision = {
  classification: MembershipRepairEvidenceClass;
  action: "close_others" | "leave";
  keepMembershipId: string | null;
  keepTeamId: string | null;
  closeMembershipIds: string[];
  reason: string;
  writable: boolean;
};

function pickMembershipForTeam(
  openMemberships: MembershipRepairEvidenceInput["openMemberships"],
  teamId: string,
): { id: string; teamId: string } | null {
  const matching = openMemberships.filter((m) => m.teamId === teamId);
  if (matching.length === 0) return null;
  const keep = [...matching].sort((a, b) => {
    const ta = Math.max(
      a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0,
      a.startDate ? new Date(a.startDate).getTime() : 0,
    );
    const tb = Math.max(
      b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0,
      b.startDate ? new Date(b.startDate).getTime() : 0,
    );
    return tb - ta || b.id.localeCompare(a.id);
  })[0]!;
  return { id: keep.id, teamId: keep.teamId };
}

function decisionForKeep(
  classification: MembershipRepairEvidenceClass,
  openMemberships: MembershipRepairEvidenceInput["openMemberships"],
  keepTeamId: string,
  reason: string,
): MembershipRepairDecision {
  const keep = pickMembershipForTeam(openMemberships, keepTeamId);
  if (!keep) {
    return {
      classification: "INSUFFICIENT_EVIDENCE",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "keep_team_not_in_open_memberships",
      writable: false,
    };
  }
  const closeMembershipIds = openMemberships.filter((m) => m.id !== keep.id).map((m) => m.id);
  const writable =
    classification === "SAFE_BOTH_SIGNALS" ||
    classification === "SAFE_CURRENT_SQUAD" ||
    classification === "SAFE_PLAYER_PROFILE";
  return {
    classification,
    action: writable ? "close_others" : "leave",
    keepMembershipId: keep.id,
    keepTeamId: keep.teamId,
    closeMembershipIds: writable ? closeMembershipIds : [],
    reason,
    writable,
  };
}

/**
 * Classify a multi-current membership repair using independent Goalserve evidence.
 * `players.teamId` alone never authorises a close.
 */
export function classifyMultiCurrentMembershipRepair(
  input: MembershipRepairEvidenceInput,
): MembershipRepairDecision {
  const distinctTeams = Array.from(new Set(input.openMemberships.map((m) => m.teamId)));
  if (distinctTeams.length <= 1) {
    return {
      classification: "INSUFFICIENT_EVIDENCE",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "not_multi_team",
      writable: false,
    };
  }

  const profileTeamId =
    input.profileTeamId != null && String(input.profileTeamId).trim() !== ""
      ? String(input.profileTeamId)
      : null;
  const profileAmongOpen =
    profileTeamId && distinctTeams.includes(profileTeamId) ? profileTeamId : null;
  const profileOutsideOpen = Boolean(profileTeamId && !profileAmongOpen);

  const presence = input.squadPresenceByTeamId ?? {};
  const knownPresence = distinctTeams
    .map((teamId) => ({ teamId, present: presence[teamId] }))
    .filter((row) => row.present === true || row.present === false);

  const presentTeams = knownPresence.filter((row) => row.present === true).map((row) => row.teamId);
  const absentTeams = knownPresence.filter((row) => row.present === false).map((row) => row.teamId);

  let squadKeep: string | null = null;
  if (presentTeams.length === 1) {
    const candidate = presentTeams[0]!;
    // Require all *other* competing teams that we could validate to show absence.
    const otherValidated = distinctTeams.filter(
      (id) => id !== candidate && (presence[id] === true || presence[id] === false),
    );
    const allValidatedOthersAbsent = otherValidated.every((id) => presence[id] === false);
    if (allValidatedOthersAbsent && otherValidated.length >= 1) {
      squadKeep = candidate;
    } else if (otherValidated.length === 0 && distinctTeams.length === 2) {
      // Only one squad validated present; other unknown → not enough for SAFE_CURRENT_SQUAD alone.
      squadKeep = null;
    }
  } else if (presentTeams.length > 1) {
    return {
      classification: "CONFLICT",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "present_in_multiple_competing_squads",
      writable: false,
    };
  }

  if (profileAmongOpen && squadKeep && profileAmongOpen === squadKeep) {
    return decisionForKeep(
      "SAFE_BOTH_SIGNALS",
      input.openMemberships,
      profileAmongOpen,
      "profile_and_squad_agree",
    );
  }

  if (profileAmongOpen && squadKeep && profileAmongOpen !== squadKeep) {
    return {
      classification: "CONFLICT",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "profile_vs_squad_conflict",
      writable: false,
    };
  }

  if (profileOutsideOpen && squadKeep) {
    return {
      classification: "CONFLICT",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "profile_team_outside_open_memberships",
      writable: false,
    };
  }

  if (squadKeep && !profileTeamId) {
    return decisionForKeep(
      "SAFE_CURRENT_SQUAD",
      input.openMemberships,
      squadKeep,
      "authoritative_squad_presence",
    );
  }

  if (squadKeep && profileTeamId && !profileAmongOpen) {
    // Profile unmapped/outside but squad clear — treat as conflict for safety.
    return {
      classification: "CONFLICT",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "squad_keep_but_profile_unmapped_or_outside",
      writable: false,
    };
  }

  if (profileAmongOpen && !squadKeep) {
    const conflictsWithSquad = presentTeams.some((t) => t !== profileAmongOpen);
    if (conflictsWithSquad) {
      return {
        classification: "CONFLICT",
        action: "leave",
        keepMembershipId: null,
        keepTeamId: null,
        closeMembershipIds: [],
        reason: "profile_vs_partial_squad_conflict",
        writable: false,
      };
    }
    return decisionForKeep(
      "SAFE_PLAYER_PROFILE",
      input.openMemberships,
      profileAmongOpen,
      "goalserve_player_profile_teamid",
    );
  }

  // players.teamId alone — explicitly insufficient.
  if (input.playerTeamId && distinctTeams.includes(input.playerTeamId) && !profileAmongOpen && !squadKeep) {
    return {
      classification: "INSUFFICIENT_EVIDENCE",
      action: "leave",
      keepMembershipId: null,
      keepTeamId: null,
      closeMembershipIds: [],
      reason: "player_team_id_only_not_sufficient",
      writable: false,
    };
  }

  return {
    classification: "INSUFFICIENT_EVIDENCE",
    action: "leave",
    keepMembershipId: null,
    keepTeamId: null,
    closeMembershipIds: [],
    reason: absentTeams.length || presentTeams.length ? "inconclusive_signals" : "no_independent_evidence",
    writable: false,
  };
}

export function extractGoalservePlayerProfileTeamId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const playersNode = root.players;
  let node: unknown = root.player ?? playersNode;
  if (playersNode && typeof playersNode === "object" && !Array.isArray(playersNode)) {
    node = (playersNode as Record<string, unknown>).player ?? playersNode;
  }
  if (Array.isArray(node)) node = node[0];
  if (!node || typeof node !== "object") return null;
  const rec = node as Record<string, unknown>;
  const raw = rec.teamid ?? rec.teamId ?? rec["@teamid"] ?? rec["@teamId"];
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}
