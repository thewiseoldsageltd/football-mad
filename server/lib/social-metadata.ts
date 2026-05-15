import type { Request } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { competitions, managers, players } from "@shared/schema";
import type { Article } from "@shared/schema";
import {
  fetchArticleBySlug,
  normalizeArticleSlug,
} from "./article-og-image";
import { shouldBlockSearchIndexing } from "../middleware/environment";
import {
  resolveCanonicalCompetitionSlug,
  resolveCanonicalTeamPublicSlug,
} from "./canonical-entity-slugs";
import { getEntityImage } from "./entity-media-resolver";
import { MvpGraphBoundary } from "./mvp-graph-boundary";
import { computeMvpIndexable } from "./mvp-indexing";
import { storage } from "../storage";
import {
  resolveCompetitionIdForRequestSlug,
  resolveManagerIdForRequestSlug,
  resolvePlayerIdForRequestSlug,
} from "./spa-entity-noindex";
import { resolveSocialImageForMeta } from "./social-image-url";

/** Canonical public origin for SEO / Open Graph (not derived from request Host). */
export const CANONICAL_SITE_ORIGIN = "https://www.footballmad.co.uk";

export const SITE_NAME = "Football Mad";

export const DEFAULT_SITE_DESCRIPTION =
  "Football Mad — football news, fixtures, results, tables, FPL updates and fan-first football coverage.";

/** Default social card (1200×630 JPEG); logo WebP remains for on-site use. */
export const DEFAULT_SOCIAL_IMAGE_PATH = "/assets/social-share-card.jpg";

export const DEFAULT_SOCIAL_IMAGE_URL = `${CANONICAL_SITE_ORIGIN}${DEFAULT_SOCIAL_IMAGE_PATH}`;

export const TWITTER_SITE_HANDLE = "@FootballMadUK";

export const DEFAULT_LOCALE = "en_GB";

export type SocialOgType = "website" | "article";

