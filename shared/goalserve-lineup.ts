/**
 * Parse Goalserve confirmed lineups from timeline.raw (or match node).
 * Never invents players or formations — returns null when data is absent/unusable.
 */

function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function attr(obj: Record<string, unknown>, key: string): string | null {
  const direct = obj[key];
  const at = obj[`@${key}`];
  const raw = direct ?? at;
  if (raw == null) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

function truthySubst(raw: unknown): boolean {
  if (raw == null || raw === "") return false;
  const s = String(raw).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

export type GoalserveLineupPlayer = {
  id: string | null;
  name: string;
  number: string | null;
  position: string | null;
  formationPos: number | null;
  isSubstitute: boolean;
};

export type GoalserveTeamLineup = {
  formation: string | null;
  starters: GoalserveLineupPlayer[];
  substitutes: GoalserveLineupPlayer[];
};

export type GoalserveParsedLineups = {
  /** Confirmed only for Phase 2; predicted reserved for later. */
  kind: "confirmed";
  home: GoalserveTeamLineup | null;
  away: GoalserveTeamLineup | null;
};

function parsePlayer(raw: unknown): GoalserveLineupPlayer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const name = attr(o, "name");
  if (!name) return null;
  const formationPosRaw = attr(o, "formation_pos") ?? attr(o, "formationPos");
  const formationPos = formationPosRaw != null ? Number(formationPosRaw) : NaN;
  const isSubstitute = truthySubst(o.isSubst ?? o["@isSubst"] ?? o.substitute ?? o["@substitute"]);
  return {
    id: attr(o, "id"),
    name,
    number: attr(o, "number") ?? attr(o, "num"),
    position: attr(o, "pos") ?? attr(o, "position"),
    formationPos: Number.isFinite(formationPos) ? formationPos : null,
    isSubstitute,
  };
}

function parseTeamBlock(raw: unknown): GoalserveTeamLineup | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const formation = attr(o, "formation");
  const playersRaw = o.player ?? o.players ?? o.starter ?? o.starters;
  const players = asArray(playersRaw).map(parsePlayer).filter(Boolean) as GoalserveLineupPlayer[];
  if (!players.length) return null;

  const starters = players
    .filter((p) => !p.isSubstitute)
    .sort((a, b) => (a.formationPos ?? 999) - (b.formationPos ?? 999));
  const substitutes = players.filter((p) => p.isSubstitute);

  // Some feeds list benches separately.
  const benchRaw = o.substitute ?? o.substitutes ?? o.bench;
  for (const b of asArray(benchRaw)) {
    const p = parsePlayer(b);
    if (p && !substitutes.some((s) => s.id && s.id === p.id)) {
      substitutes.push({ ...p, isSubstitute: true });
    }
  }

  if (!starters.length) return null;
  return { formation, starters, substitutes };
}

function extractTeamContainers(root: unknown): { home?: unknown; away?: unknown } {
  if (!root || typeof root !== "object") return {};
  const o = root as Record<string, unknown>;

  // lineups.teams.localteam / visitorteam
  const teams = o.teams;
  if (teams && typeof teams === "object") {
    const t = teams as Record<string, unknown>;
    return {
      home: t.localteam ?? t.home ?? t.localTeam,
      away: t.visitorteam ?? t.away ?? t.visitorTeam,
    };
  }

  // lineups.localteam / visitorteam
  if (o.localteam || o.visitorteam || o.home || o.away) {
    return {
      home: o.localteam ?? o.home ?? o.localTeam,
      away: o.visitorteam ?? o.away ?? o.visitorTeam,
    };
  }

  return {};
}

/**
 * Accept timeline.raw.lineups / lineup, or a raw match.lineups node.
 */
export function parseGoalserveLineups(raw: unknown): GoalserveParsedLineups | null {
  if (!raw || typeof raw !== "object") return null;

  const candidates: unknown[] = [raw];
  const o = raw as Record<string, unknown>;
  if (o.lineups) candidates.push(o.lineups);
  if (o.lineup) candidates.push(o.lineup);
  if (o.raw && typeof o.raw === "object") {
    const r = o.raw as Record<string, unknown>;
    if (r.lineups) candidates.push(r.lineups);
    if (r.lineup) candidates.push(r.lineup);
  }

  for (const candidate of candidates) {
    const { home, away } = extractTeamContainers(candidate);
    const homeParsed = parseTeamBlock(home);
    const awayParsed = parseTeamBlock(away);
    if (!homeParsed && !awayParsed) continue;
    return {
      kind: "confirmed",
      home: homeParsed,
      away: awayParsed,
    };
  }

  return null;
}

/** Formation string → outfield row sizes behind the GK (e.g. 4-3-3 → [4,3,3]). */
export function formationRowSizes(formation: string | null | undefined): number[] {
  if (!formation) return [4, 3, 3];
  const parts = formation
    .split(/[-–—]/)
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!parts.length) return [4, 3, 3];
  return parts;
}

export type PitchSide = "home" | "away";

export type PitchPlayerPlacement = {
  player: GoalserveLineupPlayer;
  /** 0–100 across the full dual pitch (home left, away right). */
  x: number;
  /** 0–100 top→bottom. */
  y: number;
};

/**
 * Place starters on a dual horizontal pitch.
 * Home attacks left→right (left half). Away attacks right→left (right half).
 */
export function placeLineupOnDualPitch(
  lineup: GoalserveTeamLineup,
  side: PitchSide,
): PitchPlayerPlacement[] {
  const starters = [...lineup.starters].sort(
    (a, b) => (a.formationPos ?? 999) - (b.formationPos ?? 999),
  );
  if (!starters.length) return [];

  const rows = formationRowSizes(lineup.formation);
  // GK + outfield rows
  const structure = [1, ...rows];
  const totalSlots = structure.reduce((a, b) => a + b, 0);
  // If player count doesn't match formation, fall back to even rows of 1.
  const usable =
    starters.length === totalSlots
      ? structure
      : [1, ...Array.from({ length: Math.max(1, starters.length - 1) }, () => 1)];

  const placements: PitchPlayerPlacement[] = [];
  let idx = 0;
  const rowCount = usable.length;

  for (let row = 0; row < rowCount; row++) {
    const count = usable[row];
    // Depth along attack: GK=0 … forward=1
    const depth = rowCount <= 1 ? 0 : row / (rowCount - 1);
    let x: number;
    if (side === "home") {
      // Left half: 6% → 44%
      x = 6 + depth * 38;
    } else {
      // Right half: 94% → 56% (attacking toward centre)
      x = 94 - depth * 38;
    }

    for (let i = 0; i < count && idx < starters.length; i++, idx++) {
      const y =
        count === 1 ? 50 : 12 + (i / (count - 1)) * 76;
      placements.push({ player: starters[idx], x, y });
    }
  }

  while (idx < starters.length) {
    const overflow = starters[idx++];
    const x = side === "home" ? 40 : 60;
    placements.push({ player: overflow, x, y: 50 });
  }

  return placements;
}
