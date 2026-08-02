/** Shared public competition display names (no internal Goalserve labels). */

const DISPLAY_ALIAS_BY_ID = new Map<string, string>([
  ["1056", "FIFA World Cup"],
  ["1204", "Premier League"],
  ["1205", "Championship"],
  ["1206", "League One"],
  ["1197", "League Two"],
  ["1203", "National League"],
  ["1198", "FA Cup"],
  ["1199", "EFL Cup"],
  ["1370", "Premiership"],
  ["1373", "Championship"],
  ["1376", "League Two"],
  ["1375", "League Three"],
  ["1371", "FA Cup"],
  ["1372", "League Cup"],
  ["1399", "La Liga"],
  ["202", "Copa del Rey"],
  ["1269", "Serie A"],
  ["1264", "Coppa Italia"],
  ["1229", "Bundesliga"],
  ["221", "DFB-Pokal"],
  ["1221", "Ligue 1"],
  ["231", "Coupe de France"],
  ["1005", "UEFA Champions League"],
  ["1007", "UEFA Europa League"],
  ["18853", "UEFA Europa Conference League"],
  ["1534", "Club Friendlies"],
]);

/** Geographic / confederation region for hero labels. Empty string = European/neutral (special-cased). */
const REGION_BY_ID = new Map<string, string>([
  ["1204", "England"],
  ["1205", "England"],
  ["1206", "England"],
  ["1197", "England"],
  ["1203", "England"],
  ["1198", "England"],
  ["1199", "England"],
  ["1370", "Scotland"],
  ["1373", "Scotland"],
  ["1376", "Scotland"],
  ["1375", "Scotland"],
  ["1371", "Scotland"],
  ["1372", "Scotland"],
  ["1399", "Spain"],
  ["202", "Spain"],
  ["1269", "Italy"],
  ["1264", "Italy"],
  ["1229", "Germany"],
  ["221", "Germany"],
  ["1221", "France"],
  ["231", "France"],
  // European club competitions — region "Europe" with shortened competition name
  ["1005", "Europe"],
  ["1007", "Europe"],
  ["18853", "Europe"],
]);

export const CLUB_FRIENDLIES_GOALSERVE_ID = "1534";

function extractGoalserveIdFromName(name: string | null | undefined): string | null {
  const match = String(name ?? "").match(/\[(\d+)\]/);
  return match?.[1] ?? null;
}

export function getPublicCompetitionDisplayName(
  name: string | null | undefined,
  goalserveCompetitionId?: string | null,
): string {
  const id =
    String(goalserveCompetitionId ?? "").trim() || extractGoalserveIdFromName(name) || "";
  if (id && DISPLAY_ALIAS_BY_ID.has(id)) {
    return DISPLAY_ALIAS_BY_ID.get(id)!;
  }
  const raw = String(name ?? "").trim();
  if (!raw) return "Competition";
  // Strip trailing " (Country) [id]" Goalserve decorations.
  return raw.replace(/\s*\([^)]*\)\s*\[[^\]]+\]\s*$/, "").trim() || raw;
}

/** Country/region for a Goalserve competition id, or null when unknown. */
export function getCompetitionRegionById(goalserveCompetitionId?: string | null): string | null {
  const id = String(goalserveCompetitionId ?? "").trim();
  if (!id || !REGION_BY_ID.has(id)) return null;
  const region = REGION_BY_ID.get(id)!.trim();
  return region || null;
}

/**
 * Hero / card competition label: `Scotland · Premiership`.
 * Uses region when known; avoids awkward `Europe · UEFA Champions League`
 * by shortening UEFA-prefixed names when paired with Europe.
 */
export function formatCompetitionHeroLabel(
  name: string | null | undefined,
  goalserveCompetitionId?: string | null,
): string {
  const id =
    String(goalserveCompetitionId ?? "").trim() || extractGoalserveIdFromName(name) || "";
  const competitionName = getPublicCompetitionDisplayName(name, id || goalserveCompetitionId);
  const region = getCompetitionRegionById(id || goalserveCompetitionId);
  if (!region) return competitionName;

  let shortName = competitionName;
  if (region === "Europe" && /^UEFA\s+/i.test(shortName)) {
    shortName = shortName.replace(/^UEFA\s+/i, "").trim();
  }

  // Avoid duplicating region if the name already starts with it
  if (new RegExp(`^${region}\\b`, "i").test(shortName)) return shortName;

  return `${region} · ${shortName}`;
}

export function isClubFriendlyCompetition(input: {
  goalserveCompetitionId?: string | null;
  competitionName?: string | null;
}): boolean {
  const id = String(input.goalserveCompetitionId ?? "").trim();
  if (id === CLUB_FRIENDLIES_GOALSERVE_ID) return true;
  const name = String(input.competitionName ?? "").toLowerCase();
  return /\bfriendly\b|\bfriendlies\b/.test(name);
}
