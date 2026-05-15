import sharp from "sharp";
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./social-image-url";

const TARGET_ASPECT = SOCIAL_IMAGE_WIDTH / SOCIAL_IMAGE_HEIGHT;
const HERO_16_9_ASPECT = 16 / 9;
/** Within this relative delta we treat source as pre-composed hero (minimal trim). */
const NEAR_COMPOSED_ASPECT_TOLERANCE = 0.1;

const JPEG_OPTIONS = { quality: 85, mozjpeg: true } as const;

type CoverPosition = "attention" | "centre" | "north" | number;

function aspectRatioClose(a: number, b: number, tolerance: number): boolean {
  return Math.abs(a - b) / b <= tolerance;
}

function isNearComposedHeroAspect(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  const aspect = width / height;
  return (
    aspectRatioClose(aspect, TARGET_ASPECT, NEAR_COMPOSED_ASPECT_TOLERANCE) ||
    aspectRatioClose(aspect, HERO_16_9_ASPECT, NEAR_COMPOSED_ASPECT_TOLERANCE)
  );
}

async function resizeSocialOgCover(input: Buffer, position: CoverPosition): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT, {
      fit: "cover",
      position,
      withoutEnlargement: false,
    })
    .jpeg(JPEG_OPTIONS)
    .toBuffer();
}

/** Try libvips attention crop; return null if unavailable or rejected. */
async function tryAttentionCover(input: Buffer): Promise<Buffer | null> {
  const positions: CoverPosition[] = ["attention", sharp.strategy.attention];
  for (const position of positions) {
    try {
      return await resizeSocialOgCover(input, position);
    } catch {
      // try next strategy representation
    }
  }
  return null;
}

/**
 * Convert any raster buffer to a 1200×630 social JPEG (cover, no stretch).
 * - Near 16:9 / near OG aspect (typical PA heroes): top-weighted cover (`north`).
 * - Otherwise: Sharp attention when available, else centre.
 */
export async function bufferToSocialOgJpeg(
  input: Buffer,
  options: { preferCentre?: boolean } = {},
): Promise<Buffer> {
  if (options.preferCentre) {
    return resizeSocialOgCover(input, "centre");
  }

  const meta = await sharp(input, { failOn: "none" }).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  if (isNearComposedHeroAspect(width, height)) {
    try {
      return await resizeSocialOgCover(input, "north");
    } catch {
      return resizeSocialOgCover(input, "centre");
    }
  }

  const attention = await tryAttentionCover(input);
  if (attention) return attention;

  return resizeSocialOgCover(input, "centre");
}
