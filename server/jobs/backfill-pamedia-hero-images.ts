/**
 * Backfill PA Media hero images to 16:9 (1280x720, top-anchored crop).
 * Finds articles where cover_image points to our R2 hero path, downloads, reprocesses, overwrites same key.
 *
 * Observability: startJobRun('backfill_pamedia_hero'), job_http_calls via jobFetch.
 */

import { db } from "../db";
import { articles } from "@shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import { resizeToHero1280x720Webp, uploadBufferToR2Key } from "../lib/r2";
import { startJobRun, finishJobRun, jobFetch } from "../lib/job-observability";
import { runWithJobContext } from "../lib/job-context";

const FETCH_TIMEOUT_MS = 15_000;
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk").replace(/\/$/, "");
const HERO_BACKFILL_LIMIT = Math.max(1, parseInt(process.env.PAMEDIA_HERO_BACKFILL_LIMIT ?? "50", 10));

function normalizeUrl(url: string): string {
  const s = url.trim();
  if (s.startsWith("//")) return `https:${s}`;
  return s;
}

/** R2 key from public URL (path after origin). */
function keyFromCoverImageUrl(url: string): string | null {
  try {
    const u = new URL(normalizeUrl(url));
    const path = u.pathname.replace(/^\//, "");
    if (!path || !path.startsWith("pa_media/") || !path.includes("/hero/")) return null;
    return path;
  } catch {
    return null;
  }
}

function isOurHeroUrl(url: string): boolean {
  const n = normalizeUrl(url);
  return (n.includes(R2_PUBLIC_BASE_URL) || n.includes("img.footballmad.co.uk")) && n.includes("/hero/");
}

async function fetchWithTimeout(runId: string, url: string): Promise<Buffer> {
  const res = await jobFetch(runId, {
    provider: "pa_media",
    url: normalizeUrl(url),
    method: "GET",
    timeoutMs: FETCH_TIMEOUT_MS,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function runBackfillPaMediaHeroImages(): Promise<{
  ok: boolean;
  processed: number;
  updated: number;
  imagesUploaded: number;
  skipped: number;
  error?: string;
}> {
  const run = await startJobRun("backfill_pamedia_hero", { limit: HERO_BACKFILL_LIMIT });
  const runId = run.id;

  return runWithJobContext(run.id, async () => {
    try {
      const rows = await db
        .select({
          id: articles.id,
          coverImage: articles.coverImage,
        })
        .from(articles)
        .where(
          and(
            eq(articles.source, "pa_media"),
            ilike(articles.coverImage, "%/hero/%")
          )
        )
        .limit(HERO_BACKFILL_LIMIT);

      const toProcess = rows.filter((r) => r.coverImage && isOurHeroUrl(r.coverImage));
      let processed = 0;
      let imagesUploaded = 0;
      let skipped = 0;
      let attentionCount = 0;
      let centreCount = 0;

      for (const row of toProcess) {
        const url = row.coverImage!;
        const key = keyFromCoverImageUrl(url);
        if (!key) {
          skipped++;
          continue;
        }
        try {
          const buf = await fetchWithTimeout(runId, url);
          if (!buf?.length) {
            skipped++;
            continue;
          }
          const { buf: webpBuf, crop } = await resizeToHero1280x720Webp(buf);
          await uploadBufferToR2Key(key, webpBuf, "image/webp");
          processed++;
          imagesUploaded++;
          if (crop === "attention") attentionCount++;
          else centreCount++;
        } catch (e) {
          console.warn(`[backfill-pamedia-hero] Article ${row.id} failed:`, (e as Error).message);
          skipped++;
        }
      }

      console.log(`[backfill-pamedia-hero] Done processed=${processed} attention=${attentionCount} centreFallback=${centreCount} skipped=${skipped}`);

      await finishJobRun(runId, {
        status: "success",
        counters: {
          processed,
          updated: processed,
          imagesUploaded,
          skipped,
          attentionCrop: attentionCount,
          centreFallback: centreCount,
        },
      });

      return {
        ok: true,
        processed,
        updated: processed,
        imagesUploaded,
        skipped,
      };
    } catch (err) {
      await finishJobRun(runId, { status: "error", error: (err as Error).message });
      return {
        ok: false,
        processed: 0,
        updated: 0,
        imagesUploaded: 0,
        skipped: 0,
        error: (err as Error).message,
      };
    }
  });
}
