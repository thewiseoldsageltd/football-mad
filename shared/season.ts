/**
 * Shared football-season helpers (canonical DB/API form: YYYY/YYYY).
 * Convert to short UI labels (YYYY/YY) and URL slugs (YYYY-YY) only at boundaries.
 */

export type SeasonKeyParts = { startYear: number; endYear: number };

/** Normalize any common season string to canonical `YYYY/YYYY`, or null if unrecognised. */
export function normalizeSeasonKey(input: string | null | undefined): string | null {
  if (input == null) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  if (/^\d{4}$/.test(raw)) return raw;

  const match = raw.match(/^(\d{4})[/\-](\d{2}|\d{4})$/);
  if (!match) return null;

  const startYear = Number(match[1]);
  let endYear: number;
  if (match[2].length === 2) {
    endYear = Number(String(startYear).slice(0, 2) + match[2]);
  } else {
    endYear = Number(match[2]);
  }
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
  return `${startYear}/${endYear}`;
}

export function parseSeasonKey(input: string | null | undefined): SeasonKeyParts | null {
  const key = normalizeSeasonKey(input);
  if (!key || /^\d{4}$/.test(key)) return null;
  const [a, b] = key.split("/");
  const startYear = Number(a);
  const endYear = Number(b);
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return null;
  return { startYear, endYear };
}

/** UI label: `2026/2027` → `2026/27`. Calendar-year keys stay as `YYYY`. */
export function seasonKeyToUiLabel(input: string | null | undefined): string {
  const key = normalizeSeasonKey(input);
  if (!key) return (input || "").trim();
  if (/^\d{4}$/.test(key)) return key;
  const parts = parseSeasonKey(key);
  if (!parts) return key;
  return `${parts.startYear}/${String(parts.endYear).slice(2)}`;
}

/** URL slug: `2026/2027` → `2026-27`. */
export function seasonKeyToUrlSlug(input: string | null | undefined): string {
  const label = seasonKeyToUiLabel(input);
  return label.replace("/", "-");
}

/** Parse URL slug or short/long season into canonical key. */
export function seasonSlugToCanonical(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return normalizeSeasonKey(String(slug).trim().replace(/-/g, "/"));
}

