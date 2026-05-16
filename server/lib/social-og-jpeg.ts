import sharp from "sharp";
import { ARTICLE_IMAGE_CROP_POSITION } from "./article-image-crop";
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./social-image-url";

const JPEG_OPTIONS = { quality: 85, mozjpeg: true } as const;

/** Convert a raster buffer to 1200×630 JPEG for Open Graph (top-anchored cover crop). */
export async function bufferToSocialOgJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none" })
    .rotate()
    .resize(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT, {
      fit: "cover",
      position: ARTICLE_IMAGE_CROP_POSITION,
      withoutEnlargement: false,
    })
    .jpeg(JPEG_OPTIONS)
    .toBuffer();
}
