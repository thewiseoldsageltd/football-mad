import type { Article } from "@shared/schema";
import type { ArticleBootstrapPayload } from "@shared/article-bootstrap";
import { calculateArticleReadTimeMinutes } from "@shared/article-reading-time";
import { effectiveAuthorProfileSlug } from "@shared/author-slug";
import { formatAuthorForUi } from "@shared/author-display";
import { articleHeroPreloadImageUrl, isLegacyGhostArticleImageUrl } from "@shared/article-display-image";
import { escapeHtml } from "./social-metadata";

export type ArticlePrerenderInput = {
  article: Article;
  /** Public URL slug segment (from request path). */
  publicSlug: string;
};

function formatPublishedAbsolute(iso: string | Date | null | undefined): { label: string; datetime: string } {
  if (!iso) return { label: "", datetime: "" };
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return { label: "", datetime: "" };
  const datetime = date.toISOString();
  const label = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
  return { label, datetime };
}

function buildShellMetaLine(input: ArticlePrerenderInput, readTimeMinutes: number): string {
  const authorDisplay = formatAuthorForUi(input.article.authorName) || "Football Mad";
  const published = formatPublishedAbsolute(input.article.publishedAt);
  const parts: string[] = [];

  if (authorDisplay) {
    parts.push(`<span>${escapeHtml(authorDisplay)}</span>`);
  }
  if (published.label) {
    parts.push(
      `<time datetime="${escapeHtml(published.datetime)}">${escapeHtml(published.label)} UTC</time>`,
    );
  }
  if (readTimeMinutes > 0) {
    parts.push(`<span>${readTimeMinutes} min read</span>`);
  }
  const views = input.article.viewCount ?? 0;
  if (views > 0) {
    parts.push(`<span>${views.toLocaleString("en-GB")} views</span>`);
  }

  return parts.join('<span aria-hidden="true"> · </span>');
}

function buildHeroMarkup(title: string, heroUrl: string | null): string {
  const alt = escapeHtml(title);
  if (heroUrl) {
    const src = escapeHtml(heroUrl);
    return `<figure class="my-8 relative aspect-video w-full overflow-hidden rounded-lg bg-black/5" style="margin:2rem 0;aspect-ratio:16/9;width:100%;overflow:hidden;border-radius:0.5rem;background:rgba(0,0,0,0.05)">
        <img
          src="${src}"
          alt="${alt}"
          width="1280"
          height="720"
          decoding="async"
          fetchpriority="high"
          loading="eager"
          style="width:100%;height:100%;object-fit:cover;object-position:center top;display:block"
        />
      </figure>`;
  }

  return `<div class="my-8 aspect-video w-full rounded-lg flex items-center justify-center" style="margin:2rem 0;aspect-ratio:16/9;width:100%;border-radius:0.5rem;background:linear-gradient(to bottom right,rgba(22,101,52,0.2),rgba(22,101,52,0.4));display:flex;align-items:center;justify-content:center" role="img" aria-label="Article image unavailable">
        <span style="font-size:6rem;font-weight:700;opacity:0.3;color:rgba(22,101,52,0.8)" aria-hidden="true">F</span>
      </div>`;
}

const SHELL_STYLES = `#fm-article-shell{font-family:Inter,system-ui,-apple-system,sans-serif;color:#0a0a0a;background:#fff}
#fm-article-shell .fm-shell-inner{max-width:48rem;margin:0 auto;padding:2rem 1rem}
#fm-article-shell h1{font-size:1.875rem;font-weight:700;line-height:1.2;margin:0 0 1rem}
@media(min-width:768px){#fm-article-shell h1{font-size:2.25rem}}
@media(min-width:1024px){#fm-article-shell h1{font-size:3rem}}
#fm-article-shell .fm-article-shell-meta{color:#525252;font-size:0.875rem;line-height:1.5;margin:0 0 1.5rem}`;

export function buildArticlePrerenderShell(input: ArticlePrerenderInput): string {
  const title = (input.article.title ?? "").trim() || "Football Mad";
  const readTimeMinutes = calculateArticleReadTimeMinutes(input.article.content);
  const heroUrl = articleHeroPreloadImageUrl(input.article);
  const metaLine = buildShellMetaLine(input, readTimeMinutes);
  const slugAttr = escapeHtml(input.publicSlug);

  return `<!-- fm-article-shell:start -->
    <style id="fm-article-shell-styles">${SHELL_STYLES}</style>
    <div id="fm-article-shell" data-article-slug="${slugAttr}">
      <div class="fm-shell-inner max-w-3xl mx-auto px-4 py-8">
        <article>
          <header class="mb-8">
            <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4">${escapeHtml(title)}</h1>
            ${metaLine ? `<p class="fm-article-shell-meta">${metaLine}</p>` : ""}
          </header>
          ${buildHeroMarkup(title, heroUrl)}
        </article>
      </div>
    </div>
    <!-- fm-article-shell:end -->`;
}

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

export function injectArticlePrerender(html: string, shell: string, bootstrapScript: string): string {
  const marker = '<div id="root">';
  if (!html.includes(marker)) return html;
  return html.replace(marker, `${shell}\n    ${bootstrapScript}\n    ${marker}`);
}

export function stripArticlePrerender(html: string): string {
  return html
    .replace(/<!--\s*fm-article-shell:start\s*-->[\s\S]*?<!--\s*fm-article-shell:end\s*-->\s*/gi, "")
    .replace(/<script\s+type=["']application\/json["']\s+id=["']fm-article-bootstrap["'][^>]*>[\s\S]*?<\/script>\s*/gi, "");
}
