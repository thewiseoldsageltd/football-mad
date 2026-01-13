/**
 * Central URL helper module for Football Mad
 * All routes should use these helpers instead of hardcoded strings
 */

// Entity slugs for news resolution (teams)
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

// Entity slugs for competitions
export const COMPETITION_SLUGS = new Set([
  "premier-league",
  "championship",
  "league-one",
  "league-two",
  "fa-cup",
  "efl-cup",
  "carabao-cup",
  "community-shield",
  "champions-league",
  "europa-league",
  "conference-league",
]);

// Reserved slugs that cannot be used for articles
export const RESERVED_SLUGS = new Set([
  ...Array.from(TEAM_SLUGS),
  ...Array.from(COMPETITION_SLUGS),
  "search",
  "tag",
  "page",
  "rss",
  "feed",
  "amp",
  "category",
  "author",
  "archive",
  "latest",
  "trending",
  "featured",
]);

// Check if a slug is an entity (team or competition)
export function isEntitySlug(slug: string): boolean {
  return TEAM_SLUGS.has(slug) || COMPETITION_SLUGS.has(slug);
}

export function isTeamSlug(slug: string): boolean {
  return TEAM_SLUGS.has(slug);
}

export function isCompetitionSlug(slug: string): boolean {
  return COMPETITION_SLUGS.has(slug);
}

// NEWS
export function newsIndex(): string {
  return "/news";
}

export function newsEntity(slug: string): string {
  return `/news/${slug}`;
}

export function newsArticle(slug: string): string {
  return `/news/${slug}`;
}

// TEAMS
export function teamsIndex(): string {
  return "/teams";
}

export function teamHub(teamSlug: string): string {
  return `/teams/${teamSlug}`;
}

export function teamSection(teamSlug: string, section: string): string {
  return `/teams/${teamSlug}/${section}`;
}

// Valid team sections
export type TeamSection = "injuries" | "discipline" | "transfers" | "matches" | "fans" | "squad";

export function teamInjuries(teamSlug: string): string {
  return teamSection(teamSlug, "injuries");
}

export function teamDiscipline(teamSlug: string): string {
  return teamSection(teamSlug, "discipline");
}

export function teamTransfers(teamSlug: string): string {
  return teamSection(teamSlug, "transfers");
}

export function teamMatches(teamSlug: string): string {
  return teamSection(teamSlug, "matches");
}

export function teamFans(teamSlug: string): string {
  return teamSection(teamSlug, "fans");
}

export function teamSquad(teamSlug: string): string {
  return teamSection(teamSlug, "squad");
}

// PLAYERS
export function playerProfile(playerSlug: string): string {
  return `/players/${playerSlug}`;
}

// MATCHES
export function matchesIndex(): string {
  return "/matches";
}

export function matchesCompetition(competitionSlug: string): string {
  return `/matches/${competitionSlug}`;
}

export function matchDetail(homeSlug: string, awaySlug: string, dateISO: string): string {
  const date = dateISO.split("T")[0]; // Extract YYYY-MM-DD
  return `/matches/${homeSlug}-vs-${awaySlug}-${date}`;
}

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

// GLOBAL HUBS
export function injuriesGlobal(): string {
  return "/injuries";
}

export function transfersGlobal(): string {
  return "/transfers";
}

export function fplHub(): string {
  return "/fpl";
}

export function communityHub(): string {
  return "/community";
}

export function shopHub(): string {
  return "/shop";
}

export function shopTeam(teamSlug: string): string {
  return `/shop/${teamSlug}`;
}

export function shopCart(): string {
  return "/shop/cart";
}

// ACCOUNT
export function accountPage(): string {
  return "/account";
}

// HOME
export function homePage(): string {
  return "/";
}
