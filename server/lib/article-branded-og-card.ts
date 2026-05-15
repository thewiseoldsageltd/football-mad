import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { Article } from "@shared/schema";
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./social-image-url";

const JPEG_OPTIONS = { quality: 88, mozjpeg: true } as const;

const W = SOCIAL_IMAGE_WIDTH;
const H = SOCIAL_IMAGE_HEIGHT;
const SAFE = 48;
const BOTTOM_GRADIENT_RATIO = 0.38;
const BOTTOM_GRADIENT_HEIGHT = Math.round(H * BOTTOM_GRADIENT_RATIO);

const TEXT_WHITE = "#FFFFFF";
const BG_FALLBACK = "#0B100E";

const LOGO_WIDTH = 112;

const HEADLINE_FONT_SIZE = 44;
const HEADLINE_LINE_HEIGHT = 52;
const HEADLINE_MAX_LINES = 3;
const HEADLINE_PREFERRED_LINES = 2;
const HEADLINE_MAX_CHARS = 54;

function resolvePublicAssetPath(...segments: string[]): string | null {
  const roots = [
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "client", "public"),
  ];
  for (const root of roots) {
    const full = path.join(root, ...segments);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/**
 * Prefer a dedicated transparent PNG; fall back to the site FM logo asset.
 * TODO: add `assets/football-mad-logo-transparent.png` for a true watermark lockup.
 */
async function loadLogoOverlay(): Promise<Buffer | null> {
  const transparentCandidates = [
    ["assets", "football-mad-logo-transparent.png"],
    ["assets", "fm-logo-transparent.png"],
  ];

  for (const segments of transparentCandidates) {
    const logoPath = resolvePublicAssetPath(...segments);
    if (!logoPath) continue;
    return sharp(logoPath).png().toBuffer();
  }

  const fallbackPath = resolvePublicAssetPath("assets", "football-mad-fm-logo.webp");
  if (!fallbackPath) return null;

  return sharp(fallbackPath).png().toBuffer();
}

async function logoCompositeLayer(logo: Buffer): Promise<Buffer> {
  return sharp(logo).resize({ width: LOGO_WIDTH }).ensureAlpha().png().toBuffer();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function articleHeadline(article: Article): string {
  const title = typeof article.title === "string" ? article.title.trim() : "";
  return title || "Football Mad";
}

function wrapHeadlineToMaxLines(text: string, maxLines: number, charsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";
  let wordIndex = 0;

  for (const word of words) {
    wordIndex += 1;
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > charsPerLine && current && lines.length < maxLines - 1) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    if (lines.length < maxLines) {
      lines.push(current);
    } else if (wordIndex < words.length || current.length > charsPerLine) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.endsWith("…")
        ? last
        : `${last.slice(0, charsPerLine - 1)}…`;
    }
  }

  return lines.slice(0, maxLines);
}

function wrapHeadline(text: string): string[] {
  const twoLine = wrapHeadlineToMaxLines(text, HEADLINE_PREFERRED_LINES, HEADLINE_MAX_CHARS);
  const usedWords = twoLine.join(" ").split(/\s+/).filter(Boolean).length;
  const totalWords = text.split(/\s+/).filter(Boolean).length;

  if (usedWords >= totalWords) {
    return twoLine;
  }

  return wrapHeadlineToMaxLines(text, HEADLINE_MAX_LINES, HEADLINE_MAX_CHARS);
}

function buildBottomGradientSvg(): Buffer {
  const y = H - BOTTOM_GRADIENT_HEIGHT;
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bottomFade" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color="rgba(0, 0, 0, 0.78)"/>
          <stop offset="55%" stop-color="rgba(0, 0, 0, 0.42)"/>
          <stop offset="100%" stop-color="rgba(0, 0, 0, 0)"/>
        </linearGradient>
      </defs>
      <rect x="0" y="${y}" width="${W}" height="${BOTTOM_GRADIENT_HEIGHT}" fill="url(#bottomFade)"/>
    </svg>`,
  );
}

function buildTitleOverlaySvg(headlineLines: string[]): Buffer {
  const blockHeight = headlineLines.length * HEADLINE_LINE_HEIGHT;
  const headlineStartY = H - SAFE - blockHeight;
  const titleElements = headlineLines.map((line, i) => {
    const y = headlineStartY + (i + 1) * HEADLINE_LINE_HEIGHT - 8;
    return `<text x="${SAFE}" y="${y}" fill="${TEXT_WHITE}" font-family="Arial, Helvetica, sans-serif" font-size="${HEADLINE_FONT_SIZE}" font-weight="700">${escapeXml(line)}</text>`;
  });

  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="0" height="0" fill="none"/>
      ${titleElements.join("\n")}
    </svg>`,
  );
}

async function buildHeroBackground(photo: Buffer): Promise<Buffer> {
  return sharp(photo, { failOn: "none" })
    .rotate()
    .resize(W, H, { fit: "cover", position: "north" })
    .toBuffer();
}

async function buildFallbackBackground(): Promise<Buffer> {
  return sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: BG_FALLBACK,
    },
  })
    .jpeg(JPEG_OPTIONS)
    .toBuffer();
}

/**
 * Ghost-style 1200×630 article social card: full-bleed hero, bottom gradient, title, logo.
 */
export async function renderArticleBrandedOgCard(
  article: Article,
  photoBuffer: Buffer | null,
): Promise<Buffer> {
  const headlineLines = wrapHeadline(articleHeadline(article));
  const background = photoBuffer
    ? await buildHeroBackground(photoBuffer)
    : await buildFallbackBackground();

  const composites: sharp.OverlayOptions[] = [
    { input: buildBottomGradientSvg(), top: 0, left: 0 },
    { input: buildTitleOverlaySvg(headlineLines), top: 0, left: 0 },
  ];

  const logoRaw = await loadLogoOverlay();
  if (logoRaw) {
    const logoLayer = await logoCompositeLayer(logoRaw);
    const logoMeta = await sharp(logoLayer).metadata();
    const logoW = logoMeta.width ?? LOGO_WIDTH;
    composites.push({
      input: logoLayer,
      top: SAFE,
      left: W - SAFE - logoW,
    });
  }

  return sharp(background).composite(composites).jpeg(JPEG_OPTIONS).toBuffer();
}
