import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import sharp from "sharp";
import {
  isAllowedOgImageSource,
  SOCIAL_IMAGE_HEIGHT,
  SOCIAL_IMAGE_WIDTH,
} from "./social-image-url";

const FETCH_TIMEOUT_MS = 15_000;

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

function defaultSourceAssetPath(): string {
  const dedicated = resolvePublicAssetPath("assets", "social-share-card.jpg");
  if (dedicated) return dedicated;
  const logo = resolvePublicAssetPath("assets", "football-mad-fm-logo.webp");
  if (logo) return logo;
  throw new Error("No default social image asset found");
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "image/*",
        "User-Agent": "FootballMad-OG-Image/1.0",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`fetch failed: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function toSocialJpeg(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(SOCIAL_IMAGE_WIDTH, SOCIAL_IMAGE_HEIGHT, {
      fit: "cover",
      position: "attention",
    })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

export async function handleOgImage(req: Request, res: Response): Promise<void> {
  try {
    const rawSrc = typeof req.query.src === "string" ? req.query.src.trim() : "";
    let input: Buffer;

    if (rawSrc && isAllowedOgImageSource(rawSrc)) {
      input = await fetchImageBuffer(rawSrc);
    } else {
      input = await fs.promises.readFile(defaultSourceAssetPath());
    }

    const jpeg = await toSocialJpeg(input);
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(jpeg);
  } catch (err) {
    console.error("[og-image]", err);
    res.status(502).type("text/plain").send("Bad Gateway");
  }
}

const OG_IMAGE_PATHS = ["/og-image", "/og-image/"] as const;

export function isOgImageRequest(req: Pick<Request, "path">): boolean {
  const normalized = req.path.replace(/\/+$/, "") || "/";
  return normalized === "/og-image";
}

function bindOgImageHandlers(app: Express): void {
  for (const routePath of OG_IMAGE_PATHS) {
    app.get(routePath, (req, res) => {
      void handleOgImage(req, res);
    });
    app.head(routePath, (req, res) => {
      void handleOgImage(req, res);
    });
  }
}

/** Register before SPA/static catch-all (see server/index.ts, static.ts, vite.ts). */
export function registerOgImageRoute(app: Express): void {
  bindOgImageHandlers(app);
}
