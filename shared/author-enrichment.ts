/** Shared rules for author profile UI (also used server-side for enrichment). */

export function isPaSportDeskAuthor(displayName: string): boolean {
  const t = displayName.trim();
  return /PA\s+Sport\s+Staff/i.test(t) || /PA\s+Sport\s+Reporters/i.test(t);
}
