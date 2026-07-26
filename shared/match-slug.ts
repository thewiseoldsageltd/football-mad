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

export function isPublicMatchDetailSlug(slug: string | null | undefined): boolean {
  const s = slug?.trim().toLowerCase() ?? "";
  return Boolean(s) && PUBLIC_MATCH_DETAIL_SLUG.test(s);
}

function datePartFromKickoff(kickoffTime: string | Date): string | null {
  const raw = typeof kickoffTime === "string" ? kickoffTime : kickoffTime.toISOString();
  const date = raw.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/** Build the public match detail path segment from team slugs + kickoff. */
export function buildPublicMatchDetailSlug(
  homeSlug: string,
  awaySlug: string,
  kickoffTime: string | Date,
): string | null {
  const home = homeSlug.trim();
  const away = awaySlug.trim();
  const date = datePartFromKickoff(kickoffTime);
  if (!home || !away || !date) return null;
  return `${home}-vs-${away}-${date}`;
}

/**
 * Resolve a client href for a match card/row.
 * Prefers an existing public detail slug; otherwise builds one from team slugs + date.
 * Returns null when no reliable destination exists (do not guess).
 */
export function resolveMatchDetailHref(input: {
  slug?: string | null;
  homeTeamSlug?: string | null;
  awayTeamSlug?: string | null;
  kickoffTime?: string | Date | null;
}): string | null {
  const slug = input.slug?.trim();
  if (slug && isPublicMatchDetailSlug(slug)) {
    return `/matches/${slug}`;
  }
  if (slug && !isInternalGoalserveMatchSlug(slug)) {
    return `/matches/${slug}`;
  }
  if (input.homeTeamSlug && input.awayTeamSlug && input.kickoffTime) {
    const publicSlug = buildPublicMatchDetailSlug(
      input.homeTeamSlug,
      input.awayTeamSlug,
      input.kickoffTime,
    );
    if (publicSlug) return `/matches/${publicSlug}`;
  }
  return null;
}

/**
 * Client href for match cards.
 * Internal Goalserve slugs alone are not public destinations — returns listing fallback.
 * Prefer {@link resolveMatchDetailHref} when home/away slugs are available.
 */
export function matchListingHrefForSlug(slug: string | null | undefined): string {
  return resolveMatchDetailHref({ slug }) ?? "/matches";
}
