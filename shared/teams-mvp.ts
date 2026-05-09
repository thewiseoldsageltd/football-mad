/**
 * Teams page MVP scope: supported domestic leagues + European competitions.
 * Filter values align with /api/news/nav `competitionFilterValue` / news competition slugs.
 */

/** Canonical filter slugs accepted for the Teams page (includes UEFA short aliases). */
export const TEAMS_MVP_COMPETITION_FILTER_SLUGS = [
  // England
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  // Scotland
  "scottish-premiership",
  "scottish-championship",
  // Big 5 — other nations
  "la-liga",
  "serie-a",
  "bundesliga",
  "ligue-1",
  // Europe
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
  "champions-league",
  "europa-league",
  "conference-league",
] as const;

export type TeamsMvpCompetitionSlug = (typeof TEAMS_MVP_COMPETITION_FILTER_SLUGS)[number];

/** Competition slugs allowed in URL `comp=` (same as filter slugs + "all" handled separately). */
export const TEAMS_MVP_COMPETITION_SLUG_SET = new Set<string>(TEAMS_MVP_COMPETITION_FILTER_SLUGS);

/** DB `competitions.slug` join allowlist (memberships → teams for GET /api/teams?teamsPage=1). */
export const TEAMS_PAGE_COMPETITION_SLUGS: readonly string[] = [
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
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
  "champions-league",
  "europa-league",
  "conference-league",
];

/** Single canonical tab value per competition (URL + UI triggers use these). */
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
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
];

/** Map alias / alternate nav filter slugs → canonical tab slug. */
export const TEAMS_MVP_COMP_ALIAS_TO_CANONICAL: Record<string, string> = {
  "champions-league": "uefa-champions-league",
  "europa-league": "uefa-europa-league",
  "conference-league": "uefa-conference-league",
};

export function canonicalTeamsMvpCompSlug(slug: string): string {
  const lower = slug.trim().toLowerCase();
  return TEAMS_MVP_COMP_ALIAS_TO_CANONICAL[lower] ?? lower;
}

export function normalizeTeamsMvpFilterSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== "string") return null;
  const s = slug.trim().toLowerCase();
  return TEAMS_MVP_COMPETITION_SLUG_SET.has(s) ? s : null;
}
