/**
 * State-aware comparison copy for Match Centre “How they compare(d)”.
 * Labels must stay honest about timing: form is pre-kickoff; league is the
 * current standings snapshot; completed H2H may include this fixture.
 */

export function howTheyCompareHeading(compared: boolean): string {
  return compared ? "How they compared" : "How they compare";
}

export function compareFormLabel(compared: boolean): string {
  return compared ? "Form before kick-off" : "Form";
}

export function compareLeagueLabel(compared: boolean): string {
  return compared ? "Current league position" : "League position";
}

/** Restrained H2H support line — only when the summary includes the current fixture. */
export function compareH2HSupport(compared: boolean): string | null {
  return compared ? "Including this match" : null;
}

/** Shared Upcoming Fixtures section title (PRE and COMPLETED). */
export function upcomingFixturesHeading(): string {
  return "Upcoming fixtures";
}
