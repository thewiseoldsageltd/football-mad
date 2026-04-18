import { isPaSportDeskAuthor } from "@shared/author-enrichment";

/**
 * Optional curated author profile fields (keyed by author URL slug from slugifyAuthorName).
 * Safe to extend without DB migrations — omit keys until headshots/socials are approved.
 */
export type CuratedAuthorFields = {
  headshotUrl?: string;
  linkedInUrl?: string;
  xUrl?: string;
  websiteUrl?: string;
  /** Editorial primary beat / coverage focus; overrides tag inference when set. */
  primaryBeat?: string;
};

const CURATED_AUTHOR_ENRICHMENT: Record<string, CuratedAuthorFields> = {
  // Example (uncomment when assets and URLs are cleared):
  // "jane-doe": {
  //   headshotUrl: "https://img.footballmad.co.uk/authors/jane-doe.webp",
  //   linkedInUrl: "https://www.linkedin.com/in/...",
  //   xUrl: "https://x.com/...",
  //   websiteUrl: "https://...",
  //   primaryBeat: "Premier League · Transfers",
  // },
};

export type AuthorPageEnrichment = CuratedAuthorFields & {
  showPaDeskAvatar?: boolean;
};

export function buildAuthorPageEnrichment(slug: string, displayName: string): AuthorPageEnrichment {
  const curated = CURATED_AUTHOR_ENRICHMENT[slug] ?? {};
  if (isPaSportDeskAuthor(displayName)) {
    return { showPaDeskAvatar: true, ...curated };
  }
  return { ...curated };
}
