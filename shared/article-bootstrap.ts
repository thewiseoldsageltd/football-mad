/** Lightweight article fields embedded in HTML for instant above-fold render. */
export type ArticleBootstrapPayload = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  authorName: string | null;
  authorProfileSlug: string | null;
  publishedAt: string | null;
  readTimeMinutes: number | null;
  viewCount: number | null;
  heroImageUrl: string | null;
  coverImage: string | null;
};
