/**
 * PA Media ingestion: fetch items, hero + inline images to R2 (WEBP variants), rewrite HTML. Idempotent.
 *
 * Observability: every run creates a job_runs row and records HTTP calls in job_http_calls.
 * Query latest runs:  SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 20;
 * Provider breakdown: SELECT provider, count(*) FROM job_http_calls GROUP BY provider;
 */

import { db } from "../db";
import { articles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import * as cheerio from "cheerio";
import {
  uploadImageVariantsToR2,
  uploadHeroToR2,
  seoSlugFromText,
  shortStableHash,
} from "../lib/r2";
import { startJobRun, finishJobRun, jobFetch } from "../lib/job-observability";
import { runWithJobContext } from "../lib/job-context";

const PA_SOURCE = "pa_media";
const BASE_URL = process.env.PAMEDIA_API_BASE_URL ?? "https://content.api.pressassociation.io/v1";
const FETCH_TIMEOUT_MS = 10_000;
const IMAGE_WIDTHS = [320, 640, 960, 1280] as const;
const DEBUG_PAMEDIA_IMAGES = process.env.DEBUG_PAMEDIA_IMAGES === "1";

const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk").replace(/\/$/, "");

const PAMEDIA_INGEST_LIMIT = Math.max(1, parseInt(process.env.PAMEDIA_INGEST_LIMIT ?? "15", 10));
const PAMEDIA_JOB_TIME_BUDGET_MS = Math.max(5000, parseInt(process.env.PAMEDIA_JOB_TIME_BUDGET_MS ?? "45000", 10));
const PAMEDIA_IMAGE_CONCURRENCY = Math.max(1, parseInt(process.env.PAMEDIA_IMAGE_CONCURRENCY ?? "2", 10));
const PAMEDIA_MAX_INLINE_IMAGES = Math.max(1, parseInt(process.env.PAMEDIA_MAX_INLINE_IMAGES ?? "5", 10));

/** Simple concurrency limiter: at most `limit` concurrent executions. */
function createSemaphore(limit: number): { acquire: () => Promise<void>; release: () => void } {
  let inFlight = 0;
  const waiters: (() => void)[] = [];
  return {
    acquire: () => {
      if (inFlight < limit) {
        inFlight++;
        return Promise.resolve();
      }
      return new Promise<void>((resolve) => {
        waiters.push(() => {
          inFlight++;
          resolve();
        });
      });
    },
    release: () => {
      inFlight--;
      if (waiters.length > 0 && inFlight < limit) {
        const next = waiters.shift()!;
        next();
      }
    },
  };
}

function getItems(response: Record<string, unknown>): unknown[] {
  const arr = (response as any).item ?? (response as any).items ?? (response as any).data ?? (response as any).results;
  return Array.isArray(arr) ? arr : [];
}

/** Get best rendition href: original, then 16x9, then first available. */
function getRenditionHref(assoc: Record<string, unknown>): string | null {
  const renditions = assoc.renditions as Record<string, unknown> | undefined;
  if (!renditions || typeof renditions !== "object") return null;
  const getHref = (r: unknown): string | null => {
    if (typeof r === "string") return r;
    if (r && typeof r === "object" && "href" in r) return (r as { href?: string }).href ?? null;
    return null;
  };
  const orig = getHref(renditions.original) ?? getHref(renditions["16x9"]);
  if (orig) return orig;
  for (const r of Object.values(renditions)) {
    const h = getHref(r);
    if (h) return h;
  }
  return null;
}

/** Normalize protocol-relative URL to https. */
function normalizeImageUrl(url: string): string {
  const s = url.trim();
  if (s.startsWith("//")) return `https:${s}`;
  return s;
}

function isHttpUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return false;
  return u.startsWith("http://") || u.startsWith("https://") || u.startsWith("//");
}

function alreadyOurCdn(url: string): boolean {
  const u = normalizeImageUrl(url);
  return u.includes(R2_PUBLIC_BASE_URL) || u.includes("img.footballmad.co.uk");
}

/** First URL from srcset (comma-separated, optional descriptor). */
function getFirstUrlFromSrcset(srcset: string): string | null {
  const part = srcset.split(",")[0]?.trim();
  if (!part) return null;
  const space = part.lastIndexOf(" ");
  const url = space >= 0 ? part.slice(0, space).trim() : part;
  return url?.trim() || null;
}

