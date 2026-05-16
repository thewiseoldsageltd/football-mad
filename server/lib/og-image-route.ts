import type { Express, Request, Response } from "express";
import fs from "fs";
import path from "path";
import {
  fetchArticleBySlug,
  parseArticleOgImageSlugParam,
  resolveArticleHeroImageSource,
} from "./article-og-image";
import { fetchImageBuffer } from "./og-image-fetch";
import { bufferToSocialOgJpeg } from "./social-og-jpeg";
import {
  isAllowedOgImageSource,
  OG_IMAGE_DEFAULT_PATH,
} from "./social-image-url";

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

function sendSocialJpeg(req: Request, res: Response, jpeg: Buffer): void {
  res.status(200);
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("Content-Length", String(jpeg.length));
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.send(jpeg);
}

async function renderSocialJpegFromSource(sourceUrl: string | null): Promise<Buffer> {
  let input: Buffer;
  if (sourceUrl && isAllowedOgImageSource(sourceUrl)) {
    input = await fetchImageBuffer(sourceUrl);
  } else {
    input = await fs.promises.readFile(defaultSourceAssetPath());
  }
  return bufferToSocialOgJpeg(input);
}

/** Legacy `/og-image?src=` proxy (kept for compatibility; not used in metadata). */
export async function handleOgImageQueryProxy(req: Request, res: Response): Promise<void> {
  try {
    const rawSrc = typeof req.query.src === "string" ? req.query.src.trim() : "";
    const sourceUrl = rawSrc && isAllowedOgImageSource(rawSrc) ? rawSrc : null;
    const jpeg = await renderSocialJpegFromSource(sourceUrl);
    sendSocialJpeg(req, res, jpeg);
  } catch (err) {
    console.error("[og-image]", err);
    res.status(502).type("text/plain").send("Bad Gateway");
  }
}

export async function handleOgImageDefault(req: Request, res: Response): Promise<void> {
  try {
    const input = await fs.promises.readFile(defaultSourceAssetPath());
    const jpeg = await bufferToSocialOgJpeg(input);
    sendSocialJpeg(req, res, jpeg);
  } catch (err) {
    console.error("[og-image/default]", err);
    res.status(502).type("text/plain").send("Bad Gateway");
  }
}

export async function handleOgImageArticle(
  req: Request,
  res: Response,
  rawSlugParam: string,
): Promise<void> {
  try {
    const requestSlug = parseArticleOgImageSlugParam(rawSlugParam);
    if (!requestSlug) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }

    const article = await fetchArticleBySlug(requestSlug);
    if (!article) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }

    const sourceUrl = resolveArticleHeroImageSource(article);
    const jpeg = await renderSocialJpegFromSource(sourceUrl);
    sendSocialJpeg(req, res, jpeg);
  } catch (err) {
    console.error("[og-image/article]", err);
    res.status(502).type("text/plain").send("Bad Gateway");
  }
}

/** Dispatch any `/og-image` path (used by SPA catch-all guards). */
export async function handleOgImageRequest(req: Request, res: Response): Promise<void> {
  const normalized = req.path.replace(/\/+$/, "") || "/";

  if (normalized === OG_IMAGE_DEFAULT_PATH) {
    await handleOgImageDefault(req, res);
    return;
  }

  const articlePrefix = "/og-image/article/";
  if (normalized.startsWith(articlePrefix)) {
    const slugParam = normalized.slice(articlePrefix.length);
    if (!slugParam) {
      res.status(404).type("text/plain").send("Not Found");
      return;
    }
    await handleOgImageArticle(req, res, slugParam);
    return;
  }

  if (normalized === "/og-image") {
    await handleOgImageQueryProxy(req, res);
    return;
  }

  res.status(404).type("text/plain").send("Not Found");
}

export function isOgImageRequest(req: Pick<Request, "path">): boolean {
  const normalized = req.path.replace(/\/+$/, "") || "/";
  return normalized === "/og-image" || normalized.startsWith("/og-image/");
}

function bindHandler(
  app: Express,
  method: "get" | "head",
  routePath: string,
  handler: (req: Request, res: Response) => void | Promise<void>,
): void {
  app[method](routePath, (req, res) => {
    void handler(req, res);
  });
}

/** Express treats `.jpg` as a format suffix on `:slug` routes; use a regex instead. */
const ARTICLE_OG_IMAGE_PATH_RE = /^\/og-image\/article\/([^/]+)\.jpg\/?$/i;

function bindArticleOgImage(app: Express, method: "get" | "head"): void {
  app[method](ARTICLE_OG_IMAGE_PATH_RE, (req, res) => {
    const slugParam = String(req.params[0] ?? "");
    void handleOgImageArticle(req, res, slugParam);
  });
}

/** Register before SPA/static catch-all (see server/index.ts, static.ts, vite.ts). */
export function registerOgImageRoute(app: Express): void {
  bindHandler(app, "get", "/og-image", handleOgImageQueryProxy);
  bindHandler(app, "head", "/og-image", handleOgImageQueryProxy);

  bindHandler(app, "get", OG_IMAGE_DEFAULT_PATH, handleOgImageDefault);
  bindHandler(app, "head", OG_IMAGE_DEFAULT_PATH, handleOgImageDefault);

  bindArticleOgImage(app, "get");
  bindArticleOgImage(app, "head");
}
