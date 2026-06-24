/** Slug sets used by NewsResolver to redirect non-article /news/:slug routes. */

export const TEAM_SLUGS = new Set([
  "arsenal",
  "aston-villa",
  "bournemouth",
  "brentford",
  "brighton",
  "chelsea",
  "crystal-palace",
  "everton",
  "fulham",
  "ipswich-town",
  "leeds",
  "leicester-city",
  "liverpool",
  "manchester-city",
  "manchester-united",
  "man-city",
  "man-utd",
  "newcastle",
  "newcastle-united",
  "nottingham-forest",
  "southampton",
  "tottenham",
  "tottenham-hotspur",
  "west-ham",
  "west-ham-united",
  "wolves",
  "wolverhampton-wanderers",
  "burnley",
  "sunderland",
  "luton-town",
  "sheffield-united",
]);

export const COMPETITION_SLUGS = new Set([
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "national-league",
  "scottish-premiership",
  "scottish-championship",
  "scottish-league-one",
  "scottish-league-two",
  "fa-cup",
  "efl-cup",
  "scottish-cup",
  "scottish-league-cup",
  "copa-del-rey",
  "coppa-italia",
  "dfb-pokal",
  "coupe-de-france",
  "bundesliga",
  "la-liga",
  "serie-a",
  "ligue-1",
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
  "champions-league",
  "europa-league",
  "conference-league",
]);

export function parseMatchSlug(matchSlug: string): { homeSlug: string; awaySlug: string; date: string } | null {
  const vsMatch = matchSlug.match(/^(.+)-vs-(.+)-(\d{4}-\d{2}-\d{2})$/);
  if (vsMatch) {
    return {
      homeSlug: vsMatch[1],
      awaySlug: vsMatch[2],
      date: vsMatch[3],
    };
  }
  return null;
}

export function isTeamSlug(slug: string): boolean {
  return TEAM_SLUGS.has(slug);
}

export function isCompetitionSlug(slug: string): boolean {
  return COMPETITION_SLUGS.has(slug);
}

/** True when NewsResolver would render ArticlePage for this /news/:slug segment. */
export function isNewsSlugRoutedToArticle(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return false;
  if (parseMatchSlug(normalized)) return false;
  if (isCompetitionSlug(normalized)) return false;
  if (isTeamSlug(normalized)) return false;
  return true;
}
