/**
 * Teams page: domestic leagues only. Canonical slugs match URL `?comp=` and nav `filterValue`.
 *
 * DB `competitions.slug` is often derived from Goalserve display names (sync-goalserve-competitions),
 * so it may NOT match `premier-league` etc. — **always** map by `goalserveCompetitionId` when present.
 */

/** Goalserve competition ID → canonical filter slug. */
export const TEAMS_DOMESTIC_GOALSERVE_ID_TO_SLUG: Record<string, string> = {
  "1204": "premier-league",
  "1205": "championship",
  "1206": "league-one",
  "1197": "league-two",
  "1203": "national-league",
  "1370": "scottish-premiership",
  "1373": "scottish-championship",
  "1399": "la-liga",
  "1269": "serie-a",
  "1229": "bundesliga",
  "1221": "ligue-1",
};

export const TEAMS_DOMESTIC_GOALSERVE_IDS: readonly string[] = Object.keys(TEAMS_DOMESTIC_GOALSERVE_ID_TO_SLUG);

export const TEAMS_DOMESTIC_CANONICAL_SLUGS: readonly string[] = Array.from(
  new Set(Object.values(TEAMS_DOMESTIC_GOALSERVE_ID_TO_SLUG)),
);

export const TEAMS_DOMESTIC_SLUG_SET = new Set<string>(TEAMS_DOMESTIC_CANONICAL_SLUGS);

/** @deprecated Use TEAMS_DOMESTIC_CANONICAL_SLUGS — alias for news/filter consumers. */
export const TEAMS_MVP_COMPETITION_FILTER_SLUGS = TEAMS_DOMESTIC_CANONICAL_SLUGS;

export type TeamsMvpCompetitionSlug = (typeof TEAMS_DOMESTIC_CANONICAL_SLUGS)[number];

export const TEAMS_MVP_COMPETITION_SLUG_SET = TEAMS_DOMESTIC_SLUG_SET;

/** @deprecated Slug list — Teams page membership uses Goalserve IDs (see mvp-graph-boundary). */
export const TEAMS_PAGE_COMPETITION_SLUGS: readonly string[] = TEAMS_DOMESTIC_CANONICAL_SLUGS;

/** Tab order (domestic only). */
export const TEAMS_MVP_COMPETITION_TAB_ORDER: readonly string[] = [
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  "scottish-premiership",
  "scottish-championship",
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
];

/** Legacy UEFA `?comp=` — ignore (fall back to All). */
const LEGACY_UEFA_COMP_URL_SLUGS = new Set([
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
  "champions-league",
  "europa-league",
  "conference-league",
]);

export function canonicalTeamsMvpCompSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function normalizeTeamsMvpFilterSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== "string") return null;
  const s = slug.trim().toLowerCase();
  if (LEGACY_UEFA_COMP_URL_SLUGS.has(s)) return null;
  return TEAMS_DOMESTIC_SLUG_SET.has(s) ? s : null;
}

/** Resolve nav/filter slug for /api/news/nav when scope=teams-mvp (prefer Goalserve ID). */
export function resolveTeamsPageNavFilterSlug(params: {
  goalserveCompetitionId: string | null | undefined;
  dbSlug: string | null | undefined;
}): string | null {
  const gs = params.goalserveCompetitionId?.trim();
  if (gs && TEAMS_DOMESTIC_GOALSERVE_ID_TO_SLUG[gs]) {
    return TEAMS_DOMESTIC_GOALSERVE_ID_TO_SLUG[gs];
  }
  const raw = params.dbSlug?.trim().toLowerCase() ?? "";
  if (raw && TEAMS_DOMESTIC_SLUG_SET.has(raw)) return raw;
  return null;
}
