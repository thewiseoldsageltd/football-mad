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

/** LCP preload URL: same selection as rendered hero, excluding legacy Ghost paths. */
export function articleHeroPreloadImageUrl(article: {
  heroImageUrl?: string | null;
  coverImage?: string | null;
}): string | null {
  const raw = articleDisplayImageUrl(article);
  if (!raw || isLegacyGhostArticleImageUrl(raw)) return null;
  return raw;
}
