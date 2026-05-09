/**
 * Teams page MVP scope: supported leagues and European competitions only.
 * Filter values align with /api/news/nav `competitionFilterValue` / news competition slugs.
 */

/** Canonical filter slugs accepted for the Teams page (includes UEFA + short aliases). */
export const TEAMS_MVP_COMPETITION_FILTER_SLUGS = [
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  "scottish-premiership",
  "scottish-championship",
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
  "champions-league",
  "europa-league",
  "conference-league",
] as const;

export type TeamsMvpCompetitionSlug = (typeof TEAMS_MVP_COMPETITION_FILTER_SLUGS)[number];

export type TeamsMvpRegion = "all" | "england" | "scotland" | "europe";

/** Competition slugs allowed in URL `comp=` (same as filter slugs + "all" handled separately). */
export const TEAMS_MVP_COMPETITION_SLUG_SET = new Set<string>(TEAMS_MVP_COMPETITION_FILTER_SLUGS);

/** DB `competitions.slug` join allowlist (aliases for European comps). */
export const TEAMS_PAGE_COMPETITION_SLUGS: readonly string[] = [
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  "scottish-premiership",
  "scottish-championship",
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
  "champions-league",
  "europa-league",
  "conference-league",
];

export const TEAMS_MVP_REGION_SLUGS: Record<Exclude<TeamsMvpRegion, "all">, readonly string[]> = {
  england: ["premier-league", "championship", "league-one", "league-two", "national-league"],
  scotland: ["scottish-premiership", "scottish-championship"],
  europe: [
    "uefa-champions-league",
    "uefa-europa-league",
    "uefa-conference-league",
    "champions-league",
    "europa-league",
    "conference-league",
  ],
};

/** Tab order for competition strip (labels come from API; UEFA short aliases sorted via client helper). */
export const TEAMS_MVP_COMPETITION_TAB_ORDER: readonly string[] = [
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  "scottish-premiership",
  "scottish-championship",
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
];

export function normalizeTeamsMvpFilterSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== "string") return null;
  const s = slug.trim().toLowerCase();
  return TEAMS_MVP_COMPETITION_SLUG_SET.has(s) ? s : null;
}

export function isTeamsMvpRegion(value: string | null | undefined): value is TeamsMvpRegion {
  return value === "all" || value === "england" || value === "scotland" || value === "europe";
}
