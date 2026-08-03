/**
 * Parse Goalserve soccerstats/player/{id} payloads for Player Hub Phase C.
 */

import {
  parseGoalserveInt,
  parseGoalserveSquadPlayerStats,
  type PlayerSeasonStatsRow,
  toCurrentSeasonStatsApi,
  type PlayerHubCurrentSeasonStats,
} from "./player-season-stats";

export type CareerCategory =
  | "domestic_league"
  | "domestic_cup"
  | "european"
  | "international";

export const CAREER_CATEGORY_LABELS: Record<CareerCategory, string> = {
  domestic_league: "Domestic league",
  domestic_cup: "Domestic cups",
  european: "European competitions",
  international: "International",
};

export type ParsedPlayerIdentity = {
  commonName: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  nationality: string | null;
  dateOfBirth: Date | null;
  dateOfBirthRaw: string | null;
  age: number | null;
  birthPlace: string | null;
  birthCountry: string | null;
  position: string | null;
  heightCm: number | null;
  weightKg: number | null;
  preferredFoot: string | null;
  marketValueEur: number | null;
  goalserveNationalTeamId: string | null;
  goalserveCurrentTeamId: string | null;
  goalserveCurrentTeamName: string | null;
  hasImagePayload: boolean;
};

export type ParsedCareerSeason = PlayerSeasonStatsRow & {
  category: CareerCategory;
  season: string;
  clubName: string | null;
  goalserveClubId: string | null;
  competitionName: string | null;
  goalserveCompetitionId: string | null;
};

export type ParsedCareerTotals = PlayerSeasonStatsRow & {
  scope: "overall_clubs";
};

export type ParsedTransfer = {
  transferDate: Date | null;
  transferDateRaw: string | null;
  fromClubName: string | null;
  fromGoalserveClubId: string | null;
  toClubName: string | null;
  toGoalserveClubId: string | null;
  fee: string | null;
  transferType: string | null;
  sortIndex: number;
};

export type ParsedSidelined = {
  kind: "injury" | "suspension" | "other";
  typeLabel: string;
  dateStart: Date | null;
  dateEnd: Date | null;
  dateStartRaw: string | null;
  dateEndRaw: string | null;
  gamesMissed: number | null;
  sortIndex: number;
};

export type ParsedHonour = {
  competition: string;
  country: string | null;
  status: string | null;
  count: number | null;
  seasonsRaw: string | null;
  sortIndex: number;
};

export type ParsedPlayerProfile = {
  identity: ParsedPlayerIdentity;
  careerSeasons: ParsedCareerSeason[];
  careerTotals: ParsedCareerTotals | null;
  transfers: ParsedTransfer[];
  sidelined: ParsedSidelined[];
  honours: ParsedHonour[];
};

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function textOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).replace(/\s+/g, " ").trim();
  return s.length ? s : null;
}

/** Parse Goalserve DD.MM.YYYY (and optional time) into UTC midnight Date. */
export function parseGoalserveDate(value: unknown): Date | null {
  const raw = textOrNull(value);
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return null;
  const d = new Date(Date.UTC(yyyy, mm - 1, dd));
  return Number.isNaN(d.getTime()) ? null : d;
}

function attr(obj: Record<string, unknown>, key: string): unknown {
  if (obj[key] !== undefined) return obj[key];
  const at = `@${key}`;
  if (obj[at] !== undefined) return obj[at];
  return undefined;
}

export function extractGoalservePlayerNode(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  const playersNode = root.players ?? root.player;
  if (!playersNode || typeof playersNode !== "object") return null;
  const node = playersNode as Record<string, unknown>;
  const player = node.player ?? node;
  if (Array.isArray(player)) {
    const first = player[0];
    return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
  }
  return typeof player === "object" ? (player as Record<string, unknown>) : null;
}

function classifySidelined(typeLabel: string): "injury" | "suspension" | "other" {
  const t = typeLabel.toLowerCase();
  if (/(suspend|ban|red card|yellow card|sending.?off|disciplinary)/i.test(t)) return "suspension";
  if (/(injur|strain|fracture|hamstring|ankle|knee|groin|muscle|illness|virus|covid|thigh|calf|foot|back|hip|shoulder|concussion|knock|fitness)/i.test(t)) {
    return "injury";
  }
  return "other";
}

