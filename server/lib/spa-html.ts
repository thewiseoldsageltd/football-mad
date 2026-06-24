import type { Request } from "express";
import { injectSocialMetadata, requestPathname, resolveSpaPageContext } from "./social-metadata";
import {
  buildArticleBootstrapPayload,
  buildArticleBootstrapScript,
  buildArticlePrerenderShell,
  injectArticlePrerender,
  stripArticlePrerender,
} from "./article-prerender";

/**
 * Prepare SPA index HTML with server-injected SEO / Open Graph / Twitter tags for crawlers.
 */
export async function prepareSpaIndexHtml(req: Request, html: string): Promise<string> {
  const hostHeader = req.headers.host || "";
  const host = req.hostname || hostHeader.split(":")[0] || "";
  // `req.path` is often "/" inside the `app.use("*")` SPA fallback; use the real URL path.
  const path = requestPathname(req);
  const { meta, prerender } = await resolveSpaPageContext(path, host);

  let page = stripArticlePrerender(html);
  page = injectSocialMetadata(page, meta);

  if (prerender) {
    const input = { article: prerender.article, publicSlug: prerender.publicSlug };
    const shell = buildArticlePrerenderShell(input);
    const bootstrap = buildArticleBootstrapScript(buildArticleBootstrapPayload(input));
    page = injectArticlePrerender(page, shell, bootstrap);
  }

  return page;
}