export function areSeasonKeysEquivalent(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeSeasonKey(a);
  const nb = normalizeSeasonKey(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** August→July split season for a calendar date (fallback only). */
export function calendarFootballSeasonKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0–11
  return month >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

/** Local-date variant for client month selectors (uses local calendar, not UTC). */
export function calendarFootballSeasonKeyLocal(monthIndex: number, year: number): string {
  return monthIndex >= 7 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
}

export function compareSeasonKeysDesc(a: string, b: string): number {
  const pa = parseSeasonKey(a);
  const pb = parseSeasonKey(b);
  if (pa && pb) {
    if (pa.startYear !== pb.startYear) return pb.startYear - pa.startYear;
    return pb.endYear - pa.endYear;
  }
  const na = normalizeSeasonKey(a) || a;
  const nb = normalizeSeasonKey(b) || b;
  if (/^\d{4}$/.test(na) && /^\d{4}$/.test(nb)) return Number(nb) - Number(na);
  return nb.localeCompare(na);
}

/** Deduplicate equivalent season strings; return canonical keys newest-first. */
export function dedupeSeasonKeys(seasons: Array<string | null | undefined>): string[] {
  const map = new Map<string, string>();
  for (const s of seasons) {
    const key = normalizeSeasonKey(s);
    if (!key || /^\d{4}$/.test(key)) continue;
    if (!map.has(key)) map.set(key, key);
  }
  return Array.from(map.keys()).sort(compareSeasonKeysDesc);
}

export function isSeasonKeyBefore(a: string, b: string): boolean {
  const pa = parseSeasonKey(a);
  const pb = parseSeasonKey(b);
  if (!pa || !pb) return false;
  if (pa.startYear !== pb.startYear) return pa.startYear < pb.startYear;
  return pa.endYear < pb.endYear;
}

/**
 * June/July of the calendar year that starts `providerSeason` (e.g. Jul 2026 for 2026/2027).
 * Used so Team Hub identity can roll to the new season before 1 August.
 */
export function isPreseasonMonthForSeason(
  monthIndex: number,
  year: number,
  providerSeason: string | null | undefined,
): boolean {
  const parts = parseSeasonKey(providerSeason);
  if (!parts) return false;
  return (monthIndex === 5 || monthIndex === 6) && year === parts.startYear;
}

export interface ResolveCurrentSeasonInput {
  /** Season published on a trusted bare/current Goalserve feed (preferred). */
  providerSeason?: string | null;
  /** Explicitly marked current row in competition_seasons.is_current */
  markedCurrentSeason?: string | null;
  /** Stored competitions.season (trusted current marker when set by bare-feed sync). */
  storedCompetitionSeason?: string | null;
  /**
   * Distinct standings / match season keys — used only by callers for available
   * season lists. Ignored for current-season resolution so a lone future row
   * cannot become current.
   */
  standingsSeasons?: Array<string | null | undefined>;
  matchSeasons?: Array<string | null | undefined>;
  now?: Date;
}

function asSplitSeasonKey(input: string | null | undefined): string | null {
  const key = normalizeSeasonKey(input);
  if (!key || /^\d{4}$/.test(key)) return null;
  return key;
}

/**
 * Resolve the competition's current season.
 *
 * Precedence (trusted markers only — never "newest stored evidence"):
 * 1. trusted provider-current season (bare feed)
 * 2. explicitly marked competition_seasons.is_current
 * 3. stored competitions.season
 * 4. August–July calendar fallback
 *
 * Standings/match season keys must not independently determine current season.
 */
export function resolveCurrentSeasonKey(input: ResolveCurrentSeasonInput): string {
  const provider = asSplitSeasonKey(input.providerSeason);
  if (provider) return provider;

  const marked = asSplitSeasonKey(input.markedCurrentSeason);
  if (marked) return marked;

  const stored = asSplitSeasonKey(input.storedCompetitionSeason);
  if (stored) return stored;

  return calendarFootballSeasonKey(input.now ?? new Date());
}

/**
 * Build the Tables season list: all known stored seasons plus current, newest first.
 */
export function buildCompetitionSeasonList(opts: {
  standingsSeasons?: Array<string | null | undefined>;
  matchSeasons?: Array<string | null | undefined>;
  competitionSeasons?: Array<string | null | undefined>;
  currentSeason: string;
}): string[] {
  return dedupeSeasonKeys([
    ...(opts.standingsSeasons ?? []),
    ...(opts.matchSeasons ?? []),
    ...(opts.competitionSeasons ?? []),
    opts.currentSeason,
  ]);
}

/** True when every club is still on zero competitive stats (preseason snapshot). */
export function isUnplayedStandingsTable(
  rows: Array<{
    played?: number | null;
    won?: number | null;
    drawn?: number | null;
    lost?: number | null;
    goalsFor?: number | null;
    goalsAgainst?: number | null;
    goalDifference?: number | null;
    points?: number | null;
    gd?: number | null;
    pts?: number | null;
  }>,
): boolean {
  if (rows.length === 0) return false;
  return rows.every((row) => {
    const played = row.played ?? 0;
    const won = row.won ?? 0;
    const drawn = row.drawn ?? 0;
    const lost = row.lost ?? 0;
    const goalsFor = row.goalsFor ?? 0;
    const goalsAgainst = row.goalsAgainst ?? 0;
    const gd = row.goalDifference ?? row.gd ?? 0;
    const pts = row.points ?? row.pts ?? 0;
    return (
      played === 0 &&
      won === 0 &&
      drawn === 0 &&
      lost === 0 &&
      goalsFor === 0 &&
      goalsAgainst === 0 &&
      gd === 0 &&
      pts === 0
    );
  });
}