function parseSeasonClubNode(
  node: unknown,
  category: CareerCategory,
): ParsedCareerSeason | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const season = textOrNull(attr(obj, "season"));
  if (!season) return null;
  const stats = parseGoalserveSquadPlayerStats(obj);
  return {
    category,
    season,
    clubName: textOrNull(attr(obj, "name")),
    goalserveClubId: textOrNull(attr(obj, "id")),
    competitionName: textOrNull(attr(obj, "league")),
    goalserveCompetitionId: textOrNull(attr(obj, "league_id")),
    ...stats,
  };
}

function parseOverallStats(node: unknown): ParsedCareerTotals | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const stats = parseGoalserveSquadPlayerStats(obj);
  // overall uses @minutesPlayed instead of @minutes
  const minutes =
    stats.minutes ??
    parseGoalserveInt(attr(obj, "minutesPlayed") ?? attr(obj, "minutes"));
  const hasAny = Object.values({ ...stats, minutes }).some((v) => v != null);
  if (!hasAny) return null;
  return { scope: "overall_clubs", ...stats, minutes };
}

export function parseGoalservePlayerProfile(payload: unknown): ParsedPlayerProfile | null {
  const p = extractGoalservePlayerNode(payload);
  if (!p) return null;

  const identity: ParsedPlayerIdentity = {
    commonName: textOrNull(attr(p, "common_name")),
    firstName: textOrNull(p.firstname ?? attr(p, "firstname")),
    lastName: textOrNull(p.lastname ?? attr(p, "lastname")),
    fullName: textOrNull(p.name ?? attr(p, "name")),
    nationality: textOrNull(p.nationality ?? attr(p, "nationality")),
    dateOfBirthRaw: textOrNull(p.birthdate ?? attr(p, "birthdate")),
    dateOfBirth: parseGoalserveDate(p.birthdate ?? attr(p, "birthdate")),
    age: parseGoalserveInt(p.age ?? attr(p, "age")),
    birthPlace: textOrNull(p.birthplace ?? attr(p, "birthplace")),
    birthCountry: textOrNull(p.birthcountry ?? attr(p, "birthcountry")),
    position: textOrNull(p.position ?? attr(p, "position")),
    heightCm: parseGoalserveInt(p.height ?? attr(p, "height")),
    weightKg: parseGoalserveInt(p.weight ?? attr(p, "weight")),
    preferredFoot: textOrNull(p.preferredFoot ?? attr(p, "preferredFoot")),
    marketValueEur: parseGoalserveInt(p.marketValueEUR ?? attr(p, "marketValueEUR")),
    goalserveNationalTeamId: textOrNull(attr(p, "national_team_id")),
    goalserveCurrentTeamId: textOrNull(p.teamid ?? attr(p, "teamid")),
    goalserveCurrentTeamName: textOrNull(p.team ?? attr(p, "team")),
    hasImagePayload: Boolean(textOrNull(p.image ?? attr(p, "image"))),
  };

  const careerSeasons: ParsedCareerSeason[] = [];
  const sections: Array<{ key: string; category: CareerCategory }> = [
    { key: "statistic", category: "domestic_league" },
    { key: "statistic_cups", category: "domestic_cup" },
    { key: "statistic_cups_intl", category: "european" },
    { key: "statistic_intl", category: "international" },
  ];
  for (const { key, category } of sections) {
    const section = p[key];
    if (!section || typeof section !== "object") continue;
    const clubs = asArray((section as Record<string, unknown>).club);
    for (const club of clubs) {
      const row = parseSeasonClubNode(club, category);
      if (row) careerSeasons.push(row);
    }
  }

  const overallNode =
    p.overall_clubs && typeof p.overall_clubs === "object"
      ? (p.overall_clubs as Record<string, unknown>).stats
      : null;
  const careerTotals = parseOverallStats(overallNode);

  const transfers: ParsedTransfer[] = [];
  const transferNodes = asArray(
    p.transfers && typeof p.transfers === "object"
      ? (p.transfers as Record<string, unknown>).transfer ??
          (p.transfers as Record<string, unknown>).item
      : null,
  );
  transferNodes.forEach((node, sortIndex) => {
    if (!node || typeof node !== "object") return;
    const t = node as Record<string, unknown>;
    const raw = textOrNull(attr(t, "date"));
    transfers.push({
      transferDate: parseGoalserveDate(raw),
      transferDateRaw: raw,
      fromClubName: textOrNull(attr(t, "from")),
      fromGoalserveClubId: textOrNull(attr(t, "from_id")),
      toClubName: textOrNull(attr(t, "to")),
      toGoalserveClubId: textOrNull(attr(t, "to_id")),
      fee: textOrNull(attr(t, "price")),
      transferType: textOrNull(attr(t, "type")),
      sortIndex,
    });
  });

  const sidelined: ParsedSidelined[] = [];
  const sideNodes = asArray(
    p.sidelined && typeof p.sidelined === "object"
      ? (p.sidelined as Record<string, unknown>).item
      : null,
  );
  sideNodes.forEach((node, sortIndex) => {
    if (!node || typeof node !== "object") return;
    const s = node as Record<string, unknown>;
    const typeLabel = textOrNull(attr(s, "type"));
    if (!typeLabel) return;
    const startRaw = textOrNull(attr(s, "date_start"));
    const endRaw = textOrNull(attr(s, "date_end"));
    sidelined.push({
      kind: classifySidelined(typeLabel),
      typeLabel,
      dateStart: parseGoalserveDate(startRaw),
      dateEnd: parseGoalserveDate(endRaw),
      dateStartRaw: startRaw,
      dateEndRaw: endRaw,
      gamesMissed: parseGoalserveInt(
        attr(s, "games_missed") ?? attr(s, "gamesMissed") ?? attr(s, "missed"),
      ),
      sortIndex,
    });
  });

  const honours: ParsedHonour[] = [];
  const trophyNodes = asArray(
    p.trophies && typeof p.trophies === "object"
      ? (p.trophies as Record<string, unknown>).trophy
      : null,
  );
  trophyNodes.forEach((node, sortIndex) => {
    if (!node || typeof node !== "object") return;
    const h = node as Record<string, unknown>;
    const competition = textOrNull(attr(h, "league"));
    if (!competition) return;
    honours.push({
      competition,
      country: textOrNull(attr(h, "country")),
      status: textOrNull(attr(h, "status")),
      count: parseGoalserveInt(attr(h, "count")),
      seasonsRaw: textOrNull(attr(h, "seasons")),
      sortIndex,
    });
  });

  return { identity, careerSeasons, careerTotals, transfers, sidelined, honours };
}

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

