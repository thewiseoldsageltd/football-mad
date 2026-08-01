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

export const CLUB_FRIENDLIES_GOALSERVE_ID = "1534";

export function getPublicCompetitionDisplayName(
  name: string | null | undefined,
  goalserveCompetitionId?: string | null,
): string {
  const id = String(goalserveCompetitionId ?? "").trim();
  if (id && DISPLAY_ALIAS_BY_ID.has(id)) {
    return DISPLAY_ALIAS_BY_ID.get(id)!;
  }
  const raw = String(name ?? "").trim();
  if (!raw) return "Competition";
  // Strip trailing " (Country) [id]" Goalserve decorations.
  return raw.replace(/\s*\([^)]*\)\s*\[[^\]]+\]\s*$/, "").trim() || raw;
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
