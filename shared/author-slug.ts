/**
 * Canonical author slug for URLs (computed from display name, no DB column).
 * Keep in sync with SQL in server/storage.ts (authorSlugWhereSql).
 */
export function slugifyAuthorName(name: string | null | undefined): string {
  const raw = (name ?? "").trim().toLowerCase();
  if (!raw) return "";
  return raw
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug for `/authors/:slug` links: server-enriched canonical when present, else slugify(byline). */
export function effectiveAuthorProfileSlug(article: {
  authorProfileSlug?: string | null;
  authorName?: string | null;
}): string {
  const fromApi = article.authorProfileSlug?.trim();
  if (fromApi) return fromApi;
  return slugifyAuthorName(article.authorName);
}

export function authorPathFromSlug(slug: string): string {
  return `/authors/${encodeURIComponent(slug)}`;
}

/** API + author page list payload (lightweight article row). */
export interface AuthorArticleSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  openingText: string;
  coverImage: string | null;
  authorName: string;
  /** Canonical author slug when identity engine matches slugify(authorName); omit for legacy clients. */
  authorProfileSlug?: string;
  publishedAt: string | null;
  updatedAt: string | null;
  sortAt: string | null;
  viewCount: number;
  tags: string[];
  competition: string | null;
  contentType: string | null;
}

export interface AuthorPageApiResponse {
  found: boolean;
  slug: string;
  displayName: string;
  articleCount: number;
  firstPublishedAt: string | null;
  lastPublishedAt: string | null;
  articles: AuthorArticleSummary[];
  nextCursor: string | null;
  hasMore: boolean;
  /** Rights-approved headshot URL (CDN). Set via server curated map when available. */
  headshotUrl?: string | null;
  linkedInUrl?: string | null;
  xUrl?: string | null;
  websiteUrl?: string | null;
  /** When true, UI shows PA desk branding instead of generic pen / personal headshot. */
  showPaDeskAvatar?: boolean;
  /** Coverage focus: curated in author enrichment when set, else top tag from recent articles (null if neither). */
  primaryBeat?: string | null;
}