/**
 * Merge Goalserve identity into existing player row without clobbering better FM values.
 * Always refreshes Goalserve club metadata + profileSyncedAt when provided.
 */
export function buildSafePlayerIdentityUpdate(
  existing: {
    nationality?: string | null;
    age?: number | null;
    position?: string | null;
    marketValue?: string | null;
    commonName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    dateOfBirth?: Date | null;
    birthPlace?: string | null;
    birthCountry?: string | null;
    heightCm?: number | null;
    weightKg?: number | null;
    preferredFoot?: string | null;
    marketValueEur?: number | null;
    goalserveNationalTeamId?: string | null;
  },
  identity: ParsedPlayerIdentity,
  syncedAt: Date,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    profileSyncedAt: syncedAt,
    goalserveCurrentTeamId: identity.goalserveCurrentTeamId,
    goalserveCurrentTeamName: identity.goalserveCurrentTeamName,
  };

  const fill = <K extends string>(key: K, next: unknown, current: unknown) => {
    if (next == null || next === "") return;
    if (isBlank(current)) patch[key] = next;
  };

  fill("commonName", identity.commonName, existing.commonName);
  fill("firstName", identity.firstName, existing.firstName);
  fill("lastName", identity.lastName, existing.lastName);
  fill("nationality", identity.nationality, existing.nationality);
  fill("dateOfBirth", identity.dateOfBirth, existing.dateOfBirth);
  fill("birthPlace", identity.birthPlace, existing.birthPlace);
  fill("birthCountry", identity.birthCountry, existing.birthCountry);
  fill("heightCm", identity.heightCm, existing.heightCm);
  fill("weightKg", identity.weightKg, existing.weightKg);
  fill("preferredFoot", identity.preferredFoot, existing.preferredFoot);
  fill("goalserveNationalTeamId", identity.goalserveNationalTeamId, existing.goalserveNationalTeamId);
  fill("marketValueEur", identity.marketValueEur, existing.marketValueEur);
  if (identity.marketValueEur != null && isBlank(existing.marketValue)) {
    patch.marketValue = `€${identity.marketValueEur.toLocaleString("en-GB")}`;
  }
  // Age: refresh when Goalserve supplies a value (derived from DOB, stays current)
  if (identity.age != null) patch.age = identity.age;
  // Position: only fill if empty — squad sync short codes are preferred when present
  fill("position", identity.position, existing.position);

  return patch;
}

