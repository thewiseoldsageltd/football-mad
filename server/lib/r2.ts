/**
 * R2 (S3-compatible) upload for PA Media hero images. Uses existing R2 bucket config.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL ?? "https://img.footballmad.co.uk";
const R2_ENDPOINT =
  process.env.R2_ENDPOINT ||
  (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

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

/**
 * Upload hero image to R2. Key: pa_media/{paItemId}/hero-{hash}.{ext}
 * Returns public URL.
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
