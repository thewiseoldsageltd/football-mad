import { absoluteUrl, CANONICAL_SITE_ORIGIN } from "./social-metadata";

export const OG_IMAGE_PATH = "/og-image";
export const OG_IMAGE_ARTICLE_PREFIX = "/og-image/article";
export const OG_IMAGE_DEFAULT_PATH = "/og-image/default.jpg";

export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

export type SocialImageMeta = {
  url: string;
  mimeType: string;
  width: number;
  height: number;
};

const CRAWLER_SAFE_EXT = /\.(jpe?g|png)(\?|#|$)/i;

/** Hosts allowed as `src` for legacy `/og-image?src=` (prevents open-proxy abuse). */
export const OG_IMAGE_ALLOWED_HOSTS = new Set([
  "img.footballmad.co.uk",
  "footballmad.co.uk",
  "www.footballmad.co.uk",
]);

export function mimeTypeForImageUrl(url: string): string {
  const lower = url.toLowerCase();
  if (/\.png(\?|#|$)/.test(lower)) return "image/png";
  return "image/jpeg";
}

export function isAllowedOgImageSource(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    return OG_IMAGE_ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function isCrawlerSafeDirectImage(url: string): boolean {
  return CRAWLER_SAFE_EXT.test(url) && isAllowedOgImageSource(url);
}

/** Clean article social card URL (no query string). */
export function articleOgImageUrl(publicSlug: string): string {
  const slug = publicSlug.trim().replace(/^\/+|\/+$/g, "").replace(/\.jpg$/i, "");
  const segment = slug
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${CANONICAL_SITE_ORIGIN}${OG_IMAGE_ARTICLE_PREFIX}/${segment}.jpg`;
}

export function defaultOgImageUrl(): string {
  return `${CANONICAL_SITE_ORIGIN}${OG_IMAGE_DEFAULT_PATH}`;
}

/** Legacy query-string proxy (not used in metadata). */
export function ogImageProxyUrlForSource(sourceUrl: string): string {
  return `${CANONICAL_SITE_ORIGIN}${OG_IMAGE_PATH}?src=${encodeURIComponent(sourceUrl)}`;
}

export type ResolveSocialImageOptions = {
  sourceUrl?: string | null;
  articleSlug?: string | null;
};

/**
 * Resolve crawler-safe image metadata for Open Graph / Twitter tags.
 * Articles use `/og-image/article/<slug>.jpg`; other pages use `/og-image/default.jpg` or direct JPG/PNG.
 */
export function resolveSocialImageForMeta(
  options: ResolveSocialImageOptions | string | null | undefined,
): SocialImageMeta {
  const opts: ResolveSocialImageOptions =
    typeof options === "string" || options == null
      ? { sourceUrl: options ?? null }
      : options;

  if (opts.articleSlug?.trim()) {
    return {
      url: articleOgImageUrl(opts.articleSlug),
      mimeType: "image/jpeg",
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
    };
  }

  const abs = absoluteUrl(opts.sourceUrl);
  if (abs && isCrawlerSafeDirectImage(abs)) {
    return {
      url: abs,
      mimeType: mimeTypeForImageUrl(abs),
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
    };
  }

  return {
    url: defaultOgImageUrl(),
    mimeType: "image/jpeg",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
  };
}
