/**
 * Parse and map Goalserve soccerleague squad player statistics.
 * Feed field names include known typos (@appearences, @dispossesed, etc.).
 */

export type PlayerSeasonStatsRow = {
  appearances: number | null;
  starts: number | null;
  substituteAppearances: number | null;
  substitutedOff: number | null;
  unusedBench: number | null;
  minutes: number | null;
  captainAppearances: number | null;
  goals: number | null;
  assists: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  keyPasses: number | null;
  dribbles: number | null;
  successfulDribbles: number | null;
  penaltiesWon: number | null;
  penaltiesScored: number | null;
  penaltiesMissed: number | null;
  woodworkHits: number | null;
  passes: number | null;
  passesAccurate: number | null;
  crosses: number | null;
  accurateCrosses: number | null;
  tackles: number | null;
  interceptions: number | null;
  blocks: number | null;
  clearances: number | null;
  duels: number | null;
  duelsWon: number | null;
  foulsWon: number | null;
  foulsCommitted: number | null;
  dispossessions: number | null;
  penaltiesConceded: number | null;
  saves: number | null;
  goalsConceded: number | null;
  penaltiesSaved: number | null;
  insideBoxSaves: number | null;
  yellowCards: number | null;
  secondYellow: number | null;
  redCards: number | null;
  rating: number | null;
};

/** Public API shape — only defined properties that have real values. */
export type PlayerHubCurrentSeasonStats = {
  season?: string;
  competitionId?: string | null;
  appearances?: number;
  starts?: number;
  substituteAppearances?: number;
  substitutedOff?: number;
  unusedBench?: number;
  minutes?: number;
  captainAppearances?: number;
  goals?: number;
  assists?: number;
  shots?: number;
  shotsOnTarget?: number;
  keyPasses?: number;
  dribbles?: number;
  successfulDribbles?: number;
  penaltiesWon?: number;
  penaltiesScored?: number;
  penaltiesMissed?: number;
  woodworkHits?: number;
  passes?: number;
  /** Percentage 0–100 when passes + passesAccurate are available. */
  passAccuracy?: number;
  crosses?: number;
  accurateCrosses?: number;
  tackles?: number;
  interceptions?: number;
  blocks?: number;
  clearances?: number;
  duels?: number;
  duelsWon?: number;
  foulsWon?: number;
  foulsCommitted?: number;
  dispossessions?: number;
  penaltiesConceded?: number;
  saves?: number;
  goalsConceded?: number;
  penaltiesSaved?: number;
  insideBoxSaves?: number;
  yellowCards?: number;
  secondYellow?: number;
  redCards?: number;
  rating?: number;
};

function attr(fp: Record<string, unknown>, key: string): unknown {
  if (fp[key] !== undefined) return fp[key];
  const at = `@${key}`;
  if (fp[at] !== undefined) return fp[at];
  return undefined;
}

