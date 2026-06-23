/** Public match detail URL segment: `{home}-vs-{away}-{YYYY-MM-DD}`. */
const PUBLIC_MATCH_DETAIL_SLUG = /^.+-vs-.+-\d{4}-\d{2}-\d{2}$/;

/**
 * Goalserve ingest slugs (`gs-static-*`, `gs-*`) — not public match detail URLs.
 * Excludes future `{home}-vs-{away}-{date}` segments.
 */
export function isInternalGoalserveMatchSlug(slug: string | null | undefined): boolean {
  const s = slug?.trim().toLowerCase() ?? "";
  if (!s) return false;
  if (PUBLIC_MATCH_DETAIL_SLUG.test(s)) return false;
  return s.startsWith("gs-static-") || s.startsWith("gs-");
}

/** Client href for match cards until public match detail pages ship. */
export function matchListingHrefForSlug(slug: string | null | undefined): string {
  if (!slug?.trim() || isInternalGoalserveMatchSlug(slug)) return "/matches";
  return `/matches/${slug.trim()}`;
}
