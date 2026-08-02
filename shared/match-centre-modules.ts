/**
 * Deterministic Match Centre module ordering by presentation state and data availability.
 * Data availability outranks kickoff proximity for line-up promotion.
 */

export type MatchCentreModuleId =
  | "howTheyCompare"
  | "recentForm"
  | "predictedXi"
  | "startingXi"
  | "finalXi"
  | "upcomingFixtures"
  | "timeline"
  | "statistics"
  | "h2hDetail"
  | "relatedArticles";

export type LineupAvailability = "none" | "predicted" | "confirmed";

export function resolveLineupAvailability(input: {
  hasPredictedLineup: boolean;
  hasConfirmedLineup: boolean;
}): LineupAvailability {
  if (input.hasConfirmedLineup) return "confirmed";
  if (input.hasPredictedLineup) return "predicted";
  return "none";
}

/**
 * PRE_EVENT module order.
 * Confirmed XI rises beneath the hero whenever provider data exists.
 * Predicted XI sits above Upcoming Fixtures when present.
 * Kickoff/now are accepted for future proximity rules but do not invent empty modules.
 */
export function resolvePreEventModuleOrder(input: {
  hasPredictedLineup: boolean;
  hasConfirmedLineup: boolean;
  kickoff?: string | Date | null;
  now?: Date | number | null;
}): MatchCentreModuleId[] {
  void input.kickoff;
  void input.now;

  const lineup = resolveLineupAvailability(input);

  if (lineup === "confirmed") {
    return [
      "startingXi",
      "howTheyCompare",
      "recentForm",
      "upcomingFixtures",
      "relatedArticles",
    ];
  }

  if (lineup === "predicted") {
    return [
      "howTheyCompare",
      "recentForm",
      "predictedXi",
      "upcomingFixtures",
      "relatedArticles",
    ];
  }

  return ["howTheyCompare", "recentForm", "upcomingFixtures", "relatedArticles"];
}

/** LIVE: action first; comparison and articles support. */
export function resolveLiveModuleOrder(input: {
  hasConfirmedLineup: boolean;
}): MatchCentreModuleId[] {
  const modules: MatchCentreModuleId[] = ["timeline"];
  if (input.hasConfirmedLineup) modules.push("startingXi");
  modules.push("statistics", "howTheyCompare", "relatedArticles");
  return modules;
}

/** COMPLETED: permanent story — chronological timeline, then post-match context. */
export function resolveCompletedModuleOrder(input: {
  hasConfirmedLineup: boolean;
}): MatchCentreModuleId[] {
  const modules: MatchCentreModuleId[] = ["timeline", "statistics"];
  if (input.hasConfirmedLineup) modules.push("finalXi");
  modules.push("howTheyCompare", "h2hDetail", "upcomingFixtures", "relatedArticles");
  return modules;
}
