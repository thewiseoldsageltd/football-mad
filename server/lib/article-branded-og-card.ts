import fs from "fs";
import path from "path";
import sharp from "sharp";
import type { Article } from "@shared/schema";
import { resolveArticleOgPills } from "./article-og-pills";
import { SOCIAL_IMAGE_HEIGHT, SOCIAL_IMAGE_WIDTH } from "./social-image-url";

const JPEG_OPTIONS = { quality: 88, mozjpeg: true } as const;

const W = SOCIAL_IMAGE_WIDTH;
const H = SOCIAL_IMAGE_HEIGHT;
/** Safe zone — keep logo, headline, and panel inside this inset (X may trim edges). */
const SAFE = 56;

const BRAND_GREEN = "#2ECC71";
const BRAND_GREEN_DIM = "rgba(46, 204, 113, 0.22)";
const TEXT_WHITE = "#FFFFFF";
const BG_FALLBACK = "#0B100E";

const LOGO_WIDTH = 168;
const PANEL_WIDTH = 500;
const PANEL_HEIGHT = 420;
const PANEL_RADIUS = 18;
const PANEL_X = W - SAFE - PANEL_WIDTH;
const PANEL_Y = Math.round((H - PANEL_HEIGHT) / 2);

const HEADLINE_FONT_SIZE = 42;
const HEADLINE_LINE_HEIGHT = 50;
const HEADLINE_MAX_LINES = 3;
const HEADLINE_MAX_CHARS = 34;

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

async function loadLogoPng(): Promise<Buffer> {
  const logoPath = resolvePublicAssetPath("assets", "football-mad-fm-logo.webp");
  if (!logoPath) throw new Error("Football Mad logo asset not found");
  return sharp(logoPath).png().toBuffer();
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

function wrapHeadline(text: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > HEADLINE_MAX_CHARS && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length >= HEADLINE_MAX_LINES) break;
  }

  if (lines.length < HEADLINE_MAX_LINES && current) {
    lines.push(current);
  } else if (lines.length === HEADLINE_MAX_LINES && current) {
    const last = lines[HEADLINE_MAX_LINES - 1];
    if (last && !last.endsWith("…")) {
      lines[HEADLINE_MAX_LINES - 1] =
        last.length > HEADLINE_MAX_CHARS - 1
          ? `${last.slice(0, HEADLINE_MAX_CHARS - 2)}…`
          : `${last}…`;
    }
  }

  return lines.length > 0 ? lines : [text.slice(0, HEADLINE_MAX_CHARS)];
}

function roundedRectMask(width: number, height: number, radius: number): Buffer {
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${radius}" ry="${radius}" fill="white"/>
    </svg>`,
  );
}

function buildGradientOverlaySvg(): Buffer {
  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgFade" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(8, 14, 11, 0.94)"/>
          <stop offset="52%" stop-color="rgba(8, 14, 11, 0.82)"/>
          <stop offset="100%" stop-color="rgba(8, 14, 11, 0.35)"/>
        </linearGradient>
        <linearGradient id="bottomFade" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="rgba(8, 14, 11, 0.88)"/>
          <stop offset="45%" stop-color="rgba(8, 14, 11, 0)"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#bgFade)"/>
      <rect width="${W}" height="${H}" fill="url(#bottomFade)"/>
    </svg>`,
  );
}