export type PlayerHubIdentity = {
  commonName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  birthPlace?: string;
  birthCountry?: string;
  nationality?: string;
  heightCm?: number;
  weightKg?: number;
  preferredFoot?: string;
  marketValueEur?: number;
  goalserveClub?: { id: string; name: string };
};

export type PlayerHubCareerSeason = {
  season: string;
  clubName?: string;
  competitionName?: string;
  appearances?: number;
  starts?: number;
  minutes?: number;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  saves?: number;
  goalsConceded?: number;
  rating?: number;
};

export type PlayerHubCareer = {
  totals?: PlayerHubCurrentSeasonStats;
  domesticLeague?: PlayerHubCareerSeason[];
  domesticCups?: PlayerHubCareerSeason[];
  european?: PlayerHubCareerSeason[];
  international?: PlayerHubCareerSeason[];
};

export type PlayerHubTransfer = {
  date?: string;
  dateRaw?: string;
  fromClub?: string;
  toClub?: string;
  fee?: string;
  type?: string;
};

export type PlayerHubSidelined = {
  kind?: string;
  type: string;
  start?: string;
  end?: string;
  startRaw?: string;
  endRaw?: string;
  gamesMissed?: number;
};

export type PlayerHubHonour = {
  competition: string;
  country?: string;
  status?: string;
  count?: number;
  seasons: string[];
};

function toIsoDate(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return d.toISOString().slice(0, 10);
}

function compactCareerSeason(row: {
  season: string;
  clubName?: string | null;
  competitionName?: string | null;
  appearances?: number | null;
  starts?: number | null;
  minutes?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellowCards?: number | null;
  redCards?: number | null;
  saves?: number | null;
  goalsConceded?: number | null;
  rating?: number | null;
}): PlayerHubCareerSeason {
  const out: PlayerHubCareerSeason = { season: row.season };
  if (row.clubName) out.clubName = row.clubName;
  if (row.competitionName) out.competitionName = row.competitionName;
  if (row.appearances != null) out.appearances = row.appearances;
  if (row.starts != null) out.starts = row.starts;
  if (row.minutes != null) out.minutes = row.minutes;
  if (row.goals != null) out.goals = row.goals;
  if (row.assists != null) out.assists = row.assists;
  if (row.yellowCards != null) out.yellowCards = row.yellowCards;
  if (row.redCards != null) out.redCards = row.redCards;
  if (row.saves != null) out.saves = row.saves;
  if (row.goalsConceded != null) out.goalsConceded = row.goalsConceded;
  if (row.rating != null) out.rating = Math.round(row.rating * 100) / 100;
  return out;
}

function sortSeasonsDesc(a: string, b: string): number {
  return b.localeCompare(a);
}

export function buildPlayerHubIdentityApi(player: {
  commonName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: Date | null;
  birthPlace?: string | null;
  birthCountry?: string | null;
  nationality?: string | null;
  heightCm?: number | null;
  weightKg?: number | null;
  preferredFoot?: string | null;
  marketValueEur?: number | null;
  goalserveCurrentTeamId?: string | null;
  goalserveCurrentTeamName?: string | null;
}): PlayerHubIdentity | null {
  const out: PlayerHubIdentity = {};
  if (player.commonName) out.commonName = player.commonName;
  if (player.firstName) out.firstName = player.firstName;
  if (player.lastName) out.lastName = player.lastName;
  const dob = toIsoDate(player.dateOfBirth ?? undefined);
  if (dob) out.dateOfBirth = dob;
  if (player.birthPlace) out.birthPlace = player.birthPlace;
  if (player.birthCountry) out.birthCountry = player.birthCountry;
  if (player.nationality) out.nationality = player.nationality;
  if (player.heightCm != null) out.heightCm = player.heightCm;
  if (player.weightKg != null) out.weightKg = player.weightKg;
  if (player.preferredFoot) out.preferredFoot = player.preferredFoot;
  if (player.marketValueEur != null) out.marketValueEur = player.marketValueEur;
  if (player.goalserveCurrentTeamId && player.goalserveCurrentTeamName) {
    out.goalserveClub = {
      id: player.goalserveCurrentTeamId,
      name: player.goalserveCurrentTeamName,
    };
  }
  return Object.keys(out).length ? out : null;
}

