/**
 * Top-level SPA / infrastructure path segments that must not be treated as legacy `/:slug` articles.
 */
export const RESERVED_ROOT_SINGLE_SEGMENTS = new Set([
  "news",
  "teams",
  "matches",
  "tables",
  "players",
  "managers",
  "competitions",
  "authors",
  "transfers",
  "injuries",
  "fpl",
  "community",
  "shop",
  "account",
  "admin",
  "search",
  "tag",
  "api",
  "debug",
  "assets",
  "crests",
  "rss",
  "og-image",
]);

export function isReservedRootSegment(segment: string): boolean {
  return RESERVED_ROOT_SINGLE_SEGMENTS.has(segment.trim().toLowerCase());
}
