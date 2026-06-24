import type { QueryClient } from "@tanstack/react-query";
import type { ArticleBootstrapPayload } from "@shared/article-bootstrap";
import type { Article } from "@shared/schema";

/** Cached article from HTML bootstrap before the full API returns. */
export type BootstrapArticleCache = Article & {
  authorProfileSlug?: string;
  /** True when `content` is intentionally omitted pending API fetch. */
  __bootstrapPartial?: boolean;
  /** Read time from server bootstrap when body is not yet loaded. */
  __bootstrapReadTimeMinutes?: number | null;
};

function extractPathArticleSlug(pathname: string): string | null {
  const newsMatch = pathname.match(/^\/news\/([^/]+)\/?$/);
  if (newsMatch) {
    try {
      return decodeURIComponent(newsMatch[1]);
    } catch {
      return newsMatch[1];
    }
  }
  const legacyMatch = pathname.match(/^\/([^/]+)\/?$/);
  if (!legacyMatch) return null;
  const segment = legacyMatch[1];
  const reserved = new Set([
    "news", "teams", "matches", "tables", "players", "managers", "competitions",
    "authors", "transfers", "injuries", "fpl", "community", "shop", "account",
    "admin", "search", "tag", "api", "debug", "assets", "crests", "rss", "og-image",
  ]);
  if (reserved.has(segment.toLowerCase())) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function readArticleBootstrap(): ArticleBootstrapPayload | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("fm-article-bootstrap");
  if (!el?.textContent?.trim()) return null;
  try {
    return JSON.parse(el.textContent) as ArticleBootstrapPayload;
  } catch {
    return null;
  }
}

export function bootstrapToPartialArticle(boot: ArticleBootstrapPayload): BootstrapArticleCache {
  const now = new Date();
  return {
    id: boot.id,
    slug: boot.slug,
    title: boot.title,
    excerpt: boot.excerpt,
    content: "",
    coverImage: boot.coverImage,
    heroImageUrl: boot.heroImageUrl,
    socialImageUrl: null,
    heroImageCredit: null,
    authorId: null,
    authorName: boot.authorName ?? "Football Mad",
    authorNameSlug: null,
    authorProfileSlug: boot.authorProfileSlug ?? undefined,
    category: "news",
    competition: "Premier League",
    contentType: "team-news",
    tags: [],
    isFeatured: false,
    isTrending: false,
    isBreaking: false,
    isEditorPick: false,
    viewCount: boot.viewCount ?? 0,
    commentsCount: 0,
    publishedAt: boot.publishedAt ? new Date(boot.publishedAt) : now,
    createdAt: now,
    updatedAt: now,
    source: "editorial",
    sourceId: null,
    sourceVersion: null,
    sourcePublishedAt: null,
    sourceUpdatedAt: null,
    sortAt: now,
    entityEnrichStatus: "pending",
    entityEnrichAttemptedAt: null,
    entityEnrichError: null,
    __bootstrapPartial: true,
    __bootstrapReadTimeMinutes: boot.readTimeMinutes,
  };
}

export function applyArticleBootstrapToQueryClient(queryClient: QueryClient): BootstrapArticleCache | null {
  const boot = readArticleBootstrap();
  if (!boot?.slug) return null;

  const pathSlug = extractPathArticleSlug(window.location.pathname);
  if (!pathSlug) return null;

  const normalizedPath = pathSlug.trim().toLowerCase();
  const normalizedBoot = boot.slug.trim().toLowerCase();
  if (normalizedPath !== normalizedBoot) return null;

  const partial = bootstrapToPartialArticle(boot);
  queryClient.setQueryData(["/api/articles", pathSlug], partial);
  return partial;
}

export function isBootstrapPartialArticle(
  article: Article | undefined | null,
): article is BootstrapArticleCache {
  return Boolean(article && (article as BootstrapArticleCache).__bootstrapPartial);
}

export function articleReadTimeMinutes(article: Article): number {
  const partial = article as BootstrapArticleCache;
  if (article.content?.trim()) {
    const text = article.content.replace(/<[^>]*>/g, "");
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }
  if (partial.__bootstrapReadTimeMinutes && partial.__bootstrapReadTimeMinutes > 0) {
    return partial.__bootstrapReadTimeMinutes;
  }
  return 1;
}

export function removeArticlePrerenderShell(expectedSlug: string | undefined): void {
  if (!expectedSlug) return;
  const shell = document.getElementById("fm-article-shell");
  if (!shell) return;
  if (shell.dataset.articleSlug !== expectedSlug) return;
  shell.remove();
  document.getElementById("fm-article-shell-styles")?.remove();
}
