import type { Article } from "@shared/schema";
import type { ArticleBootstrapPayload } from "@shared/article-bootstrap";
import { calculateArticleReadTimeMinutes } from "@shared/article-reading-time";
import { effectiveAuthorProfileSlug } from "@shared/author-slug";
import { isLegacyGhostArticleImageUrl } from "@shared/article-display-image";

export type ArticlePrerenderInput = {
  article: Article;
  /** Public URL slug segment (from request path). */
  publicSlug: string;
};

function sanitizeBootstrapImageUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw || isLegacyGhostArticleImageUrl(raw)) return null;
  return raw;
}

export function buildArticleBootstrapPayload(input: ArticlePrerenderInput): ArticleBootstrapPayload {
  const { article, publicSlug } = input;
  const authorProfileSlug = effectiveAuthorProfileSlug(article) || null;
  const readTimeMinutes = calculateArticleReadTimeMinutes(article.content);

  return {
    id: article.id,
    slug: publicSlug,
    title: (article.title ?? "").trim() || "Football Mad",
    excerpt: typeof article.excerpt === "string" ? article.excerpt.trim() || null : null,
    authorName: typeof article.authorName === "string" ? article.authorName.trim() || null : null,
    authorProfileSlug,
    publishedAt: article.publishedAt ? new Date(article.publishedAt).toISOString() : null,
    readTimeMinutes,
    viewCount: article.viewCount ?? null,
    heroImageUrl: sanitizeBootstrapImageUrl(article.heroImageUrl),
    coverImage: sanitizeBootstrapImageUrl(article.coverImage),
  };
}

/** Safe JSON for embedding in <script type="application/json">. */
export function serializeBootstrapForScript(payload: ArticleBootstrapPayload): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c");
}

export function buildArticleBootstrapScript(payload: ArticleBootstrapPayload): string {
  return `<script type="application/json" id="fm-article-bootstrap">${serializeBootstrapForScript(payload)}</script>`;
}

export function injectArticleBootstrap(html: string, bootstrapScript: string): string {
  const marker = '<div id="root">';
  if (!html.includes(marker)) return html;
  return html.replace(marker, `${bootstrapScript}\n    ${marker}`);
}

export function stripArticlePrerender(html: string): string {
  return html
    .replace(/<!--\s*fm-article-hero-lcp:start\s*-->[\s\S]*?<!--\s*fm-article-hero-lcp:end\s*-->\s*/gi, "")
    .replace(/<!--\s*fm-article-shell:start\s*-->[\s\S]*?<!--\s*fm-article-shell:end\s*-->\s*/gi, "")
    .replace(/<script\s+type=["']application\/json["']\s+id=["']fm-article-bootstrap["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");
}
