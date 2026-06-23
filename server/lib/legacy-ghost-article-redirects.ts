import type { Express, NextFunction, Request, Response } from "express";
import { fetchArticleBySlug } from "./article-og-image";
import { harmlessRedirectQuerySuffix } from "./harmless-redirect-query";
import { isReservedRootSegment } from "./reserved-root-segments";
import { canonicalArticlePath } from "./social-metadata";

async function handleLegacyGhostArticle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawSlug = req.params.slug;
  if (!rawSlug || typeof rawSlug !== "string") {
    next();
    return;
  }

  if (isReservedRootSegment(rawSlug)) {
    next();
    return;
  }

  // Let express.static / other handlers serve files like favicon.ico, sitemap.xml.
  if (rawSlug.includes(".")) {
    next();
    return;
  }

  const article = await fetchArticleBySlug(rawSlug);
  if (!article?.slug?.trim()) {
    next();
    return;
  }

  const qs = harmlessRedirectQuerySuffix(req.originalUrl || "");
  res.redirect(301, `${canonicalArticlePath(article.slug.trim())}${qs}`);
}

/**
 * GET /:slug and /:slug/ — legacy Ghost root article URLs → /news/:slug (301).
 * Must be registered after API routes and before SPA/static fallback; non-matches call next().
 */
export function registerLegacyGhostArticleRedirects(app: Express): void {
  const handler = (req: Request, res: Response, next: NextFunction) => {
    void handleLegacyGhostArticle(req, res, next).catch((e) => {
      console.error("[legacy-ghost-article-redirect]", e);
      next(e);
    });
  };

  app.get("/:slug", handler);
  app.get("/:slug/", handler);
}
