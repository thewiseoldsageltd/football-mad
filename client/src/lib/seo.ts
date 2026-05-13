import { useEffect } from "react";

export function getSeoBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL || "https://football-mad.replit.app";
}

/**
 * Client-side staging / dev indexing block (aligns with server `shouldBlockSearchIndexing` host heuristics).
 * When true, entity pages should use noindex in addition to server X-Robots-Tag / shell meta.
 */
export function shouldBlockIndexingFromClient(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  const h = window.location.hostname.toLowerCase();
  if (!h) return false;
  if (h.startsWith("staging.")) return true;
  if (h.includes(".staging.")) return true;
  if (h.includes("-staging.onrender.com")) return true;
  if (h.includes("staging--")) return true;
  return false;
}

export function absoluteSeoUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const baseUrl = getSeoBaseUrl().replace(/\/$/, "");
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${path}`;
}

type MetaAttr = "name" | "property";

function upsertMeta(id: string, attrType: MetaAttr, attrKey: string, content: string): HTMLMetaElement {
  let tag = document.getElementById(id) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.id = id;
    tag.setAttribute(attrType, attrKey);
    document.head.appendChild(tag);
  }
  tag.content = content;
  return tag;
}

function removeById(id: string) {
  document.getElementById(id)?.remove();
}

export function usePageSeo({
  title,
  description,
  canonicalPath,
  ogType = "website",
  imagePath,
  noIndex = false,
}: {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: "website" | "article";
  imagePath?: string;
  noIndex?: boolean;
}) {
  useEffect(() => {
    const canonicalUrl = absoluteSeoUrl(canonicalPath);
    const imageUrl = imagePath ? absoluteSeoUrl(imagePath) : null;

    document.title = title;

    const managedIds = [
      "page-seo-description",
      "page-seo-canonical",
      "page-seo-og-title",
      "page-seo-og-description",
      "page-seo-og-url",
      "page-seo-og-type",
      "page-seo-og-site-name",
      "page-seo-og-image",
      "page-seo-twitter-card",
      "page-seo-twitter-title",
      "page-seo-twitter-description",
      "page-seo-twitter-image",
      "page-seo-robots",
    ];

    upsertMeta("page-seo-description", "name", "description", description);

    let canonical = document.getElementById("page-seo-canonical") as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.id = "page-seo-canonical";
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    upsertMeta("page-seo-og-title", "property", "og:title", title);
    upsertMeta("page-seo-og-description", "property", "og:description", description);
    upsertMeta("page-seo-og-url", "property", "og:url", canonicalUrl);
    upsertMeta("page-seo-og-type", "property", "og:type", ogType);
    upsertMeta("page-seo-og-site-name", "property", "og:site_name", "Football Mad");
    upsertMeta("page-seo-twitter-card", "name", "twitter:card", imageUrl ? "summary_large_image" : "summary");
    upsertMeta("page-seo-twitter-title", "name", "twitter:title", title);
    upsertMeta("page-seo-twitter-description", "name", "twitter:description", description);

    if (imageUrl) {
      upsertMeta("page-seo-og-image", "property", "og:image", imageUrl);
      upsertMeta("page-seo-twitter-image", "name", "twitter:image", imageUrl);
    } else {
      removeById("page-seo-og-image");
      removeById("page-seo-twitter-image");
    }

    if (noIndex) {
      upsertMeta("page-seo-robots", "name", "robots", "noindex,follow");
    } else {
      removeById("page-seo-robots");
    }

    return () => {
      managedIds.forEach(removeById);
    };
  }, [title, description, canonicalPath, ogType, imagePath, noIndex]);
}

export function useJsonLd(
  scriptId: string,
  data: Record<string, unknown> | null | undefined,
) {
  useEffect(() => {
    if (!data) return;

    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(data);

    return () => {
      script?.remove();
    };
  }, [scriptId, data]);
}