function buildTextOverlaySvg(
  headlineLines: string[],
  pills: string[],
  logoBottomY: number,
): Buffer {
  const pillStartX = SAFE;
  const pillY = logoBottomY + 14;
  const pillHeight = 30;
  const pillGap = 10;
  let pillCursorX = pillStartX;

  const pillElements: string[] = [];
  for (const pill of pills) {
    const label = escapeXml(pill);
    const approxWidth = Math.min(220, Math.max(72, pill.length * 9 + 28));
    pillElements.push(
      `<rect x="${pillCursorX}" y="${pillY}" width="${approxWidth}" height="${pillHeight}" rx="15" fill="${BRAND_GREEN_DIM}" stroke="${BRAND_GREEN}" stroke-width="1.5"/>`,
      `<text x="${pillCursorX + 14}" y="${pillY + 20}" fill="${TEXT_WHITE}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="600">${label}</text>`,
    );
    pillCursorX += approxWidth + pillGap;
    if (pillCursorX > PANEL_X - 40) break;
  }

  const headlineBlockHeight = headlineLines.length * HEADLINE_LINE_HEIGHT;
  const headlineStartY = H - SAFE - headlineBlockHeight;
  const headlineElements = headlineLines.map((line, i) => {
    const y = headlineStartY + (i + 1) * HEADLINE_LINE_HEIGHT - 10;
    return `<text x="${SAFE}" y="${y}" fill="${TEXT_WHITE}" font-family="Arial, Helvetica, sans-serif" font-size="${HEADLINE_FONT_SIZE}" font-weight="700">${escapeXml(line)}</text>`;
  });

  const accentBar = `<rect x="${SAFE - 4}" y="${SAFE}" width="4" height="${H - SAFE * 2}" rx="2" fill="${BRAND_GREEN}"/>`;
  const wordmark = `<text x="${SAFE + 14 + LOGO_WIDTH + 10}" y="${SAFE + 30}" fill="${TEXT_WHITE}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700">Football Mad</text>`;

  return Buffer.from(
    `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      ${accentBar}
      ${wordmark}
      ${pillElements.join("\n")}
      ${headlineElements.join("\n")}
    </svg>`,
  );
}

async function buildBlurredBackground(photo: Buffer): Promise<Buffer> {
  return sharp(photo, { failOn: "none" })
    .rotate()
    .resize(W, H, { fit: "cover", position: "attention" })
    .blur(22)
    .modulate({ brightness: 0.5, saturation: 0.85 })
    .toBuffer();
}

async function buildForegroundPanel(photo: Buffer): Promise<Buffer> {
  const mask = roundedRectMask(PANEL_WIDTH, PANEL_HEIGHT, PANEL_RADIUS);
  const panel = await sharp(photo, { failOn: "none" })
    .rotate()
    .resize(PANEL_WIDTH, PANEL_HEIGHT, { fit: "cover", position: "north" })
    .png()
    .toBuffer();

  return sharp(panel)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
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
    .png()
    .toBuffer();
}

/**
 * Branded 1200×630 article social card (JPEG).
 * Layout: blurred hero background, right foreground panel, logo, pills, headline.
 */
export async function renderArticleBrandedOgCard(
  article: Article,
  photoBuffer: Buffer | null,
): Promise<Buffer> {
  const headlineLines = wrapHeadline(articleHeadline(article));
  const pills = await resolveArticleOgPills(article);
  const logo = await loadLogoPng();
  const logoSized = await sharp(logo).resize({ width: LOGO_WIDTH }).png().toBuffer();
  const logoMeta = await sharp(logoSized).metadata();
  const logoH = logoMeta.height ?? 48;

  const background = photoBuffer
    ? await buildBlurredBackground(photoBuffer)
    : await buildFallbackBackground();

  const composites: sharp.OverlayOptions[] = [
    { input: buildGradientOverlaySvg(), top: 0, left: 0 },
  ];

  if (photoBuffer) {
    const panel = await buildForegroundPanel(photoBuffer);
    const shadow = await sharp({
      create: {
        width: PANEL_WIDTH + 8,
        height: PANEL_HEIGHT + 8,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.35 },
      },
    })
      .blur(6)
      .png()
      .toBuffer();

    composites.push(
      { input: shadow, top: PANEL_Y + 4, left: PANEL_X - 2 },
      { input: panel, top: PANEL_Y, left: PANEL_X },
    );
  }

  const logoTop = SAFE;
  const logoLeft = SAFE + 14;
  const logoBottomY = logoTop + logoH;

  composites.push(
    { input: logoSized, top: logoTop, left: logoLeft },
    { input: buildTextOverlaySvg(headlineLines, pills, logoBottomY), top: 0, left: 0 },
  );

  if (!photoBuffer) {
    const largeLogo = await sharp(logo).resize({ width: 280 }).png().toBuffer();
    composites.push({
      input: largeLogo,
      top: Math.round((H - 120) / 2),
      left: PANEL_X + 80,
    });
  }

  return sharp(background)
    .composite(composites)
    .jpeg(JPEG_OPTIONS)
    .toBuffer();
}
