import { newsArticle } from "./urls";

/** Canonical origin for share links (matches server-injected OG canonical). */
export const CANONICAL_SHARE_ORIGIN = "https://www.footballmad.co.uk";

export function articleCanonicalShareUrl(articleSlug: string): string {
  const slug = articleSlug.trim().replace(/^\/+|\/+$/g, "");
  if (!slug) return CANONICAL_SHARE_ORIGIN;
  return `${CANONICAL_SHARE_ORIGIN}${newsArticle(slug)}`;
}

/** X share: separate title and URL params only. */
export function buildXShareUrl(articleTitle: string, canonicalUrl: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(articleTitle)}&url=${encodeURIComponent(canonicalUrl)}`;
}

/** Facebook share: URL only so FB scrapes OG tags from the article page. */
export function buildFacebookShareUrl(canonicalUrl: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`;
}

/** WhatsApp: article title + canonical URL (no site suffix). */
export function buildWhatsAppShareUrl(articleTitle: string, canonicalUrl: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${articleTitle} ${canonicalUrl}`)}`;
}
