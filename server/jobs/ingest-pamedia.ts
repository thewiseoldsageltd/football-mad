/**
 * PA Media ingestion: fetch latest items, upsert articles (source=pa_media), upload hero to R2. Idempotent.
 */

import { db } from "../db";
import { articles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { uploadHeroToR2 } from "../lib/r2";

const PA_SOURCE = "pa_media";
const BASE_URL = process.env.PAMEDIA_API_BASE_URL ?? "https://content.api.pressassociation.io/v1";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function shortHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).slice(0, 8);
}

function uniqueSlug(headline: string, sourceId: string): string {
  const base = slugify(headline) || "article";
  return `${base}-${shortHash(sourceId)}`;
}

function getItems(response: Record<string, unknown>): unknown[] {
  const arr = response.items ?? response.data ?? response.results;
  return Array.isArray(arr) ? arr : [];
}

function normalizeItem(raw: Record<string, unknown>): {
  id: string;
  headline: string;
  content: string;
  heroUrl: string | null;
  issued?: string;
  versionCreated?: string;
} | null {
  const id = (raw.uri ?? raw.id ?? raw["@id"]) as string | undefined;
  if (!id || typeof id !== "string") return null;

  const headline = (raw.headline ?? raw.title ?? raw.name ?? "") as string;
  const bodyHtml = (raw.body_html ?? raw.bodyHtml ?? raw["body_html"]) as string | undefined;
  const bodyText = (raw.body_text ?? raw.bodyText ?? raw["body_text"]) as string | undefined;
  const content = (bodyHtml && bodyHtml.trim()) ? bodyHtml : (bodyText ? `<p>${bodyText}</p>` : "<p></p>");

  const heroUrl =
    (raw.hero_image_url ?? raw.image_url ?? raw.thumbnail_url ?? raw.heroImageUrl) as string | undefined;
  const issued = (raw.issued ?? raw.versioncreated ?? raw.versionCreated) as string | undefined;
  const versionCreated = (raw.versioncreated ?? raw.versionCreated ?? raw.updated ?? issued) as string | undefined;

  return {
    id,
    headline: headline && typeof headline === "string" ? headline : "Untitled",
    content,
    heroUrl: heroUrl && typeof heroUrl === "string" ? heroUrl : null,
    issued,
    versionCreated,
  };
}

export async function runPaMediaIngest(): Promise<{ ok: boolean; processed: number; error?: string }> {
  const apiKey = process.env.PAMEDIA_API_KEY;
  if (!apiKey) {
    return { ok: false, processed: 0, error: "PAMEDIA_API_KEY is not set" };
  }

  const url = `${BASE_URL.replace(/\/$/, "")}/item`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { apikey: apiKey, "Content-Type": "application/json" },
    });
  } catch (err) {
    return { ok: false, processed: 0, error: (err as Error).message };
  }

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, processed: 0, error: `PA API ${res.status}: ${text.slice(0, 200)}` };
  }

  const body = (await res.json()) as Record<string, unknown>;
  const rawItems = getItems(body);
  let processed = 0;

  for (const raw of rawItems) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = normalizeItem(raw as Record<string, unknown>);
    if (!item) continue;

    try {
      let coverImage: string | null = null;
      if (item.heroUrl) {
        try {
          const imgRes = await fetch(item.heroUrl, { redirect: "follow" });
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const contentType = imgRes.headers.get("content-type") || "image/jpeg";
            coverImage = await uploadHeroToR2(item.id, buf, contentType);
          }
        } catch {
          // skip hero on failure
        }
      }

      const slug = uniqueSlug(item.headline, item.id);
      const publishedAt = item.issued ? new Date(item.issued) : new Date();
      const updatedAt = item.versionCreated ? new Date(item.versionCreated) : publishedAt;

      const existing = await db
        .select({ id: articles.id, slug: articles.slug })
        .from(articles)
        .where(and(eq(articles.source, PA_SOURCE), eq(articles.sourceId, item.id)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(articles)
          .set({
            title: item.headline,
            content: item.content,
            coverImage,
            publishedAt,
            updatedAt,
            sourcePublishedAt: publishedAt,
            sourceUpdatedAt: updatedAt,
            sortAt: updatedAt,
            entityEnrichStatus: "pending", // content changed; re-run enrichment
          })
          .where(eq(articles.id, existing[0].id));
      } else {
        const slugTaken = await db
          .select({ id: articles.id })
          .from(articles)
          .where(eq(articles.slug, slug))
          .limit(1);
        const finalSlug = slugTaken.length > 0 ? `${slug}-${shortHash(item.id + Date.now())}` : slug;

        await db.insert(articles).values({
          title: item.headline,
          slug: finalSlug,
          content: item.content,
          coverImage,
          authorName: "PA Media",
          source: PA_SOURCE,
          sourceId: item.id,
          publishedAt,
          updatedAt,
          sourcePublishedAt: publishedAt,
          sourceUpdatedAt: updatedAt,
          sortAt: updatedAt,
          entityEnrichStatus: "pending", // new article; enrichment will run async
        });
      }
      processed++;
    } catch (err) {
      console.warn(`[ingest-pamedia] Item ${item.id} failed:`, (err as Error).message);
    }
  }

  return { ok: true, processed };
}
