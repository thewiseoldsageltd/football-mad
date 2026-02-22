/**
 * R2 (S3-compatible) upload for PA Media images. SEO-friendly keys, multiple WEBP variants.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

// Throttle sharp globally to reduce memory pressure (Render exit 134).
const PAMEDIA_SHARP_CONCURRENCY = Math.max(1, parseInt(process.env.PAMEDIA_SHARP_CONCURRENCY ?? "1", 10));
const PAMEDIA_SHARP_CACHE_MB = Math.max(0, parseInt(process.env.PAMEDIA_SHARP_CACHE_MB ?? "32", 10));
sharp.concurrency(PAMEDIA_SHARP_CONCURRENCY);
sharp.cache({ memory: PAMEDIA_SHARP_CACHE_MB, files: 10, items: 50 });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk";
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const IMAGE_WIDTHS = [320, 640, 960, 1280] as const;
const WEBP_QUALITY = 80;

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_client) {
    if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
      throw new Error("R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET must be set");
    }
    _client = new S3Client({
      region: "auto",
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return _client;
}

/** Slugify: lowercase, hyphens, safe chars, trim. */
function slugifySegment(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Common stopwords to drop from SEO slug (lowercase). */
const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "can", "could", "did", "do", "does",
  "during", "for", "from", "had", "has", "have", "in", "is", "may", "might", "must", "of", "on", "or",
  "should", "the", "to", "was", "were", "will", "with", "would",
]);

/**
 * SEO-friendly slug from caption/headline: stopword filter, ~8 words max, slugify, safe chars.
 */
export function seoSlugFromText(text: string): string {
  if (!text || typeof text !== "string") return "image";
  const words = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .slice(0, 8);
  const combined = words.join("-") || "image";
  return slugifySegment(combined) || "image";
}

/** 8-char stable hash for uniqueness. */
export function shortStableHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).slice(0, 8);
}

export interface BuildImageKeyOpts {
  source: "pa_media";
  articleId: string;
  kind: "hero" | "inline";
  baseName: string;
  width: number;
}

/**
 * R2 object key for a single variant: pa_media/{articleId}/{kind}/{baseName}-{hash}-{width}.webp
 */
export function buildImageKey(opts: BuildImageKeyOpts): string {
  const { source, articleId, kind, baseName, width } = opts;
  const safeId = slugifySegment(articleId) || shortStableHash(articleId);
  const safeName = slugifySegment(baseName) || "image";
  const hash = shortStableHash(`${articleId}-${kind}-${baseName}`);
  return `${source}/${safeId}/${kind}/${safeName}-${hash}-${width}.webp`;
}

/**
 * Resize buffer to width (keep aspect ratio), encode as WEBP.
 */
async function resizeToWebp(buffer: Buffer, width: number): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, undefined, { withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** 16:9 smart crop (for hero). Tries Sharp "attention" strategy, falls back to "centre". */
async function resizeToWebpHero(buffer: Buffer, width: number): Promise<{ buf: Buffer; crop: "attention" | "centre" }> {
  const height = Math.round((width * 9) / 16);
  try {
    const buf = await sharp(buffer)
      .resize(width, height, { fit: "cover", position: "attention" })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { buf, crop: "attention" };
  } catch {
    const buf = await sharp(buffer)
      .resize(width, height, { fit: "cover", position: "centre" })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { buf, crop: "centre" };
  }
}

/** Single 1280x720 hero WEBP (for backfill overwrite). Returns buffer + crop mode used. */
export async function resizeToHero1280x720Webp(buffer: Buffer): Promise<{ buf: Buffer; crop: "attention" | "centre" }> {
  return resizeToWebpHero(buffer, 1280);
}

export interface UploadImageVariantsToR2Opts {
  buffer: Buffer;
  source: "pa_media";
  articleId: string;
  kind: "hero" | "inline";
  baseName: string;
}

export interface UploadImageVariantsResult {
  original: string;   // 1280 URL
  variants: Record<number, string>;
  srcset: string;
}

/**
 * Generate 320/640/960/1280 WEBP variants, upload to R2, return URLs and srcset.
 * Hero kind: 16:9 smart crop (attention with centre fallback). Inline: keep aspect ratio.
 */
export async function uploadImageVariantsToR2(opts: UploadImageVariantsToR2Opts): Promise<UploadImageVariantsResult> {
  const { buffer, source, articleId, kind, baseName } = opts;
  const client = getR2Client();
  const base = R2_PUBLIC_BASE_URL.replace(/\/$/, "");
  const variants: Record<number, string> = {};
  const srcsetParts: string[] = [];
  const isHero = kind === "hero";

  for (const w of IMAGE_WIDTHS) {
    const webpBuf = isHero ? (await resizeToWebpHero(buffer, w)).buf : await resizeToWebp(buffer, w);
    const key = buildImageKey({ source, articleId, kind, baseName, width: w });
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: webpBuf,
        ContentType: "image/webp",
      })
    );
    const url = `${base}/${key}`;
    variants[w] = url;
    srcsetParts.push(`${url} ${w}w`);
  }

  const original = variants[1280] ?? variants[960] ?? variants[640] ?? variants[320];
  return {
    original,
    variants,
    srcset: srcsetParts.join(", "),
  };
}

/** Legacy: single hero upload (non-WEBP, single size). Kept for backward compatibility if needed. */
function slugify(text: string): string {
  return slugifySegment(text);
}

function shortHash(input: string): string {
  return shortStableHash(input);
}

/**
 * Upload hero image to R2. Key: pa_media/{paItemId}/hero-{hash}.{ext}
 * Returns public URL. Prefer uploadImageVariantsToR2 for new code.
 */
export async function uploadHeroToR2(paItemId: string, buffer: Buffer, contentType: string): Promise<string> {
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const key = `pa_media/${slugify(paItemId) || shortHash(paItemId)}/hero-${shortHash(buffer.toString("base64").slice(0, 200))}.${ext}`;

  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType || "image/jpeg",
    })
  );

  const base = R2_PUBLIC_BASE_URL.replace(/\/$/, "");
  return `${base}/${key}`;
}

/**
 * Upload a buffer to an existing R2 key (overwrite). Used by hero backfill.
 */
export async function uploadBufferToR2Key(key: string, body: Buffer, contentType: string = "image/webp"): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}
