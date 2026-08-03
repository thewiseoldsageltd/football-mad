/**
 * Authoritative current-club resolution for Player Hub / squad APIs.
 *
 * Prefer a single active membership. Never pick between multiple distinct
 * current clubs without deterministic evidence — return none + ambiguous.
 */

export type PlayerCurrentClubSource = "active_membership" | "player_team_id" | "none";

export type PlayerMembershipSnapshot = {
  id: string;
  teamId: string;
  endDate?: Date | string | null;
  startDate?: Date | string | null;
  createdAt?: Date | string | null;
  lastSeenAt?: Date | string | null;
  shirtNumber?: string | null;
  position?: string | null;
};

export type PlayerCurrentClubResolution = {
  teamId: string | null;
  membershipId: string | null;
  source: PlayerCurrentClubSource;
  ambiguous: boolean;
  shirtNumber: string | null;
  position: string | null;
};

function toTime(value: Date | string | null | undefined): number {
  if (value == null) return 0;
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function isActivePlayerMembership(
  membership: Pick<PlayerMembershipSnapshot, "endDate">,
  now: Date = new Date(),
): boolean {
  if (membership.endDate == null || membership.endDate === "") return true;
  const end = toTime(membership.endDate);
  if (!end) return true;
  return end > now.getTime();
}

function membershipRecency(m: PlayerMembershipSnapshot): number {
  return Math.max(toTime(m.lastSeenAt), toTime(m.startDate), toTime(m.createdAt));
}

/**
 * Resolve one authoritative current club for a player.
 *
 * Rules:
 * 1. Active memberships only (`endDate` null or in the future).
 * 2. Exactly one distinct active team → that membership (most recent if duplicates).
 * 3. Multiple distinct active teams → ambiguous, no club.
 * 4. No active membership → fall back to `players.teamId` when present.
 * 5. Otherwise none.
 */
export function resolvePlayerCurrentClub(input: {
  playerTeamId?: string | null;
  memberships: PlayerMembershipSnapshot[];
  now?: Date;
}): PlayerCurrentClubResolution {
  const now = input.now ?? new Date();
  const active = input.memberships.filter((m) => isActivePlayerMembership(m, now));
  const distinctTeamIds = Array.from(new Set(active.map((m) => m.teamId).filter(Boolean)));

  if (distinctTeamIds.length > 1) {
    return {
      teamId: null,
      membershipId: null,
      source: "none",
      ambiguous: true,
      shirtNumber: null,
      position: null,
    };
  }

  if (distinctTeamIds.length === 1) {
    const teamId = distinctTeamIds[0]!;
    const candidates = active
      .filter((m) => m.teamId === teamId)
      .sort((a, b) => membershipRecency(b) - membershipRecency(a) || b.id.localeCompare(a.id));
    const chosen = candidates[0]!;
    const shirt =
      chosen.shirtNumber != null && String(chosen.shirtNumber).trim() !== ""
        ? String(chosen.shirtNumber).trim()
        : null;
    const position =
      chosen.position != null && String(chosen.position).trim() !== ""
        ? String(chosen.position).trim()
        : null;
    return {
      teamId,
      membershipId: chosen.id,
      source: "active_membership",
      ambiguous: false,
      shirtNumber: shirt,
      position,
    };
  }

  const fallbackTeamId =
    input.playerTeamId != null && String(input.playerTeamId).trim() !== ""
      ? String(input.playerTeamId)
      : null;

  if (fallbackTeamId) {
    return {
      teamId: fallbackTeamId,
      membershipId: null,
      source: "player_team_id",
      ambiguous: false,
      shirtNumber: null,
      position: null,
    };
  }

  return {
    teamId: null,
    membershipId: null,
    source: "none",
    ambiguous: false,
    shirtNumber: null,
    position: null,
  };
}

/** Broad position rank for teammate ordering (lower = earlier within same-group preference). */
export function playerPositionGroupRank(position: string | null | undefined): number {
  const p = String(position ?? "")
    .trim()
    .toUpperCase();
  if (p === "G" || p.startsWith("GOAL")) return 0;
  if (p === "D" || p.startsWith("DEF")) return 1;
  if (p === "M" || p.startsWith("MID")) return 2;
  if (p === "A" || p === "F" || p.startsWith("ATT") || p.startsWith("FWD") || p.startsWith("FOR"))
    return 3;
  return 4;
}

export function formatPlayerPositionLabel(position: string | null | undefined): string | null {
  if (position == null || String(position).trim() === "") return null;
  const p = String(position).trim();
  const upper = p.toUpperCase();
  if (upper === "G") return "Goalkeeper";
  if (upper === "D") return "Defender";
  if (upper === "M") return "Midfielder";
  if (upper === "A" || upper === "F") return "Forward";
  return p;
}

export function parseShirtNumber(
  value: string | number | null | undefined,
): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number.parseInt(String(value).trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export type PlayerHubTeammateCandidate = {
  id: string;
  slug: string;
  name: string;
  position?: string | null;
  shirtNumber?: string | number | null;
  imageUrl?: string | null;
};

/**
 * Deterministic teammate selection for Player Hub Phase A.
 *
 * Ordering:
 * 1. Same broad position group as the current player first
 * 2. Shirt number ascending (missing numbers last)
 * 3. Name ascending
 *
 * Cap defaults to 8. Callers should hide the section when the squad is sparse
 * (fewer than 3 other players) or current club is unresolved.
 */
export function selectPlayerHubTeammates(input: {
  currentPlayerId: string;
  currentPlayerPosition?: string | null;
  squad: PlayerHubTeammateCandidate[];
  limit?: number;
  minSquadOthers?: number;
}): PlayerHubTeammateCandidate[] {
  const limit = input.limit ?? 8;
  const minOthers = input.minSquadOthers ?? 3;
  const others = input.squad.filter((p) => p.id !== input.currentPlayerId);
  if (others.length < minOthers) return [];

  const focusGroup = playerPositionGroupRank(input.currentPlayerPosition);
  return [...others]
    .sort((a, b) => {
      const aSame = playerPositionGroupRank(a.position) === focusGroup ? 0 : 1;
      const bSame = playerPositionGroupRank(b.position) === focusGroup ? 0 : 1;
      if (aSame !== bSame) return aSame - bSame;
      const aShirt = parseShirtNumber(a.shirtNumber);
      const bShirt = parseShirtNumber(b.shirtNumber);
      if (aShirt == null && bShirt != null) return 1;
      if (aShirt != null && bShirt == null) return -1;
      if (aShirt != null && bShirt != null && aShirt !== bShirt) return aShirt - bShirt;
      return a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug) || a.id.localeCompare(b.id);
    })
    .slice(0, limit);
}
