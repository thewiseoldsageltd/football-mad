import type { Express, NextFunction, Request, Response } from "express";
import { isInternalGoalserveMatchSlug } from "@shared/match-slug";
import { harmlessRedirectQuerySuffix } from "./harmless-redirect-query";

function handleLegacyGoalserveMatch(req: Request, res: Response, next: NextFunction): void {
  const slug = req.params.slug;
  if (!slug || !isInternalGoalserveMatchSlug(slug)) {
    next();
    return;
  }

  const qs = harmlessRedirectQuerySuffix(req.originalUrl || "");
  res.redirect(301, `/matches${qs}`);
}

/**
 * GET /matches/gs-static-* and /matches/gs-* → /matches (301).
 * Internal Goalserve slugs only; public `{home}-vs-{away}-{date}` segments pass through.
 */
export function registerLegacyGoalserveMatchRedirects(app: Express): void {
  const handler = (req: Request, res: Response, next: NextFunction) => {
    handleLegacyGoalserveMatch(req, res, next);
  };

  app.get("/matches/:slug", handler);
  app.get("/matches/:slug/", handler);
}
