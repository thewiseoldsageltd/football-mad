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

let cachedNewsRssXml: string | null = null;
let cachedNewsRssAtMs = 0;

async function buildCachedNewsRssXml(): Promise<string> {
  const now = Date.now();
  const maxAgeMs = RSS_CACHE_MAX_AGE_SEC * 1000;
  if (cachedNewsRssXml && now - cachedNewsRssAtMs < maxAgeMs) {
    return cachedNewsRssXml;
  }

  const articles = await storage.getLatestNewsArticlesForRss();
  const xml = buildNewsRssFeedXml(articles);
  cachedNewsRssXml = xml;
  cachedNewsRssAtMs = now;
  return xml;
}

export async function handleRssFeed(_req: Request, res: Response): Promise<void> {
  try {
    const xml = await buildCachedNewsRssXml();
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
