import { desc, eq, like, or, sql } from "drizzle-orm";
import { db } from "../db";
import { articles } from "@shared/schema";
import type { Article } from "@shared/schema";
import { absoluteUrl } from "./social-metadata";

export function normalizeArticleSlug(slug: string): string {
  try {
    return decodeURIComponent(slug).trim().toLowerCase();
  } catch {
    return slug.trim().toLowerCase();
  }
}

/** PA ingest appends `-` + 8 hex chars to headline slugs (`uniqueSlug` in ingest-pamedia). */
const PA_MEDIA_SLUG_HASH_SUFFIX = /^(.+)-[0-9a-f]{8}$/i;

function slugMatchesPublicArticlePath(dbSlug: string, requestSlug: string): boolean {
  if (dbSlug === requestSlug) return true;
  const m = dbSlug.match(PA_MEDIA_SLUG_HASH_SUFFIX);
  return m?.[1] === requestSlug;
}

/**
 * Resolve article row for a public URL slug (exact, case-insensitive, PA hash-suffix variant).
 * Canonical URLs may omit the PA hash even when `articles.slug` includes it.
 */
export async function fetchArticleBySlug(requestSlug: string): Promise<Article | undefined> {
  const slug = normalizeArticleSlug(requestSlug);
  if (!slug) return undefined;

  const [exact] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  if (exact) return exact;

  const [caseInsensitive] = await db
    .select()
    .from(articles)
    .where(sql`lower(${articles.slug}) = ${slug}`)
    .limit(1);
  if (caseInsensitive) return caseInsensitive;

  const prefixCandidates = await db
    .select()
    .from(articles)
    .where(or(eq(articles.slug, slug), like(articles.slug, `${slug}-%`)))
    .orderBy(desc(articles.publishedAt))
    .limit(15);

  for (const row of prefixCandidates) {
    if (slugMatchesPublicArticlePath(row.slug, slug)) return row;
  }

  return undefined;
}

function extractFirstImageSrcFromHtml(html: string): string | null {
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  const src = match?.[1]?.trim();
  return src || null;
}

/** Display hero, cover, or first inline image for social JPEG generation (no site default). */
export function resolveArticleHeroImageSource(article: Article): string | null {
  const fromHero = absoluteUrl(article.heroImageUrl);
  if (fromHero) return fromHero;

  const fromCover = absoluteUrl(article.coverImage);
  if (fromCover) return fromCover;

  const fromBody = absoluteUrl(extractFirstImageSrcFromHtml(article.content ?? ""));
  if (fromBody) return fromBody;

  return null;
}

/**
 * Slug segment from `/og-image/article/:slug-v5.jpg` — strips `.jpg` and `-vN` suffix before lookup.
 * Example: `derek-mcinnes-…-5c0c0264-v2` → `derek-mcinnes-…-5c0c0264`
 */
export function parseArticleOgImageSlugParam(raw: string): string {
  let slug = raw.replace(/\.jpg$/i, "").trim();
  slug = slug.replace(/-v\d+$/i, "");
  return slug;
}
