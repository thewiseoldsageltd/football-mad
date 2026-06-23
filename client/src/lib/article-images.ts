const CANONICAL_SITE_ORIGIN = "https://www.footballmad.co.uk";
const ARTICLE_OG_IMAGE_VERSION = "v5";

/** Legacy Ghost self-hosted paths that now return SPA HTML instead of image bytes. */
export function isLegacyGhostArticleImageUrl(url: string | null | undefined): boolean {
  const raw = url?.trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw.startsWith("//") ? `https:${raw}` : raw);
    const host = parsed.hostname.toLowerCase();
    if (host !== "footballmad.co.uk" && host !== "www.footballmad.co.uk") {
      return false;
    }
    return parsed.pathname.toLowerCase().startsWith("/content/images/");
  } catch {
    return /footballmad\.co\.uk\/content\/images\//i.test(raw);
  }
}

/** Article hero / card image (16:9 WebP), falling back to legacy cover. */
export function articleDisplayImageUrl(article: {
  heroImageUrl?: string | null;
  coverImage?: string | null;
}): string | null {
  const hero = article.heroImageUrl?.trim();
  if (hero) return hero;
  const cover = article.coverImage?.trim();
  return cover || null;
}

/** Stored 1200×630 JPEG for social crawlers (when backfilled). */
export function articleSocialImageUrl(article: {
  socialImageUrl?: string | null;
}): string | null {
  const social = article.socialImageUrl?.trim();
  return social || null;
}

/** Fallback dynamic OG JPEG proxy when socialImageUrl is not set. */
export function articleOgImageProxyUrl(publicSlug: string): string {
  const slug = publicSlug.trim().replace(/^\/+|\/+$/g, "").replace(/\.jpg$/i, "");
  const segment = slug
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${CANONICAL_SITE_ORIGIN}/og-image/article/${segment}-${ARTICLE_OG_IMAGE_VERSION}.jpg`;
}

/** Best URL for client-side og:image (stored social JPEG, else OG proxy, else site logo). */
export function articleSeoImageUrl(article: { socialImageUrl?: string | null }, publicSlug: string): string {
  return (
    articleSocialImageUrl(article) ??
    articleOgImageProxyUrl(publicSlug)
  );
}