/** Empty string / missing → null. Numeric strings including "0" are kept. */
export function parseGoalserveInt(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseGoalserveFloat(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Extract current-season stats from a Goalserve squad player node.
 * Maps feed typos to canonical column names.
 */
export function parseGoalserveSquadPlayerStats(
  fp: Record<string, unknown> | null | undefined,
): PlayerSeasonStatsRow {
  const src = fp ?? {};
  return {
    appearances: parseGoalserveInt(attr(src, "appearences") ?? attr(src, "appearances")),
    starts: parseGoalserveInt(attr(src, "lineups")),
    substituteAppearances: parseGoalserveInt(attr(src, "substitute_in")),
    substitutedOff: parseGoalserveInt(attr(src, "substitute_out")),
    unusedBench: parseGoalserveInt(attr(src, "substitutes_on_bench")),
    minutes: parseGoalserveInt(attr(src, "minutes")),
    captainAppearances: parseGoalserveInt(attr(src, "isCaptain")),
    goals: parseGoalserveInt(attr(src, "goals")),
    assists: parseGoalserveInt(attr(src, "assists")),
    shots: parseGoalserveInt(attr(src, "shotsTotal")),
    shotsOnTarget: parseGoalserveInt(attr(src, "shotsOn")),
    keyPasses: parseGoalserveInt(attr(src, "keyPasses")),
    dribbles: parseGoalserveInt(attr(src, "dribbleAttempts")),
    successfulDribbles: parseGoalserveInt(attr(src, "dribbleSucc")),
    penaltiesWon: parseGoalserveInt(attr(src, "penWon")),
    penaltiesScored: parseGoalserveInt(attr(src, "penScored")),
    penaltiesMissed: parseGoalserveInt(attr(src, "penMissed")),
    woodworkHits: parseGoalserveInt(attr(src, "woordworks") ?? attr(src, "woodworks")),
    passes: parseGoalserveInt(attr(src, "passes")),
    passesAccurate: parseGoalserveInt(attr(src, "pAccuracy")),
    crosses: parseGoalserveInt(attr(src, "crossesTotal")),
    accurateCrosses: parseGoalserveInt(attr(src, "crossesAccurate")),
    tackles: parseGoalserveInt(attr(src, "tackles")),
    interceptions: parseGoalserveInt(attr(src, "interceptions")),
    blocks: parseGoalserveInt(attr(src, "blocks")),
    clearances: parseGoalserveInt(attr(src, "clearances")),
    duels: parseGoalserveInt(attr(src, "duelsTotal")),
    duelsWon: parseGoalserveInt(attr(src, "duelsWon")),
    foulsWon: parseGoalserveInt(attr(src, "fouldDrawn") ?? attr(src, "foulsDrawn")),
    foulsCommitted: parseGoalserveInt(attr(src, "foulsCommitted")),
    dispossessions: parseGoalserveInt(attr(src, "dispossesed") ?? attr(src, "dispossessed")),
    penaltiesConceded: parseGoalserveInt(attr(src, "penComm")),
    saves: parseGoalserveInt(attr(src, "saves")),
    goalsConceded: parseGoalserveInt(attr(src, "goalsConceded")),
    penaltiesSaved: parseGoalserveInt(attr(src, "penSaved")),
    insideBoxSaves: parseGoalserveInt(attr(src, "insideBoxSaves")),
    yellowCards: parseGoalserveInt(attr(src, "yellowcards")),
    secondYellow: parseGoalserveInt(attr(src, "yellowred")),
    redCards: parseGoalserveInt(attr(src, "redcards")),
    rating: parseGoalserveFloat(attr(src, "rating")),
  };
}

export function computePassAccuracy(
  passes: number | null | undefined,
  passesAccurate: number | null | undefined,
): number | null {
  if (passes == null || passesAccurate == null || passes <= 0) return null;
  return Math.round((passesAccurate / passes) * 100);
}

function putNum(
  out: PlayerHubCurrentSeasonStats,
  key: keyof PlayerHubCurrentSeasonStats,
  value: number | null | undefined,
): void {
  if (value == null || !Number.isFinite(value)) return;
  (out as Record<string, number | string | null | undefined>)[key] = value;
}

/** Map a DB row to the public API object (omit nulls). */
export function toCurrentSeasonStatsApi(
  row: Partial<PlayerSeasonStatsRow> & {
    season?: string | null;
    competitionId?: string | null;
  },
): PlayerHubCurrentSeasonStats | null {
  const out: PlayerHubCurrentSeasonStats = {};
  if (row.season) out.season = row.season;
  if (row.competitionId) out.competitionId = row.competitionId;

  putNum(out, "appearances", row.appearances);
  putNum(out, "starts", row.starts);
  putNum(out, "substituteAppearances", row.substituteAppearances);
  putNum(out, "substitutedOff", row.substitutedOff);
  putNum(out, "unusedBench", row.unusedBench);
  putNum(out, "minutes", row.minutes);
  putNum(out, "captainAppearances", row.captainAppearances);
  putNum(out, "goals", row.goals);
  putNum(out, "assists", row.assists);
  putNum(out, "shots", row.shots);
  putNum(out, "shotsOnTarget", row.shotsOnTarget);
  putNum(out, "keyPasses", row.keyPasses);
  putNum(out, "dribbles", row.dribbles);
  putNum(out, "successfulDribbles", row.successfulDribbles);
  putNum(out, "penaltiesWon", row.penaltiesWon);
  putNum(out, "penaltiesScored", row.penaltiesScored);
  putNum(out, "penaltiesMissed", row.penaltiesMissed);
  putNum(out, "woodworkHits", row.woodworkHits);
  putNum(out, "passes", row.passes);
  const passAccuracy = computePassAccuracy(row.passes ?? null, row.passesAccurate ?? null);
  putNum(out, "passAccuracy", passAccuracy);
  putNum(out, "crosses", row.crosses);
  putNum(out, "accurateCrosses", row.accurateCrosses);
  putNum(out, "tackles", row.tackles);
  putNum(out, "interceptions", row.interceptions);
  putNum(out, "blocks", row.blocks);
  putNum(out, "clearances", row.clearances);
  putNum(out, "duels", row.duels);
  putNum(out, "duelsWon", row.duelsWon);
  putNum(out, "foulsWon", row.foulsWon);
  putNum(out, "foulsCommitted", row.foulsCommitted);
  putNum(out, "dispossessions", row.dispossessions);
  putNum(out, "penaltiesConceded", row.penaltiesConceded);
  putNum(out, "saves", row.saves);
  putNum(out, "goalsConceded", row.goalsConceded);
  putNum(out, "penaltiesSaved", row.penaltiesSaved);
  putNum(out, "insideBoxSaves", row.insideBoxSaves);
  putNum(out, "yellowCards", row.yellowCards);
  putNum(out, "secondYellow", row.secondYellow);
  putNum(out, "redCards", row.redCards);
  if (row.rating != null && Number.isFinite(row.rating)) {
    out.rating = Math.round(row.rating * 100) / 100;
  }

  const keys = Object.keys(out).filter((k) => k !== "season" && k !== "competitionId");
  if (keys.length === 0) return null;
  return out;
}

export type SelectableSeasonStatsRow = PlayerSeasonStatsRow & {
  teamId: string | null;
  competitionId: string | null;
  goalserveCompetitionId: string;
  season: string;
  updatedAt: Date | null;
  isPriority?: boolean | null;
};

/**
 * Prefer current-club + priority league + highest appearances among current-season rows.
 */
export function selectBestCurrentSeasonStatsRow(
  rows: SelectableSeasonStatsRow[],
  opts: { currentTeamId?: string | null; currentSeasonKeys?: Set<string> },
): SelectableSeasonStatsRow | null {
  if (!rows.length) return null;
  let candidates = rows;
  if (opts.currentSeasonKeys && opts.currentSeasonKeys.size > 0) {
    const seasonMatched = candidates.filter((r) => opts.currentSeasonKeys!.has(r.season));
    if (seasonMatched.length) candidates = seasonMatched;
  }
  if (opts.currentTeamId) {
    const teamMatched = candidates.filter((r) => r.teamId === opts.currentTeamId);
    if (teamMatched.length) candidates = teamMatched;
  }
  const priority = candidates.filter((r) => r.isPriority);
  if (priority.length) candidates = priority;

  candidates = [...candidates].sort((a, b) => {
    const appDiff = (b.appearances ?? -1) - (a.appearances ?? -1);
    if (appDiff !== 0) return appDiff;
    const aTs = a.updatedAt?.getTime() ?? 0;
    const bTs = b.updatedAt?.getTime() ?? 0;
    return bTs - aTs;
  });
  return candidates[0] ?? null;
}
