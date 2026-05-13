/**
 * GA4 loads only on real production hostnames with a configured measurement ID.
 * See `isGa4Enabled()` — no scripts, dataLayer, or page_view when disabled.
 */

const ALLOWED_HOSTNAMES = new Set(["footballmad.co.uk", "www.footballmad.co.uk"]);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let initCalled = false;

function getMeasurementId(): string | null {
  const raw = import.meta.env.VITE_GA_MEASUREMENT_ID;
  const id = typeof raw === "string" ? raw.trim() : "";
  return id.length > 0 ? id : null;
}

/** True only when GA4 may run: production build, allowlisted host, valid ID. */
export function isGa4Enabled(): boolean {
  if (typeof window === "undefined") return false;
  if (!import.meta.env.PROD) return false;
  if (!getMeasurementId()) return false;
  return ALLOWED_HOSTNAMES.has(window.location.hostname);
}

/** Injects gtag.js and defines dataLayer + gtag stub (allowlisted production only). */
export function initGa4(): void {
  if (!isGa4Enabled() || initCalled) return;
  initCalled = true;

  const id = getMeasurementId();
  if (!id) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };

  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(script);
}

/** SPA page_view (production + allowlisted host only). */
export function trackGa4PageView(): void {
  if (!isGa4Enabled()) return;
  const id = getMeasurementId();
  if (!id || typeof window.gtag !== "function") return;

  const pagePath = `${window.location.pathname}${window.location.search}`;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: document.title,
  });
}
