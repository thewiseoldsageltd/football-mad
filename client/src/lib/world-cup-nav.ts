/** World Cup news filter + assets (hub route can reuse WORLD_CUP_NEWS_HREF later). */
export const WORLD_CUP_NEWS_HREF = "/news?comp=fifa-world-cup";
export const FIFA_WORLD_CUP_LOGO_SRC = "/assets/fifa-world-cup-logo.svg";

export const FIFA_WORLD_CUP_COMP_SLUGS = ["fifa-world-cup", "world-cup"] as const;

export function isFifaWorldCupCompSlug(slug: string): boolean {
  return slug === "fifa-world-cup" || slug === "world-cup";
}