export function buildPlayerHubCareerApi(input: {
  totals: Partial<PlayerSeasonStatsRow> | null;
  seasons: Array<{
    category: string;
    season: string;
    clubName?: string | null;
    competitionName?: string | null;
    appearances?: number | null;
    starts?: number | null;
    minutes?: number | null;
    goals?: number | null;
    assists?: number | null;
    yellowCards?: number | null;
    redCards?: number | null;
    saves?: number | null;
    goalsConceded?: number | null;
    rating?: number | null;
  }>;
}): PlayerHubCareer | null {
  const out: PlayerHubCareer = {};
  if (input.totals) {
    const totals = toCurrentSeasonStatsApi(input.totals);
    if (totals) out.totals = totals;
  }
  const byCat = (cat: CareerCategory) =>
    input.seasons
      .filter((s) => s.category === cat)
      .sort((a, b) => sortSeasonsDesc(a.season, b.season))
      .map(compactCareerSeason);

  const domesticLeague = byCat("domestic_league");
  const domesticCups = byCat("domestic_cup");
  const european = byCat("european");
  const international = byCat("international");
  if (domesticLeague.length) out.domesticLeague = domesticLeague;
  if (domesticCups.length) out.domesticCups = domesticCups;
  if (european.length) out.european = european;
  if (international.length) out.international = international;

  if (!out.totals && !out.domesticLeague && !out.domesticCups && !out.european && !out.international) {
    return null;
  }
  return out;
}

export function buildPlayerHubTransfersApi(
  rows: Array<{
    transferDate: Date | null;
    transferDateRaw: string | null;
    fromClubName: string | null;
    toClubName: string | null;
    fee: string | null;
    transferType: string | null;
  }>,
): PlayerHubTransfer[] | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const at = a.transferDate?.getTime() ?? 0;
    const bt = b.transferDate?.getTime() ?? 0;
    return bt - at;
  });
  return sorted.map((r) => {
    const item: PlayerHubTransfer = {};
    const iso = toIsoDate(r.transferDate ?? undefined);
    if (iso) item.date = iso;
    if (r.transferDateRaw) item.dateRaw = r.transferDateRaw;
    if (r.fromClubName) item.fromClub = r.fromClubName;
    if (r.toClubName) item.toClub = r.toClubName;
    if (r.fee) item.fee = r.fee;
    if (r.transferType) item.type = r.transferType;
    return item;
  });
}

export function buildPlayerHubSidelinedApi(
  rows: Array<{
    kind: string | null;
    typeLabel: string;
    dateStart: Date | null;
    dateEnd: Date | null;
    dateStartRaw: string | null;
    dateEndRaw: string | null;
    gamesMissed: number | null;
  }>,
): PlayerHubSidelined[] | null {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => {
    const at = a.dateStart?.getTime() ?? 0;
    const bt = b.dateStart?.getTime() ?? 0;
    return bt - at;
  });
  return sorted.map((r) => {
    const item: PlayerHubSidelined = { type: r.typeLabel };
    if (r.kind) item.kind = r.kind;
    const start = toIsoDate(r.dateStart ?? undefined);
    const end = toIsoDate(r.dateEnd ?? undefined);
    if (start) item.start = start;
    if (end) item.end = end;
    if (r.dateStartRaw) item.startRaw = r.dateStartRaw;
    if (r.dateEndRaw) item.endRaw = r.dateEndRaw;
    if (r.gamesMissed != null) item.gamesMissed = r.gamesMissed;
    return item;
  });
}

export function parseHonourSeasons(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildPlayerHubHonoursApi(
  rows: Array<{
    competition: string;
    country: string | null;
    status: string | null;
    count: number | null;
    seasonsRaw: string | null;
  }>,
): PlayerHubHonour[] | null {
  if (!rows.length) return null;
  return rows.map((r) => {
    const item: PlayerHubHonour = {
      competition: r.competition,
      seasons: parseHonourSeasons(r.seasonsRaw),
    };
    if (r.country) item.country = r.country;
    if (r.status) item.status = r.status;
    if (r.count != null) item.count = r.count;
    return item;
  });
}
