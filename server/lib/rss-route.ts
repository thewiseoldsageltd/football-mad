import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import {
  buildNewsRssFeedXml,
  RSS_CACHE_MAX_AGE_SEC,
  RSS_NEWS_FEED_PATH,
} from "./rss";

export function isRssFeedRequest(req: Pick<Request, "path">): boolean {
  const normalized = req.path.replace(/\/+$/, "") || "/";
  return normalized === RSS_NEWS_FEED_PATH;
}

export async function handleRssFeed(_req: Request, res: Response): Promise<void> {
  try {
    const articles = await storage.getLatestNewsArticlesForRss();
    const xml = buildNewsRssFeedXml(articles);
    res.status(200);
    res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
    res.setHeader("Cache-Control", `public, max-age=${RSS_CACHE_MAX_AGE_SEC}`);
    res.send(xml);
  } catch (err) {
    console.error("[rss]", err);
    res.status(500).type("text/plain").send("Internal Server Error");
  }
}

/** Register before SPA/static catch-all. */
export function registerRssRoute(app: Express): void {
  app.get(RSS_NEWS_FEED_PATH, (req, res) => {
    void handleRssFeed(req, res);
  });
}