/** Get candidate fetch URL from img: src, data-src, data-original, data-lazy-src, or first from srcset. */
function getInlineImgCandidateUrl($img: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string | null {
  const src = $img.attr("src")?.trim();
  if (src) return src;
  const dataSrc = $img.attr("data-src")?.trim();
  if (dataSrc) return dataSrc;
  const dataOriginal = $img.attr("data-original")?.trim();
  if (dataOriginal) return dataOriginal;
  const dataLazy = $img.attr("data-lazy-src")?.trim();
  if (dataLazy) return dataLazy;
  const srcset = $img.attr("srcset")?.trim();
  if (srcset) return getFirstUrlFromSrcset(srcset);
  return null;
}

/** SEO base name from association or article headline. */
function getImageBaseName(
  assoc: Record<string, unknown> | null,
  articleHeadline: string
): string {
  if (assoc) {
    const t = (assoc.description_text ?? assoc.body_text ?? assoc.headline) as string | undefined;
    if (t && typeof t === "string") return seoSlugFromText(t);
  }
  return seoSlugFromText(articleHeadline) || "image";
}

/** Extract tags from subject array where profile === 'tag', use name. */
function getTagsFromSubject(raw: Record<string, unknown>): string[] {
  const subject = raw.subject ?? raw.subjects;
  if (!Array.isArray(subject)) return [];
  const tags: string[] = [];
  for (const s of subject) {
    const obj = s && typeof s === "object" ? (s as Record<string, unknown>) : null;
    if (!obj) continue;
    const profile = (obj.profile ?? obj.type) as string | undefined;
    const name = (obj.name ?? obj["@name"]) as string | undefined;
    if (profile === "tag" && name && typeof name === "string") tags.push(name);
  }
  return tags.slice(0, 20);
}

/** Fetch with timeout; records to job_http_calls with provider pa_media. */
async function fetchWithTimeout(runId: string, url: string): Promise<Buffer> {
  const res = await jobFetch(runId, {
    provider: "pa_media",
    url: normalizeImageUrl(url),
    method: "GET",
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export interface NormalizedPaItem {
  id: string;
  headline: string;
  content: string;
  bodyHtml: string;
  issued?: string;
  versionCreated?: string;
  associations: Record<string, unknown>;
  tags: string[];
  byline?: string;
}

function normalizeItem(raw: Record<string, unknown>): NormalizedPaItem | null {
  const id = (raw.uri ?? raw.id ?? raw["@id"]) as string | undefined;
  if (!id || typeof id !== "string") return null;

  const headline = (raw.headline ?? raw.title ?? raw.name ?? "") as string;
  const bodyHtml = (raw.body_html ?? raw.bodyHtml ?? raw["body_html"]) as string | undefined;
  const bodyText = (raw.body_text ?? raw.bodyText ?? raw["body_text"]) as string | undefined;
  const content = bodyHtml?.trim() ? bodyHtml : (bodyText ? `<p>${bodyText}</p>` : "<p></p>");

  const issued = (raw.issued ?? raw.versioncreated ?? raw.versionCreated) as string | undefined;
  const versionCreated = (raw.versioncreated ?? raw.versionCreated ?? raw.updated ?? issued) as string | undefined;
  const associations = (raw.associations ?? raw.related ?? {}) as Record<string, unknown>;
  const tags = getTagsFromSubject(raw);
  const byline = (raw.byline ?? raw.author ?? raw["by-line"]) as string | undefined;

  return {
    id,
    headline: headline && typeof headline === "string" ? headline : "Untitled",
    content,
    bodyHtml: content,
    issued,
    versionCreated,
    associations: associations && typeof associations === "object" ? associations : {},
    tags,
    byline: byline && typeof byline === "string" ? byline : undefined,
  };
}

/** Get hero image URL from associations.featureimage. */
function getHeroHref(associations: Record<string, unknown>): string | null {
  const feature = associations.featureimage ?? associations.feature_image ?? associations.hero;
  if (!feature || typeof feature !== "object") return null;
  return getRenditionHref(feature as Record<string, unknown>);
}

/** Get association by id (e.g. embedded12345). */
function getAssociation(associations: Record<string, unknown>, id: string): Record<string, unknown> | null {
  const a = associations[id];
  if (a && typeof a === "object") return a as Record<string, unknown>;
  return null;
}

function uniqueSlug(headline: string, sourceId: string): string {
  const base = (headline || "article")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "article"}-${shortStableHash(sourceId)}`;
}

export async function runPaMediaIngest(): Promise<{
  ok: boolean;
  processed: number;
  error?: string;
  itemsFetched?: number;
  imagesUploaded?: number;
  inlineRewritten?: number;
  skipped?: number;
  timeMs?: number;
  stoppedReason?: string | null;
}> {
  // Always create a job run first so we have observability on every exit path.
  const run = await startJobRun("ingest_pamedia", {
    limit: PAMEDIA_INGEST_LIMIT,
    timeBudgetMs: PAMEDIA_JOB_TIME_BUDGET_MS,
  });
  const runId = run.id;

  const apiKey = process.env.PAMEDIA_API_KEY;
  if (!apiKey) {
    await finishJobRun(runId, { status: "error", error: "PAMEDIA_API_KEY is not set" });
    return { ok: false, processed: 0, error: "PAMEDIA_API_KEY is not set" };
  }

  return runWithJobContext(run.id, async () => {
  const start = Date.now();
  let stoppedReason: string | null = null;
  let articlesInserted = 0;
  let articlesUpdated = 0;

  let body: Record<string, unknown>;
  try {
    const url = `${BASE_URL.replace(/\/$/, "")}/item`;
    const res = await jobFetch(runId, {
      provider: "pa_media",
      url,
      method: "GET",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      throwOnNon2xx: true,
    });
    body = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    await finishJobRun(runId, { status: "error", error: (err as Error).message });
    return { ok: false, processed: 0, error: (err as Error).message };
  }
  let rawItems: unknown[] = [];
  try {
    rawItems = getItems(body);
  } catch (_) {
    await finishJobRun(runId, { status: "error", error: "Failed to parse PA API response" });
    return { ok: false, processed: 0, error: "Failed to parse PA API response" };
  }

  let processed = 0;
  let skipped = 0;
  let imagesUploaded = 0;
  let inlineRewritten = 0;
  let inlineSkippedDueToCap = 0;
  const semaphore = createSemaphore(PAMEDIA_IMAGE_CONCURRENCY);

  try {
  for (const raw of rawItems) {
    if (processed >= PAMEDIA_INGEST_LIMIT) {
      stoppedReason = "item_limit";
      break;
    }
    if (Date.now() - start > PAMEDIA_JOB_TIME_BUDGET_MS) {
      stoppedReason = "time_budget";
      break;
    }

    if (typeof raw !== "object" || raw === null) continue;
    const item = normalizeItem(raw as Record<string, unknown>);
    if (!item) continue;

    try {
      const existing = await db
        .select({
          id: articles.id,
          slug: articles.slug,
          coverImage: articles.coverImage,
          content: articles.content,
          sourceUpdatedAt: articles.sourceUpdatedAt,
        })
        .from(articles)
        .where(and(eq(articles.source, PA_SOURCE), eq(articles.sourceId, item.id)))
        .limit(1);

      const existingRow = existing[0];
      const incomingVersion = item.versionCreated ? new Date(item.versionCreated).getTime() : 0;
      const existingVersion = existingRow?.sourceUpdatedAt ? new Date(existingRow.sourceUpdatedAt).getTime() : 0;
      const isEnrichedCover =
        !!existingRow?.coverImage &&
        (existingRow.coverImage.startsWith(R2_PUBLIC_BASE_URL) || existingRow.coverImage.includes("img.footballmad.co.uk"));
      const isEnrichedContent =
        !!existingRow?.content &&
        (existingRow.content.includes(R2_PUBLIC_BASE_URL) || existingRow.content.includes("img.footballmad.co.uk"));

      if (existingRow && isEnrichedCover && isEnrichedContent && incomingVersion <= existingVersion) {
        skipped++;
        continue;
      }

      let coverImage: string | null = null;
      let heroImageCredit: string | null = null;
      let content = item.content;

      // --- Hero: associations.featureimage (with concurrency limit) ---
      const heroHref = getHeroHref(item.associations);
      if (heroHref) {
        await semaphore.acquire();
        try {
          const buf = await fetchWithTimeout(runId, heroHref);
          const featureAssoc = (item.associations.featureimage ?? item.associations.feature_image) as Record<string, unknown> | undefined;
          const baseName = getImageBaseName(featureAssoc ?? null, item.headline);
          const result = await uploadImageVariantsToR2({
            buffer: buf,
            source: "pa_media",
            articleId: item.id,
            kind: "hero",
            baseName,
          });
          coverImage = result.original;
          imagesUploaded += IMAGE_WIDTHS.length;
          const credit = featureAssoc?.description_credit ?? featureAssoc?.credit;
          if (credit && typeof credit === "string") heroImageCredit = credit;
        } catch (e) {
          console.warn(`[ingest-pamedia] Hero image failed for ${item.id}:`, (e as Error).message);
        } finally {
          semaphore.release();
        }
      }

      // --- Inline: <figure id="embedded..."> and plain <img src="//image.assets..."> ---
      const $ = cheerio.load(content, { decodeEntities: true });

      if (DEBUG_PAMEDIA_IMAGES) {
        const assocKeys = Object.keys(item.associations);
        const hasFeature = {
          featureimage: "featureimage" in item.associations,
          feature_image: "feature_image" in item.associations,
          featureImage: "featureImage" in item.associations,
        };
        const bodyHasPaAssets = item.content.includes("image.assets.pressassociation.io");
        const imgCount = $("img").length;
        const imgPaCount = $("img").filter((_: number, el: cheerio.Element) => {
          const src = $(el).attr("src") ?? "";
          const srcset = $(el).attr("srcset") ?? "";
          return src.includes("image.assets.pressassociation.io") || srcset.includes("image.assets.pressassociation.io");
        }).length;
        const embeddedFigureCount = $('figure[id^="embedded"]').filter((_: number, el: cheerio.Element) => /^embedded\d+$/.test($(el).attr("id") ?? "")).length;
        console.log(
          `[ingest-pamedia DEBUG] uri=${item.id} headline=${item.headline.slice(0, 60)} | assocKeys=${assocKeys.length} feature=${JSON.stringify(hasFeature)} | bodyHasPaAssets=${bodyHasPaAssets} | imgCount=${imgCount} imgPaCount=${imgPaCount} embeddedFigureCount=${embeddedFigureCount}`
        );
      }

      const defaultSizes = "(max-width: 767px) 89vw, (max-width: 1000px) 54vw, 580px";

      // Inline: any <img> (in figure or standalone) with http(s) URL not already on our CDN
      type InlineCandidate = { el: cheerio.Element; url: string };
      const candidates: InlineCandidate[] = [];
      $("img").each((_: number, el: cheerio.Element) => {
        const $img = $(el);
        const raw = getInlineImgCandidateUrl($img, $);
        if (!raw) return;
        const url = normalizeImageUrl(raw);
        if (!isHttpUrl(url) || alreadyOurCdn(url)) return;
        candidates.push({ el, url });
      });

      const toProcess = candidates.slice(0, PAMEDIA_MAX_INLINE_IMAGES);
      inlineSkippedDueToCap += Math.max(0, candidates.length - PAMEDIA_MAX_INLINE_IMAGES);
      const beforeInlineCount = inlineRewritten;

      for (const { el, url } of toProcess) {
        const $img = $(el);
        const baseName = (seoSlugFromText(item.headline) || "image") + "-" + shortStableHash(url).slice(0, 8);
        await semaphore.acquire();
        try {
          const buf = await fetchWithTimeout(runId, url);
          if (!buf?.length) continue;
          const result = await uploadImageVariantsToR2({
            buffer: buf,
            source: "pa_media",
            articleId: item.id,
            kind: "inline",
            baseName,
          });
          if (!result.original) continue;
          imagesUploaded += IMAGE_WIDTHS.length;
          $img.attr("src", result.original);
          $img.attr("srcset", result.srcset);
          $img.attr("sizes", defaultSizes);
          $img.attr("loading", "lazy");
          if ($img.attr("data-src")) $img.attr("data-src", result.original);
          if ($img.attr("data-original")) $img.attr("data-original", result.original);
          if ($img.attr("data-lazy-src")) $img.attr("data-lazy-src", result.original);
          if (!$img.attr("alt")) $img.attr("alt", baseName);
          inlineRewritten++;
        } catch (e) {
          console.warn(`[ingest-pamedia] Inline image failed:`, (e as Error).message);
        } finally {
          semaphore.release();
        }
      }

      const itemRewritten = inlineRewritten - beforeInlineCount;
      if (candidates.length > 0 && itemRewritten === 0) {
        console.warn(
          "[ingest-pamedia] inline: found_imgs=" + candidates.length + " rewritten=0 slug=" + uniqueSlug(item.headline, item.id) + " sourceId=" + item.id + " note=check-img-attrs"
        );
      }

      content = $.html();

      const slug = uniqueSlug(item.headline, item.id);
      const publishedAt = item.issued ? new Date(item.issued) : new Date();
      const updatedAt = item.versionCreated ? new Date(item.versionCreated) : publishedAt;

      if (existingRow) {
        articlesUpdated++;
        await db
          .update(articles)
          .set({
            title: item.headline,
            content,
            ...(coverImage != null && { coverImage }),
            ...(heroImageCredit != null && { heroImageCredit }),
            publishedAt,
            updatedAt,
            sourcePublishedAt: publishedAt,
            sourceUpdatedAt: updatedAt,
            sortAt: updatedAt,
            entityEnrichStatus: "pending",
            tags: item.tags.length > 0 ? item.tags : undefined,
            authorName: item.byline ?? "PA Media",
          })
          .where(eq(articles.id, existingRow.id));
      } else {
        articlesInserted++;
        const slugTaken = await db
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.slug, slug))
          .limit(1);
        const finalSlug = slugTaken.length > 0 ? `${slug}-${shortStableHash(item.id + Date.now())}` : slug;

        await db.insert(articles).values({
          title: item.headline,
          slug: finalSlug,
          content,
          coverImage,
          heroImageCredit,
          authorName: item.byline ?? "PA Media",
          source: PA_SOURCE,
          sourceId: item.id,
          publishedAt,
          updatedAt,
          sourcePublishedAt: publishedAt,
          sourceUpdatedAt: updatedAt,
          sortAt: updatedAt,
          entityEnrichStatus: "pending",
          tags: item.tags.length > 0 ? item.tags : undefined,
        });
      }
      processed++;
    } catch (err) {
      console.warn(`[ingest-pamedia] Item ${item.id} failed:`, (err as Error).message);
    }
  }

  const timeMs = Date.now() - start;
  console.log(
    `[ingest-pamedia] fetched=${rawItems.length} processed=${processed} skipped=${skipped} imagesUploaded=${imagesUploaded} inlineRewritten=${inlineRewritten} inlineSkippedDueToCap=${inlineSkippedDueToCap} timeMs=${timeMs} stoppedReason=${stoppedReason ?? "none"}`
  );

  await finishJobRun(runId, {
    status: "success",
    counters: {
      itemsFetched: rawItems.length,
      processed,
      skipped,
      imagesUploaded,
      inlineRewritten,
      inlineSkippedDueToCap,
      articles_inserted: articlesInserted,
      articles_updated: articlesUpdated,
      timeMs,
    },
    stoppedReason,
    error: null,
  });

  return {
    ok: true,
    processed,
    itemsFetched: rawItems.length,
    imagesUploaded,
    inlineRewritten,
    skipped,
    timeMs,
    stoppedReason,
  };
  } catch (err) {
    const timeMs = Date.now() - start;
    await finishJobRun(runId, {
      status: "error",
      error: (err as Error).message,
      counters: {
        itemsFetched: rawItems.length,
        processed,
        skipped,
        imagesUploaded,
        inlineRewritten,
        inlineSkippedDueToCap,
        articles_inserted: articlesInserted,
        articles_updated: articlesUpdated,
        timeMs,
      },
    });
    return { ok: false, processed, error: (err as Error).message };
  }
  });
}
