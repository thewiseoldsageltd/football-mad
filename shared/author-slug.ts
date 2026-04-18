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
  publishedAt: string | null;
  updatedAt: string | null;
  sortAt: string | null;
  viewCount: number;
  tags: string[];
  competition: string | null;
  contentType: string | null;
}

/** Optional row for “latest article” hero in author header (first in feed order). */
export interface AuthorLatestArticleSummary {
  slug: string;
  title: string;
  publishedAt: string | null;
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
  /** Topic tags aggregated from recent articles (max ~12). */
  expertiseTags?: string[];
  latestArticle?: AuthorLatestArticleSummary | null;
}
