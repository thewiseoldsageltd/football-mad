/**
 * RSS 2.0 feed generation for Football Mad news articles.
 * Structured for future feeds: /rss/teams/:slug.xml, /rss/fpl.xml, etc.
 */

/** Inlined to avoid circular import: rss → social-metadata → storage → rss. */
export const RSS_CANONICAL_SITE_ORIGIN = "https://www.footballmad.co.uk";

function rssCanonicalOrigin(): string {
  return RSS_CANONICAL_SITE_ORIGIN.replace(/\/$/, "");
}

export const RSS_NEWS_FEED_PATH = "/rss.xml";
export const RSS_NEWS_CHANNEL_LINK = `${rssCanonicalOrigin()}/news`;
export const RSS_NEWS_FEED_URL = `${rssCanonicalOrigin()}${RSS_NEWS_FEED_PATH}`;
export const RSS_NEWS_LIMIT = 50;
export const RSS_CACHE_MAX_AGE_SEC = 300;

/** Feed identifiers for future specialised feeds (not implemented yet). */
export type RssFeedKind = "news" | "team" | "competition" | "fpl" | "transfers";

export type RssNewsArticle = {
  slug: string;
  title: string;
  excerpt: string | null;
  summaryText: string;
  authorName: string | null;
  publishedAt: Date | null;
  createdAt: Date | null;
  competition: string | null;
  contentType: string | null;
  tags: string[] | null;
  coverImage: string | null;
  heroImageUrl: string | null;
  socialImageUrl: string | null;
};

export type RssNewsChannelMeta = {
  title: string;
  link: string;
  description: string;
  language: string;
  ttl: number;
  lastBuildDate: Date;
  selfUrl: string;
};

const DEFAULT_CHANNEL: RssNewsChannelMeta = {
  title: "Football Mad - Latest Football News",
  link: RSS_NEWS_CHANNEL_LINK,
  description:
    "Latest football news, FPL insights, match updates, transfers and team stories from Football Mad.",
  language: "en-gb",
  ttl: 10,
  lastBuildDate: new Date(),
  selfUrl: RSS_NEWS_FEED_URL,
};

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

export function articleCanonicalUrl(slug: string): string {
  const clean = slug.trim().replace(/^\/+|\/+$/g, "");
  const segment = clean
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${rssCanonicalOrigin()}/news/${segment}`;
}

/** RFC 822 date in GMT for RSS pubDate / lastBuildDate. */
export function formatRssDate(date: Date): string {
  return date.toUTCString().replace("GMT", "GMT");
}

function resolvePublishedDate(article: RssNewsArticle): Date {
  if (article.publishedAt instanceof Date && !Number.isNaN(article.publishedAt.getTime())) {
    return article.publishedAt;
  }
  if (article.createdAt instanceof Date && !Number.isNaN(article.createdAt.getTime())) {
    return article.createdAt;
  }
  return new Date();
}

export function resolveRssItemDescription(article: RssNewsArticle): string {
  const excerpt = article.excerpt?.trim();
  if (excerpt) return stripHtml(excerpt);
  const summary = article.summaryText?.trim();
  if (summary) return stripHtml(summary);
  return "";
}

export function resolveRssItemImageUrl(article: RssNewsArticle): string | null {
  const social = article.socialImageUrl?.trim();
  if (social) return social;
  const hero = article.heroImageUrl?.trim();
  if (hero) return hero;
  const cover = article.coverImage?.trim();
  return cover || null;
}

export function mimeTypeForRssImageUrl(url: string, preferSocialJpeg = false): string {
  const lower = url.toLowerCase();
  if (/\.jpe?g(\?|#|$)/.test(lower)) return "image/jpeg";
  if (/\.png(\?|#|$)/.test(lower)) return "image/png";
  if (/\.webp(\?|#|$)/.test(lower)) return "image/webp";
  if (/\.gif(\?|#|$)/.test(lower)) return "image/gif";
  return preferSocialJpeg ? "image/jpeg" : "image/webp";
}

function rssCategories(article: RssNewsArticle): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (value: string | null | undefined) => {
    const v = value?.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };
  if (Array.isArray(article.tags)) {
    for (const tag of article.tags) add(tag);
  }
  add(article.competition);
  add(article.contentType);
  return out;
}

function buildRssItem(article: RssNewsArticle): string {
  const link = articleCanonicalUrl(article.slug);
  const title = escapeXml(article.title.trim());
  const pubDate = formatRssDate(resolvePublishedDate(article));
  const description = resolveRssItemDescription(article);
  const categories = rssCategories(article)
    .map((c) => `<category>${escapeXml(c)}</category>`)
    .join("\n      ");

  const authorName = article.authorName?.trim();
  const dcCreator = authorName
    ? `<dc:creator>${escapeXml(authorName)}</dc:creator>\n      `
    : "";

  const imageUrl = resolveRssItemImageUrl(article);
  const preferJpeg = Boolean(article.socialImageUrl?.trim());
  let mediaBlock = "";
  let enclosureBlock = "";
  if (imageUrl) {
    const type = mimeTypeForRssImageUrl(imageUrl, preferJpeg);
    const escapedUrl = escapeXml(imageUrl);
    enclosureBlock = `<enclosure url="${escapedUrl}" type="${escapeXml(type)}" />\n      `;
    mediaBlock =
      `<media:content url="${escapedUrl}" medium="image" type="${escapeXml(type)}" />\n      ` +
      `<media:thumbnail url="${escapedUrl}" />\n      `;
  }

  return `<item>
      <title>${title}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      ${description ? `<description>${escapeXml(description)}</description>\n      ` : ""}${dcCreator}${categories ? `${categories}\n      ` : ""}${enclosureBlock}${mediaBlock}</item>`;
}

/**
 * Build RSS 2.0 XML for the main news feed.
 */
export function buildNewsRssFeedXml(
  items: RssNewsArticle[],
  channel: Partial<RssNewsChannelMeta> = {},
): string {
  const meta: RssNewsChannelMeta = {
    ...DEFAULT_CHANNEL,
    ...channel,
    lastBuildDate: channel.lastBuildDate ?? new Date(),
  };

  const itemXml = items.map(buildRssItem).join("\n    ");
  const lastBuild = formatRssDate(meta.lastBuildDate);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(meta.title)}</title>
    <link>${escapeXml(meta.link)}</link>
    <description>${escapeXml(meta.description)}</description>
    <language>${escapeXml(meta.language)}</language>
    <ttl>${meta.ttl}</ttl>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${escapeXml(meta.selfUrl)}" rel="self" type="application/rss+xml" />
    ${itemXml}
  </channel>
</rss>
`;
}
