/**
 * Backfill heroImageUrl (16:9 WebP) and socialImageUrl (1200×630 JPEG) from existing coverImage.
 *
 * Env: BACKFILL_LIMIT (default 25), BACKFILL_DRY_RUN=1, BACKFILL_FORCE=1
 *
 * HTTP: POST /api/jobs/backfill-article-image-variants?limit=25&dryRun=1&force=0
 */

import { db } from "../db";
import { articles } from "@shared/schema";
import { and, desc, eq, ilike, isNotNull, isNull, or } from "drizzle-orm";
import { uploadArticleCoverDerivatives, seoSlugFromText, shortStableHash } from "../lib/r2";
import { startJobRun, finishJobRun, jobFetch } from "../lib/job-observability";
import { runWithJobContext } from "../lib/job-context";

const FETCH_TIMEOUT_MS = 15_000;
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk").replace(/\/$/, "");

export type BackfillArticleImageVariantsOptions = {
  limit?: number;
  dryRun?: boolean;
  force?: boolean;
};

function parseBool(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  return false;
}

function isOurCdnUrl(url: string): boolean {
  const u = url.trim();
  return u.includes(R2_PUBLIC_BASE_URL) || u.includes("img.footballmad.co.uk");
}

function normalizeUrl(url: string): string {
  const s = url.trim();
  if (s.startsWith("//")) return `https:${s}`;
  return s;
}

/** pa_media/{articleId}/inline/{base}-1280.webp → articleId */
function paArticleIdFromCoverUrl(url: string): string | null {
  const m = url.match(/pa_media\/([^/]+)\//i);
  return m?.[1] ?? null;
}

/** Filename stem before -1280.webp (matches ingest baseName + hash suffix). */
function baseNameFromCoverUrl(url: string): string {
  const m = url.match(/\/(?:inline|hero)\/([^/]+)-1280\.webp$/i);
  if (m?.[1]) return m[1];
  return `${seoSlugFromText("image")}-${shortStableHash(url).slice(0, 8)}`;
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

export async function runBackfillArticleImageVariants(
  options: BackfillArticleImageVariantsOptions = {},
): Promise<{
  ok: boolean;
  dryRun: boolean;
  force: boolean;
  processed: number;
  updated: number;
  skipped: number;
  imagesUploaded: number;
  error?: string;
}> {
  const limit = Math.max(1, options.limit ?? parseInt(process.env.BACKFILL_LIMIT ?? "25", 10));
  const dryRun = options.dryRun ?? parseBool(process.env.BACKFILL_DRY_RUN);
  const force = options.force ?? parseBool(process.env.BACKFILL_FORCE);

  const run = await startJobRun("backfill_article_image_variants", { limit, dryRun, force });
  const runId = run.id;

  return runWithJobContext(run.id, async () => {
    try {
      const missingVariants = or(isNull(articles.heroImageUrl), isNull(articles.socialImageUrl));
      const whereClause = force
        ? and(isNotNull(articles.coverImage), ilike(articles.coverImage, "%img.footballmad.co.uk%"))
        : and(
            isNotNull(articles.coverImage),
            ilike(articles.coverImage, "%img.footballmad.co.uk%"),
            missingVariants,
          );
      const rows = await db
        .select({
          id: articles.id,
          slug: articles.slug,
          sourceId: articles.sourceId,
          coverImage: articles.coverImage,
          heroImageUrl: articles.heroImageUrl,
          socialImageUrl: articles.socialImageUrl,
        })
        .from(articles)
        .where(whereClause)
        .orderBy(desc(articles.publishedAt))
        .limit(limit);

      let processed = 0;
      let updated = 0;
      let skipped = 0;
      let imagesUploaded = 0;

      for (const row of rows) {
        const cover = row.coverImage?.trim();
        if (!cover || !isOurCdnUrl(cover)) {
          skipped++;
          continue;
        }

        if (
          !force &&
          row.heroImageUrl?.trim() &&
          row.socialImageUrl?.trim()
        ) {
          skipped++;
          continue;
        }

        processed++;

        if (dryRun) {
          console.log(
            `[backfill-article-image-variants] dry-run article=${row.id} slug=${row.slug} cover=${cover}`,
          );
          updated++;
          continue;
        }

        try {
          const buf = await fetchWithTimeout(runId, cover);
          if (!buf?.length) {
            skipped++;
            continue;
          }

          const articleId = row.sourceId ?? paArticleIdFromCoverUrl(cover) ?? row.id;
          const baseName = baseNameFromCoverUrl(cover);
          const { heroImageUrl, socialImageUrl } = await uploadArticleCoverDerivatives({
            buffer: buf,
            source: "pa_media",
            articleId,
            baseName,
          });
          imagesUploaded += 2;

          await db
            .update(articles)
            .set({ heroImageUrl, socialImageUrl })
            .where(eq(articles.id, row.id));

          updated++;
        } catch (e) {
          console.warn(
            `[backfill-article-image-variants] Article ${row.id} (${row.slug}) failed:`,
            (e as Error).message,
          );
          skipped++;
        }
      }

      await finishJobRun(runId, {
        status: "success",
        counters: { processed, updated, skipped, imagesUploaded, dryRun: dryRun ? 1 : 0, force: force ? 1 : 0 },
      });

      return { ok: true, dryRun, force, processed, updated, skipped, imagesUploaded };
    } catch (err) {
      const message = (err as Error).message;
      await finishJobRun(runId, { status: "error", error: message });
      return {
        ok: false,
        dryRun,
        force,
        processed: 0,
        updated: 0,
        skipped: 0,
        imagesUploaded: 0,
        error: message,
      };
    }
  });
}
