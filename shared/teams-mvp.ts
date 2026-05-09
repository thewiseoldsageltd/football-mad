/**
 * Teams page: priority domestic leagues only (`competitions.is_priority = true`), excluding
 * domestic cups and UEFA club competitions. Canonical slugs match URL `?comp=` and nav `filterValue`.
 *
 * DB `competitions.slug` is often derived from Goalserve display names (sync-goalserve-competitions),
 * so it may NOT match `premier-league` etc. — **always** map by `goalserveCompetitionId` when present.
 */

/** Goalserve IDs excluded from Teams page (domestic cups + UEFA; overlap/alternate feed IDs included). */
export const TEAMS_PAGE_EXCLUDED_GOALSERVE_IDS: readonly string[] = [
  // UEFA club competitions
  "1005",
  "1007",
  "18853",
  // England
  "1198",
  "1199",
  // Scotland cups
  "1371",
  "1372",
  // Spain — Copa del Rey (alternate IDs seen across feeds)
  "1397",
  "202",
  // Italy — Coppa Italia
  "1264",
  // Germany — DFB-Pokal (alternate IDs)
  "1226",
  "221",
  // France — Coupe de France (alternate IDs)
  "1218",
  "231",
];

export const TEAMS_PAGE_EXCLUDED_GOALSERVE_ID_SET = new Set<string>(TEAMS_PAGE_EXCLUDED_GOALSERVE_IDS);

export function isTeamsPageExcludedGoalserveId(id: string | null | undefined): boolean {
  const s = typeof id === "string" ? id.trim() : "";
  return s.length > 0 && TEAMS_PAGE_EXCLUDED_GOALSERVE_ID_SET.has(s);
}

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

/** Domestic cups / European comps — invalid Teams tab `?comp=` (fall back to All). */
const TEAMS_PAGE_INVALID_URL_SLUGS = new Set([
  ...LEGACY_UEFA_COMP_URL_SLUGS,
  "fa-cup",
  "efl-cup",
  "carabao-cup",
  "scottish-cup",
  "scottish-league-cup",
  "copa-del-rey",
  "coppa-italia",
  "dfb-pokal",
  "coupe-de-france",
]);

export function canonicalTeamsMvpCompSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export function normalizeTeamsMvpFilterSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== "string") return null;
  const s = slug.trim().toLowerCase();
  if (TEAMS_PAGE_INVALID_URL_SLUGS.has(s)) return null;
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
