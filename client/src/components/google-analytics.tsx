import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { initGa4, isGa4Enabled, trackGa4PageView } from "@/lib/ga4";

/**
 * One-time GA4 bootstrap + page_view on route changes (production allowlist only).
 */
export function GoogleAnalytics() {
  const [location] = useLocation();
  const didInit = useRef(false);

  useEffect(() => {
    if (!isGa4Enabled()) return;
    if (didInit.current) return;
    didInit.current = true;
    initGa4();
  }, []);

  useEffect(() => {
    if (!isGa4Enabled()) return;
    trackGa4PageView();
  }, [location]);

  return null;
}
