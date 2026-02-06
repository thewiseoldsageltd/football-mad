export function isStagingHost(host?: string): boolean {
  if (!host) return false;
  const h = host.toLowerCase();
  return h.includes("onrender.com") || h.startsWith("staging.");
}
