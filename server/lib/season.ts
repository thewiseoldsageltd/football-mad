/**
 * Normalizes various season formats to "YYYY-YYYY" for Goalserve API.
 * 
 * Examples:
 *   "2024/25"    -> "2024-2025"
 *   "2024/2025"  -> "2024-2025"
 *   "2024-25"    -> "2024-2025"
 *   "2024-2025"  -> "2024-2025"
 *   ""           -> undefined
 *   undefined    -> undefined
 */
export function normalizeSeasonForGoalserve(season: string | undefined | null): string | undefined {
  if (!season || !season.trim()) {
    return undefined;
  }

  const s = season.trim();
  
  // Match patterns: YYYY/YY, YYYY/YYYY, YYYY-YY, YYYY-YYYY
  const match = s.match(/^(\d{4})[\/\-](\d{2,4})$/);
  if (!match) {
    // If it doesn't match expected pattern, return as-is
    return s;
  }

  const [, startYearStr, endPartStr] = match;
  const startYear = parseInt(startYearStr, 10);
  
  let endYear: number;
  if (endPartStr.length === 2) {
    // "24" -> expand based on start year century
    const century = Math.floor(startYear / 100) * 100;
    const twoDigit = parseInt(endPartStr, 10);
    endYear = century + twoDigit;
    // Handle century wrap: 2099/00 -> 2099-2100
    if (endYear < startYear) {
      endYear += 100;
    }
  } else {
    // Already 4 digits
    endYear = parseInt(endPartStr, 10);
  }

  return `${startYear}-${endYear}`;
}

/**
 * Converts a normalized season (YYYY-YYYY) to UI display format (YYYY/YY).
 * 
 * Examples:
 *   "2024-2025" -> "2024/25"
 *   "2024/25"   -> "2024/25" (already in display format)
 */
export function seasonToDisplayFormat(season: string | undefined | null): string {
  if (!season) return "";
  
  const match = season.match(/^(\d{4})[-\/](\d{2,4})$/);
  if (!match) return season;

  const [, startYear, endPart] = match;
  const endYear = endPart.length === 4 ? endPart.slice(-2) : endPart;
  
  return `${startYear}/${endYear}`;
}
