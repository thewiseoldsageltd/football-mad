/**
 * Environment-aware SEO / indexing signals for middleware and static HTML shell.
 *
 * Policy:
 * - Staging & development: block indexing (noindex, robots disallow).
 * - Production: allow indexing unless explicitly overridden.
 *
 * Overrides (highest priority first):
 * - SEO_INDEXING=allow — always allow (production crawl).
 * - SEO_INDEXING=block — always block.
 * - DEPLOYMENT_ENV=staging|production — explicit service role (recommended on Render).
 *
 * Hostname heuristics (when DEPLOYMENT_ENV unset):
 * - Never treat all *.onrender.com as staging — production uses Render too.
 * - Block when hostname looks like staging (subdomain patterns, -staging.onrender.com, etc.).
 * - NODE_ENV !== "production" → block (local dev).
 */

function hostLooksLikeStaging(host: string): boolean {
  const h = host.toLowerCase().trim();
  if (!h) return false;
  if (h.startsWith("staging.")) return true;
  if (h.includes(".staging.")) return true;
  if (h.includes("-staging.onrender.com")) return true;
  if (h.includes("staging--")) return true;
  return false;
}

/** True when responses should send noindex and staging robots rules apply. */
export function shouldBlockSearchIndexing(host?: string): boolean {
  const indexing = process.env.SEO_INDEXING?.toLowerCase().trim();
  if (indexing === "allow") return false;
  if (indexing === "block") return true;

  const deploy = process.env.DEPLOYMENT_ENV?.toLowerCase().trim();
  if (deploy === "production") return false;
  if (deploy === "staging") return true;

  if (process.env.NODE_ENV !== "production") return true;

  const h = typeof host === "string" ? host : "";
  return hostLooksLikeStaging(h);
}
