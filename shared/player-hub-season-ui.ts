import type { PlayerHubCurrentSeasonStats } from "@shared/player-season-stats";

export type SeasonStatCard = {
  key: string;
  label: string;
  value: string;
};

function formatInt(n: number): string {
  return Math.round(n).toLocaleString("en-GB");
}

function formatRating(n: number): string {
  return (Math.round(n * 100) / 100).toFixed(2);
}

function isGoalkeeper(position: string | null | undefined): boolean {
  const p = String(position || "").trim().toUpperCase();
  return p === "G" || p === "GK" || p === "GOALKEEPER";
}

function pushIfPresent(
  cards: SeasonStatCard[],
  stats: PlayerHubCurrentSeasonStats,
  key: keyof PlayerHubCurrentSeasonStats,
  label: string,
  format: (n: number) => string = formatInt,
): void {
  const raw = stats[key];
  if (typeof raw !== "number" || !Number.isFinite(raw)) return;
  cards.push({ key, label, value: format(raw) });
}

/**
 * Ordered compact cards for Player Hub "THIS SEASON".
 * Omits missing fields; never invents zeros.
 */
export function buildThisSeasonStatCards(
  stats: PlayerHubCurrentSeasonStats | null | undefined,
  position?: string | null,
): SeasonStatCard[] {
  if (!stats) return [];
  const cards: SeasonStatCard[] = [];
  const gk = isGoalkeeper(position);

  pushIfPresent(cards, stats, "appearances", "Appearances");
  pushIfPresent(cards, stats, "minutes", "Minutes");
  pushIfPresent(cards, stats, "goals", "Goals");
  pushIfPresent(cards, stats, "assists", "Assists");
  pushIfPresent(cards, stats, "rating", "Rating", formatRating);

  // Cards — combine into one chip when either present
  const yellow = typeof stats.yellowCards === "number" ? stats.yellowCards : null;
  const red = typeof stats.redCards === "number" ? stats.redCards : null;
  if (yellow != null || red != null) {
    const parts: string[] = [];
    if (yellow != null) parts.push(`${formatInt(yellow)} Y`);
    if (red != null) parts.push(`${formatInt(red)} R`);
    cards.push({ key: "cards", label: "Cards", value: parts.join(" · ") });
  }

  if (gk) {
    pushIfPresent(cards, stats, "saves", "Saves");
    pushIfPresent(cards, stats, "goalsConceded", "Goals conceded");
    pushIfPresent(cards, stats, "penaltiesSaved", "Pens saved");
  } else {
    const pos = String(position || "").trim().toUpperCase();
    if (pos === "A" || pos === "F" || pos === "FW" || pos === "ATTACKER") {
      pushIfPresent(cards, stats, "shots", "Shots");
      pushIfPresent(cards, stats, "shotsOnTarget", "Shots on target");
      pushIfPresent(cards, stats, "keyPasses", "Key passes");
      pushIfPresent(cards, stats, "successfulDribbles", "Successful dribbles");
    } else if (pos === "M" || pos === "MF" || pos === "MIDFIELDER") {
      pushIfPresent(cards, stats, "keyPasses", "Key passes");
      pushIfPresent(cards, stats, "passes", "Passes");
      pushIfPresent(cards, stats, "passAccuracy", "Pass accuracy", (n) => `${formatInt(n)}%`);
      pushIfPresent(cards, stats, "tackles", "Tackles");
      pushIfPresent(cards, stats, "interceptions", "Interceptions");
    } else if (pos === "D" || pos === "DF" || pos === "DEFENDER") {
      pushIfPresent(cards, stats, "tackles", "Tackles");
      pushIfPresent(cards, stats, "interceptions", "Interceptions");
      pushIfPresent(cards, stats, "blocks", "Blocks");
      pushIfPresent(cards, stats, "clearances", "Clearances");
    } else {
      pushIfPresent(cards, stats, "shots", "Shots");
      pushIfPresent(cards, stats, "keyPasses", "Key passes");
      pushIfPresent(cards, stats, "passAccuracy", "Pass accuracy", (n) => `${formatInt(n)}%`);
      pushIfPresent(cards, stats, "tackles", "Tackles");
    }
  }

  return cards;
}
