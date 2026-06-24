import { isNewsSlugRoutedToArticle } from "@shared/news-article-slug";
import type { Article } from "@shared/schema";
import { fetchArticleBySlug, normalizeArticleSlug } from "./article-og-image";
import { isReservedRootSegment } from "./reserved-root-segments";
import { canonicalArticlePath, normalizeRequestPath } from "./social-metadata";

export type ArticlePrerenderContext = {
  article: Article;
  publicSlug: string;
};

export function extractArticlePrerenderSlug(requestPath: string): string | null {
  const path = normalizeRequestPath(requestPath);

  const newsMatch = path.match(/^\/news\/([^/]+)$/);
  if (newsMatch) {
    let slug: string;
    try {
      slug = decodeURIComponent(newsMatch[1]);
    } catch {
      slug = newsMatch[1];
    }
    return isNewsSlugRoutedToArticle(slug) ? slug : null;
  }

  const legacyMatch = path.match(/^\/([^/]+)$/);
  if (legacyMatch) {
    const segment = legacyMatch[1];
    if (isReservedRootSegment(segment)) return null;
    let slug: string;
    try {
      slug = decodeURIComponent(segment);
    } catch {
      slug = segment;
    }
    return isNewsSlugRoutedToArticle(slug) ? slug : null;
  }

  return null;
}

/**
 * Resolve article row for prerender when path is a news article URL.
 */
export async function resolveArticlePrerenderContext(
  requestPath: string,
): Promise<ArticlePrerenderContext | null> {
  const publicSlug = extractArticlePrerenderSlug(requestPath);
  if (!publicSlug) return null;

  const slug = normalizeArticleSlug(publicSlug);
  if (!slug) return null;

  const article = await fetchArticleBySlug(slug);
  if (!article) return null;

  return { article, publicSlug };
}

export function canonicalPathForArticlePrerender(publicSlug: string): string {
  return canonicalArticlePath(publicSlug);
}
