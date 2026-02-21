/**
 * Backfill inline images for existing PA Media articles: content has <img> but no img.footballmad.co.uk.
 * Uses the same pipeline as ingest-pamedia (fetch → sharp → R2 → rewrite HTML). Only updates content + updated_at.
 *
 * Observability: startJobRun('backfill_pamedia_inline'), job_http_calls via jobFetch.
 *
 * Verify remaining count:
 *   SELECT count(*) FROM articles
 *   WHERE source = 'pa_media'
 *     AND content ILIKE '%<img%'
 *     AND content NOT ILIKE '%img.footballmad.co.uk%';
 */

import { db } from "../db";
import { articles } from "@shared/schema";
import { eq, and, desc, ilike, not } from "drizzle-orm";
import * as cheerio from "cheerio";
import { uploadImageVariantsToR2, seoSlugFromText, shortStableHash } from "../lib/r2";
import { startJobRun, finishJobRun, jobFetch } from "../lib/job-observability";
import { runWithJobContext } from "../lib/job-context";

const FETCH_TIMEOUT_MS = 10_000;
const IMAGE_WIDTHS = [320, 640, 960, 1280] as const;
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk").replace(/\/$/, "");
const PAMEDIA_IMAGE_CONCURRENCY = Math.max(1, parseInt(process.env.PAMEDIA_IMAGE_CONCURRENCY ?? "2", 10));
const PAMEDIA_MAX_INLINE_IMAGES = Math.max(1, parseInt(process.env.PAMEDIA_MAX_INLINE_IMAGES ?? "5", 10));
const BACKFILL_LIMIT = Math.max(1, parseInt(process.env.BACKFILL_LIMIT ?? "25", 10));

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

function getFirstUrlFromSrcset(srcset: string): string | null {
  const part = srcset.split(",")[0]?.trim();
  if (!part) return null;
  const space = part.lastIndexOf(" ");
  const url = space >= 0 ? part.slice(0, space).trim() : part;
  return url?.trim() || null;
}

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

export async function runBackfillPaMediaInlineImages(): Promise<{
  ok: boolean;
  processed: number;
  updated: number;
  imagesUploaded: number;
  inlineRewritten: number;
  skipped: number;
  error?: string;
}> {
  const run = await startJobRun("backfill_pamedia_inline", { limit: BACKFILL_LIMIT });
  const runId = run.id;

  return runWithJobContext(run.id, async () => {
    try {
    const rows = await db
      .select({
        id: articles.id,
        content: articles.content,
        title: articles.title,
        sourceId: articles.sourceId,
      })
      .from(articles)
      .where(
        and(
          eq(articles.source, "pa_media"),
          ilike(articles.content, "%<img%"),
          not(ilike(articles.content, "%img.footballmad.co.uk%"))
        )
      )
      .orderBy(desc(articles.publishedAt))
      .limit(BACKFILL_LIMIT);

    let processed = 0;
    let updated = 0;
    let imagesUploaded = 0;
    let inlineRewritten = 0;
    let skipped = 0;
    const semaphore = createSemaphore(PAMEDIA_IMAGE_CONCURRENCY);
    const defaultSizes = "(max-width: 767px) 89vw, (max-width: 1000px) 54vw, 580px";
    const headline = (row: { title: string | null }) => (row.title ?? "article").trim() || "article";
    const articleId = (row: { sourceId: string | null }) => row.sourceId ?? "unknown";

    for (const row of rows) {
      processed++;
      try {
        let content = row.content ?? "";
        const $ = cheerio.load(content, { decodeEntities: true });

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
        let itemRewritten = 0;

        for (const { el, url } of toProcess) {
          const $img = $(el);
          const baseName =
            (seoSlugFromText(headline(row)) || "image") + "-" + shortStableHash(url).slice(0, 8);
          await semaphore.acquire();
          try {
            const buf = await fetchWithTimeout(runId, url);
            if (!buf?.length) continue;
            const result = await uploadImageVariantsToR2({
              buffer: buf,
              source: "pa_media",
              articleId: articleId(row),
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
            itemRewritten++;
            inlineRewritten++;
          } catch (e) {
            console.warn(`[backfill-pamedia-inline] Inline image failed (article ${row.id}):`, (e as Error).message);
          } finally {
            semaphore.release();
          }
        }

        if (itemRewritten > 0) {
          const newContent = $.html();
          await db
            .update(articles)
            .set({
              content: newContent,
              updatedAt: new Date(),
            })
            .where(eq(articles.id, row.id));
          updated++;
        }
      } catch (err) {
        skipped++;
        console.warn(`[backfill-pamedia-inline] Article ${row.id} failed:`, (err as Error).message);
      }
    }

    await finishJobRun(runId, {
      status: "success",
      counters: {
        processed,
        updated,
        imagesUploaded,
        inlineRewritten,
        skipped,
      },
    });

    return {
      ok: true,
      processed,
      updated,
      imagesUploaded,
      inlineRewritten,
      skipped,
    };
    } catch (err) {
      await finishJobRun(runId, { status: "error", error: (err as Error).message });
      return {
        ok: false,
        processed: 0,
        updated: 0,
        imagesUploaded: 0,
        inlineRewritten: 0,
        skipped: 0,
        error: (err as Error).message,
      };
    }
  });
}