export type SocialMetaPayload = {
  title: string;
  description: string;
  canonicalPath: string;
  ogType?: SocialOgType;
  /** Public article slug for `/og-image/article/<slug>-v2.jpg` (no version suffix in this field). */
  articleSlug?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  robots?: string;
  twitterCard?: "summary" | "summary_large_image";
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Build absolute HTTPS URL for OG/Twitter images and canonical links. */
export function absoluteUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null) return null;
  const raw = String(pathOrUrl).trim();
  if (!raw) return null;
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^http:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, "https://");
  const base = CANONICAL_SITE_ORIGIN.replace(/\/$/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${base}${path}`;
}

export function canonicalUrlForPath(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return absoluteUrl(normalized) ?? `${CANONICAL_SITE_ORIGIN}/`;
}

function truncateDescription(text: string, maxLen = 155): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trim()}…`;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function competitionDisplayName(row: {
  canonicalName: string | null;
  name: string;
}): string {
  const canon = row.canonicalName?.trim();
  return canon || row.name;
}

async function entityNoindex(
  entityType: "team" | "competition" | "player" | "manager",
  entityId: string | null,
): Promise<boolean> {
  if (!entityId) return false;
  const boundary = new MvpGraphBoundary();
  const mvpIndexable = await computeMvpIndexable(boundary, { entityType, entityId });
  return !mvpIndexable;
}

export function buildSocialMetaTags(meta: SocialMetaPayload): string {
  const canonicalUrl = canonicalUrlForPath(meta.canonicalPath);
  const ogType = meta.ogType ?? "website";
  const socialImage = resolveSocialImageForMeta({
    sourceUrl: meta.imageUrl,
    articleSlug: meta.articleSlug,
  });
  const imageUrl = socialImage.url;
  const imageType = socialImage.mimeType;
  const imageWidth = String(socialImage.width);
  const imageHeight = String(socialImage.height);
  const imageAlt = meta.imageAlt?.trim() || meta.title;
  const robots = meta.robots ?? "index,follow";
  const twitterCard = meta.twitterCard ?? "summary_large_image";

  const lines = [
    "<!-- fm-social-meta:start -->",
    `<title>${escapeHtml(meta.title)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" />`,
    `<meta property="og:type" content="${escapeHtml(ogType)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta property="og:locale" content="${escapeHtml(DEFAULT_LOCALE)}" />`,
    `<meta property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}" />`,
    `<meta property="og:image:type" content="${escapeHtml(imageType)}" />`,
    `<meta property="og:image:width" content="${imageWidth}" />`,
    `<meta property="og:image:height" content="${imageHeight}" />`,
    `<meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    `<meta name="twitter:card" content="${escapeHtml(twitterCard)}" />`,
    `<meta name="twitter:site" content="${escapeHtml(TWITTER_SITE_HANDLE)}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    "<!-- fm-social-meta:end -->",
  ];
  return lines.join("\n    ");
}

const MANAGED_HEAD_TAG_PATTERNS: RegExp[] = [
  /<!--\s*fm-social-meta:start\s*-->[\s\S]*?<!--\s*fm-social-meta:end\s*-->\s*/gi,
  /<title>[\s\S]*?<\/title>\s*/gi,
  /<meta\s+name=["']description["'][^>]*>\s*/gi,
  /<link\s+rel=["']canonical["'][^>]*>\s*/gi,
  /<meta\s+name=["']robots["'][^>]*>\s*/gi,
  /<meta\s+property=["']og:[^"']+["'][^>]*>\s*/gi,
  /<meta\s+name=["']twitter:[^"']+["'][^>]*>\s*/gi,
];

export function stripManagedHeadTags(html: string): string {
  let out = html;
  for (const pattern of MANAGED_HEAD_TAG_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out;
}

export function injectSocialMetadata(html: string, meta: SocialMetaPayload): string {
  const cleaned = stripManagedHeadTags(html);
  const block = buildSocialMetaTags(meta);
  if (/<head[^>]*>/i.test(cleaned)) {
    return cleaned.replace(/<head([^>]*)>/i, `<head$1>\n    ${block}`);
  }
  return cleaned;
}

/** Public article URLs in the React app (see `newsArticle()` in client). */
export const ARTICLE_PUBLIC_PATH_PREFIX = "/news";

/**
 * Pathname for metadata resolution. Prefer `originalUrl` — `req.path` is often "/" in SPA fallthrough.
 */
export function requestPathname(req: Request): string {
  const raw = req.originalUrl || req.url || req.path || "/";
  return normalizeRequestPath(raw);
}

export function normalizeRequestPath(requestPath: string): string {
  const pathOnly = requestPath.split("?")[0].split("#")[0] || "/";
  const normalized = pathOnly.replace(/\/+$/, "") || "/";
  return normalized;
}

export function canonicalArticlePath(slug: string): string {
  const clean = slug.trim();
  return `${ARTICLE_PUBLIC_PATH_PREFIX}/${clean}`;
}

/**
 * Top-level SPA routes (single path segment) that must not be treated as legacy `/:slug` articles.
 */
const RESERVED_ROOT_SINGLE_SEGMENTS = new Set([
  "news",
  "teams",
  "matches",
  "tables",
  "players",
  "managers",
  "competitions",
  "authors",
  "transfers",
  "injuries",
  "fpl",
  "community",
  "shop",
  "account",
  "admin",
]);

function isReservedRootSegment(segment: string): boolean {
  return RESERVED_ROOT_SINGLE_SEGMENTS.has(segment.trim().toLowerCase());
}

function resolveArticleHeadline(article: Article): string {
  const headline = typeof article.title === "string" ? article.title.trim() : "";
  return headline || SITE_NAME;
}

function resolveArticleDescription(article: Article): string {
  const excerpt = typeof article.excerpt === "string" ? article.excerpt.trim() : "";
  if (excerpt) return truncateDescription(excerpt);
  return truncateDescription(stripHtml(article.content ?? ""));
}

function buildArticleSocialPayload(
  article: Article,
  publicSlug: string,
  canonicalPath: string,
  robotsIndex: string,
): SocialMetaPayload {
  const headline = resolveArticleHeadline(article);

  return {
    title: `${headline} | Football Mad`,
    description: resolveArticleDescription(article),
    canonicalPath,
    ogType: "article",
    articleSlug: publicSlug,
    imageAlt: headline,
    robots: robotsIndex,
    twitterCard: "summary_large_image",
  };
}

/**
 * Resolve article metadata when `articles.slug` matches. Canonical path is always `/news/:slug`.
 */
async function resolveArticlePageMetadata(
  rawSlug: string,
  robotsIndex: string,
): Promise<SocialMetaPayload | null> {
  const slug = normalizeArticleSlug(rawSlug);
  if (!slug) return null;

  const article = await fetchArticleBySlug(slug);
  if (!article) return null;

  return buildArticleSocialPayload(article, slug, canonicalArticlePath(slug), robotsIndex);
}

function defaultPayload(
  overrides: Partial<SocialMetaPayload> & Pick<SocialMetaPayload, "title" | "canonicalPath">,
): SocialMetaPayload {
  return {
    description: DEFAULT_SITE_DESCRIPTION,
    ogType: "website",
    imageUrl: DEFAULT_SOCIAL_IMAGE_URL,
    imageAlt: SITE_NAME,
    robots: "index,follow",
    twitterCard: "summary_large_image",
    ...overrides,
  };
}

/**
 * Resolve social/SEO metadata for a public SPA path (no query string).
 * Uses canonical footballmad.co.uk URLs regardless of request host.
 */
export async function resolvePageMetadata(
  requestPath: string,
  host: string,
): Promise<SocialMetaPayload> {
  const path = normalizeRequestPath(requestPath);
  const stagingBlock = shouldBlockSearchIndexing(host);
  const robotsIndex = stagingBlock ? "noindex,nofollow,noarchive" : "index,follow";
  const robotsNoindexFollow = stagingBlock ? "noindex,nofollow,noarchive" : "noindex,follow";

  const withRobots = (payload: SocialMetaPayload): SocialMetaPayload => ({
    ...payload,
    robots: stagingBlock ? robotsIndex : payload.robots ?? robotsIndex,
  });

  if (path === "/") {
    return withRobots(
      defaultPayload({
        title: "Football Mad | News, Matches, Tables & Teams",
        description:
          "Football news, live matches, tables and team coverage from the competitions that matter most.",
        canonicalPath: "/",
      }),
    );
  }

  if (path === "/news") {
    return withRobots(
      defaultPayload({
        title: "Football News | Football Mad",
        description: "Latest football news, analysis and breaking stories from Football Mad.",
        canonicalPath: "/news",
      }),
    );
  }

  const newsArticleMatch = path.match(/^\/news\/([^/]+)$/);
  if (newsArticleMatch) {
    const slug = newsArticleMatch[1];
    const canonicalPath = canonicalArticlePath(slug);
    const articleMeta = await resolveArticlePageMetadata(slug, robotsIndex);
    if (articleMeta) {
      return withRobots(articleMeta);
    }
    return withRobots(
      defaultPayload({
        title: "Football Mad",
        canonicalPath,
      }),
    );
  }

  if (path === "/matches" || path.startsWith("/matches/")) {
    return withRobots(
      defaultPayload({
        title: "Matches | Football Mad",
        description: "Live scores, fixtures and results from Football Mad's priority competitions.",
        canonicalPath: path.startsWith("/matches/") ? path : "/matches",
      }),
    );
  }

  if (path === "/tables" || path.startsWith("/tables/")) {
    return withRobots(
      defaultPayload({
        title: "Tables | Football Mad",
        description: "League tables and tournament progress on Football Mad.",
        canonicalPath: path === "/tables" ? "/tables" : path,
      }),
    );
  }

  if (path === "/teams") {
    return withRobots(
      defaultPayload({
        title: "Teams | Football Mad",
        description: "Browse clubs from Football Mad's supported domestic leagues.",
        canonicalPath: "/teams",
      }),
    );
  }

  const teamsLeagueMatch = path.match(/^\/teams\/league\/([^/]+)$/);
  if (teamsLeagueMatch) {
    const compSlug = decodeURIComponent(teamsLeagueMatch[1]);
    const label = titleCaseFromSlug(compSlug);
    return withRobots(
      defaultPayload({
        title: `${label} Teams | Football Mad`,
        description: `Browse clubs from ${label} on Football Mad.`,
        canonicalPath: path,
      }),
    );
  }

  const teamMatch = path.match(/^\/teams\/([^/]+)(?:\/([^/]+))?$/);
  if (teamMatch && teamMatch[1] !== "league") {
    const slug = decodeURIComponent(teamMatch[1]);
    const team = await storage.getTeamBySlug(slug);
    const canonicalSlug = (await resolveCanonicalTeamPublicSlug(slug)) ?? slug;
    const canonicalPath = `/teams/${canonicalSlug}`;
    const name = team?.name ?? titleCaseFromSlug(slug);
    const entityId = team?.id ?? null;
    const noindex = stagingBlock ? false : await entityNoindex("team", entityId);

    let imageUrl = DEFAULT_SOCIAL_IMAGE_URL;
    if (entityId) {
      const img = await getEntityImage("team", entityId, "hub_header");
      imageUrl = absoluteUrl(img) ?? absoluteUrl(team?.logoUrl) ?? DEFAULT_SOCIAL_IMAGE_URL;
    }

    return withRobots({
      title: `${name} News, Fixtures, Results & Team Updates | Football Mad`,
      description: `Latest ${name} news, fixtures, results, squad updates and team coverage on Football Mad.`,
      canonicalPath,
      imageUrl,
      imageAlt: `${name} crest`,
      robots: noindex ? robotsNoindexFollow : robotsIndex,
    });
  }

  const competitionMatch = path.match(/^\/competitions\/([^/]+)$/);
  if (competitionMatch) {
    const slug = decodeURIComponent(competitionMatch[1]);
    const entityId = await resolveCompetitionIdForRequestSlug(slug);
    const canonicalSlug = (await resolveCanonicalCompetitionSlug(slug)) ?? slug;
    const canonicalPath = `/competitions/${canonicalSlug}`;

    let name = titleCaseFromSlug(slug);
    if (entityId) {
      const [row] = await db
        .select({
          name: competitions.name,
          canonicalName: competitions.canonicalName,
        })
        .from(competitions)
        .where(eq(competitions.id, entityId))
        .limit(1);
      if (row) name = competitionDisplayName(row);
    }

    const noindex = stagingBlock ? false : await entityNoindex("competition", entityId);
    let imageUrl = DEFAULT_SOCIAL_IMAGE_URL;
    if (entityId) {
      const img = await getEntityImage("competition", entityId, "hub_header");
      if (img) imageUrl = absoluteUrl(img) ?? DEFAULT_SOCIAL_IMAGE_URL;
    }

    return withRobots({
      title: `${name} Table, Fixtures & News | Football Mad`,
      description: `${name} table, fixtures, results and news on Football Mad.`,
      canonicalPath,
      imageUrl,
      imageAlt: `${name} logo`,
      robots: noindex ? robotsNoindexFollow : robotsIndex,
    });
  }

  const playerMatch = path.match(/^\/players\/([^/]+)$/);
  if (playerMatch) {
    const slug = decodeURIComponent(playerMatch[1]);
    const entityId = await resolvePlayerIdForRequestSlug(slug);
    let name = titleCaseFromSlug(slug);
    if (entityId) {
      const [row] = await db
        .select({ name: players.name })
        .from(players)
        .where(eq(players.id, entityId))
        .limit(1);
      if (row?.name) name = row.name;
    }
    const noindex = stagingBlock ? false : await entityNoindex("player", entityId);
    let imageUrl = DEFAULT_SOCIAL_IMAGE_URL;
    if (entityId) {
      const img = await getEntityImage("player", entityId, "hub_header");
      if (img) imageUrl = absoluteUrl(img) ?? DEFAULT_SOCIAL_IMAGE_URL;
    }

    return withRobots({
      title: `${name} News, Profile & Updates | Football Mad`,
      description: `Player profile and news for ${name} on Football Mad.`,
      canonicalPath: `/players/${slug}`,
      imageUrl,
      imageAlt: name,
      robots: noindex ? robotsNoindexFollow : robotsIndex,
    });
  }

  const managerMatch = path.match(/^\/managers\/([^/]+)$/);
  if (managerMatch) {
    const slug = decodeURIComponent(managerMatch[1]);
    const entityId = await resolveManagerIdForRequestSlug(slug);
    let name = titleCaseFromSlug(slug);
    if (entityId) {
      const [row] = await db
        .select({ name: managers.name })
        .from(managers)
        .where(eq(managers.id, entityId))
        .limit(1);
      if (row?.name) name = row.name;
    }
    const noindex = stagingBlock ? false : await entityNoindex("manager", entityId);
    let imageUrl = DEFAULT_SOCIAL_IMAGE_URL;
    if (entityId) {
      const img = await getEntityImage("manager", entityId, "hub_header");
      if (img) imageUrl = absoluteUrl(img) ?? DEFAULT_SOCIAL_IMAGE_URL;
    }

    return withRobots({
      title: `${name} News, Profile & Updates | Football Mad`,
      description: `Manager profile and news for ${name} on Football Mad.`,
      canonicalPath: `/managers/${slug}`,
      imageUrl,
      imageAlt: name,
      robots: noindex ? robotsNoindexFollow : robotsIndex,
    });
  }

  // Legacy Ghost / root-level article URLs: /:slug → canonical /news/:slug when slug exists in articles.
  const legacyArticleMatch = path.match(/^\/([^/]+)$/);
  if (legacyArticleMatch) {
    const segment = legacyArticleMatch[1];
    if (!isReservedRootSegment(segment)) {
      const articleMeta = await resolveArticlePageMetadata(segment, robotsIndex);
      if (articleMeta) {
        return withRobots(articleMeta);
      }
    }
  }

  return withRobots(
    defaultPayload({
      title: SITE_NAME,
      canonicalPath: path,
    }),
  );
}
