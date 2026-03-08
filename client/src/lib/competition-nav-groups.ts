export type CompetitionNavGroup = "leagues" | "cups" | "europe";

const CUP_COMPETITION_SLUGS = new Set<string>([
  "fa-cup",
  "efl-cup",
  "scottish-cup",
  "scottish-league-cup",
  "copa-del-rey",
  "coppa-italia",
  "dfb-pokal",
  "coupe-de-france",
]);

const EUROPE_COMPETITION_SLUGS = new Set<string>([
  "champions-league",
  "europa-league",
  "conference-league",
  "uefa-champions-league",
  "uefa-europa-league",
  "uefa-conference-league",
]);

export function getCompetitionNavGroup(competitionSlug: string): CompetitionNavGroup {
  if (EUROPE_COMPETITION_SLUGS.has(competitionSlug)) {
    return "europe";
  }
  if (CUP_COMPETITION_SLUGS.has(competitionSlug)) {
    return "cups";
  }
  return "leagues";
}
