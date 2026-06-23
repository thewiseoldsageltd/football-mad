/** Query params preserved on 301 from legacy Ghost URLs (UTM + click ids). */
export function harmlessRedirectQuerySuffix(originalUrl: string): string {
  const qIndex = originalUrl.indexOf("?");
  if (qIndex < 0) return "";
  const params = new URLSearchParams(originalUrl.slice(qIndex + 1));
  const out = new URLSearchParams();
  for (const [key, value] of Array.from(params.entries())) {
    const kl = key.toLowerCase();
    if (kl.startsWith("utm_") || kl === "gclid" || kl === "fbclid") {
      out.set(key, value);
    }
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}
