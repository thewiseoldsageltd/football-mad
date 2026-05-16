/**
 * R2 (S3-compatible) upload for PA Media images. SEO-friendly keys, multiple WEBP variants.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import { ARTICLE_IMAGE_CROP_POSITION } from "./article-image-crop";

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

const HERO_DISPLAY_WIDTH = 1280;
const SOCIAL_JPEG_WIDTH = 1200;
const SOCIAL_JPEG_HEIGHT = 630;
const JPEG_QUALITY = 85;

export interface BuildImageKeyOpts {
  source: "pa_media";
  articleId: string;
  kind: "hero" | "inline";
  baseName: string;
  width: number;
}

export interface BuildSocialImageKeyOpts {
  source: "pa_media";
  articleId: string;
  baseName: string;
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

/** R2 key: pa_media/{articleId}/social/{baseName}-{hash}-1200.jpg */
export function buildSocialImageKey(opts: BuildSocialImageKeyOpts): string {
  const { source, articleId, baseName } = opts;
  const safeId = slugifySegment(articleId) || shortStableHash(articleId);
  const safeName = slugifySegment(baseName) || "image";
  const hash = shortStableHash(`${articleId}-social-${baseName}`);
  return `${source}/${safeId}/social/${safeName}-${hash}-${SOCIAL_JPEG_WIDTH}.jpg`;
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

/** 16:9 top-anchored crop for article hero display (1280×720 WebP). */
export async function resizeToHeroDisplayWebp(buffer: Buffer, width: number = HERO_DISPLAY_WIDTH): Promise<Buffer> {
  const height = Math.round((width * 9) / 16);
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(width, height, { fit: "cover", position: ARTICLE_IMAGE_CROP_POSITION })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/** 1200×630 JPEG for social cards (same crop anchor as hero display). */
export async function resizeToSocialJpeg(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(SOCIAL_JPEG_WIDTH, SOCIAL_JPEG_HEIGHT, {
      fit: "cover",
      position: ARTICLE_IMAGE_CROP_POSITION,
      withoutEnlargement: false,
    })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

/** @deprecated Legacy hero backfill; uses attention crop. Prefer {@link resizeToHeroDisplayWebp}. */
async function resizeToWebpHeroLegacy(buffer: Buffer, width: number): Promise<{ buf: Buffer; crop: "attention" | "centre" }> {
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

/** Single 1280x720 hero WEBP (legacy backfill overwrite). */
export async function resizeToHero1280x720Webp(buffer: Buffer): Promise<{ buf: Buffer; crop: "attention" | "centre" }> {
  return resizeToWebpHeroLegacy(buffer, 1280);
}

export interface UploadArticleCoverDerivativesOpts {
  buffer: Buffer;
  source: "pa_media";
  articleId: string;
  baseName: string;
}

export interface UploadArticleCoverDerivativesResult {
  heroImageUrl: string;
  socialImageUrl: string;
}

/** Upload 16:9 hero WebP + 1200×630 social JPEG derived from the same source buffer. */
export async function uploadArticleCoverDerivatives(
  opts: UploadArticleCoverDerivativesOpts,
): Promise<UploadArticleCoverDerivativesResult> {
  const { buffer, source, articleId, baseName } = opts;
  const client = getR2Client();
  const base = R2_PUBLIC_BASE_URL.replace(/\/$/, "");

  const [heroBuf, socialBuf] = await Promise.all([
    resizeToHeroDisplayWebp(buffer),
    resizeToSocialJpeg(buffer),
  ]);

  const heroKey = buildImageKey({
    source,
    articleId,
    kind: "hero",
    baseName,
    width: HERO_DISPLAY_WIDTH,
  });
  const socialKey = buildSocialImageKey({ source, articleId, baseName });

  await Promise.all([
    client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: heroKey,
        Body: heroBuf,
        ContentType: "image/webp",
      }),
    ),
    client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: socialKey,
        Body: socialBuf,
        ContentType: "image/jpeg",
      }),
    ),
  ]);

  return {
    heroImageUrl: `${base}/${heroKey}`,
    socialImageUrl: `${base}/${socialKey}`,
  };
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
    const webpBuf = isHero
      ? await resizeToHeroDisplayWebp(buffer, w)
      : await resizeToWebp(buffer, w);
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
