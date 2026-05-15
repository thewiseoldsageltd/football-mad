import { absoluteUrl, CANONICAL_SITE_ORIGIN } from "./social-metadata";

export const OG_IMAGE_PATH = "/og-image";
export const SOCIAL_IMAGE_WIDTH = 1200;
export const SOCIAL_IMAGE_HEIGHT = 630;

export type SocialImageMeta = {
  url: string;
  mimeType: string;
  width: number;
  height: number;
};

const CRAWLER_SAFE_EXT = /\.(jpe?g|png)(\?|#|$)/i;
const WEBP_EXT = /\.webp(\?|#|$)/i;

/** Hosts allowed as `src` for /og-image (prevents open-proxy abuse). */
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

function ogImageProxyUrlForSource(sourceUrl: string): string {
  return `${CANONICAL_SITE_ORIGIN}${OG_IMAGE_PATH}?src=${encodeURIComponent(sourceUrl)}`;
}

/**
 * Resolve crawler-safe image metadata for Open Graph / Twitter tags.
 * On-site assets may remain WebP; social tags use JPEG via /og-image when needed.
 */
export function resolveSocialImageForMeta(
  sourceUrl: string | null | undefined,
): SocialImageMeta {
  const abs = absoluteUrl(sourceUrl);
  if (!abs) {
    return {
      url: `${CANONICAL_SITE_ORIGIN}${OG_IMAGE_PATH}`,
      mimeType: "image/jpeg",
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
    };
  }

  if (isCrawlerSafeDirectImage(abs)) {
    return {
      url: abs,
      mimeType: mimeTypeForImageUrl(abs),
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
    };
  }

  if (WEBP_EXT.test(abs) && isAllowedOgImageSource(abs)) {
    return {
      url: ogImageProxyUrlForSource(abs),
      mimeType: "image/jpeg",
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
    };
  }

  if (isAllowedOgImageSource(abs)) {
    return {
      url: ogImageProxyUrlForSource(abs),
      mimeType: "image/jpeg",
      width: SOCIAL_IMAGE_WIDTH,
      height: SOCIAL_IMAGE_HEIGHT,
    };
  }

  return {
    url: `${CANONICAL_SITE_ORIGIN}${OG_IMAGE_PATH}`,
    mimeType: "image/jpeg",
    width: SOCIAL_IMAGE_WIDTH,
    height: SOCIAL_IMAGE_HEIGHT,
  };
}
