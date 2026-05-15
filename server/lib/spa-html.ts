import type { Request } from "express";
import { injectSocialMetadata, resolvePageMetadata } from "./social-metadata";

/**
 * Prepare SPA index HTML with server-injected SEO / Open Graph / Twitter tags for crawlers.
 */
export async function prepareSpaIndexHtml(req: Request, html: string): Promise<string> {
  const hostHeader = req.headers.host || "";
  const host = req.hostname || hostHeader.split(":")[0] || "";
  const path = req.path || "/";
  const meta = await resolvePageMetadata(path, host);
  return injectSocialMetadata(html, meta);
}
