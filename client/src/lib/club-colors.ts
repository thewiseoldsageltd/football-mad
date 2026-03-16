export const clubColors: Record<string, string> = {
  arsenal: "#D02E26",
  chelsea: "#034694",
  liverpool: "#C8102E",
  manchester_city: "#6CABDD",
  manchester_united: "#DA291C",
  tottenham: "#132257",
  newcastle: "#241F20",
};

function normalizeSlugKey(slug: string): string {
  return slug.trim().toLowerCase().replace(/-/g, "_");
}

export function getClubPrimaryColor(teamSlug: string, fallback = "#1a1a2e"): string {
  if (!teamSlug) return fallback;
  const normalized = normalizeSlugKey(teamSlug);
  return clubColors[normalized] ?? fallback;
}
