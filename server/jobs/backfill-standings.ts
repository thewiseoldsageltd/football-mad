import { upsertGoalserveStandings, type UpsertStandingsResult } from "./upsert-goalserve-standings";

const DEFAULT_SEASONS = ["2024/2025", "2023/2024", "2022/2023"];

const DEFAULT_LEAGUE_IDS = [
  "1204", // Premier League
  "1205", // Championship
  "1206", // League One
  "1197", // League Two
  "1203", // National League
  "1399", // La Liga
  "1269", // Serie A
  "1229", // Bundesliga
  "1221", // Ligue 1
];

export interface BackfillOptions {
  seasons?: string[];
  leagueIds?: string[];
  force?: boolean;
}

export interface BackfillResult {
  total: number;
  okCount: number;
  failCount: number;
  skippedCount: number;
  results: Array<{
    leagueId: string;
    season: string;
    ok: boolean;
    skipped?: boolean;
    error?: string;
    reason?: string;
    insertedRowsCount?: number;
  }>;
}

export async function backfillStandings(options: BackfillOptions = {}): Promise<BackfillResult> {
  const {
    seasons = DEFAULT_SEASONS,
    leagueIds = DEFAULT_LEAGUE_IDS,
    force = true,
  } = options;

  const results: BackfillResult["results"] = [];
  let okCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  const total = leagueIds.length * seasons.length;
  console.log(`[backfill-standings] Starting backfill: ${leagueIds.length} leagues × ${seasons.length} seasons = ${total} jobs`);

  for (const leagueId of leagueIds) {
    for (const season of seasons) {
      console.log(`[backfill-standings] Processing leagueId=${leagueId}, season=${season}`);
      
      try {
        const result = await upsertGoalserveStandings(leagueId, {
          seasonParam: season,
          force,
        });

        if (result.ok) {
          if (result.skipped) {
            skippedCount++;
            console.log(`[backfill-standings] Skipped leagueId=${leagueId}, season=${season} (no change)`);
          } else {
            okCount++;
            console.log(`[backfill-standings] OK leagueId=${leagueId}, season=${season}, rows=${result.insertedRowsCount}`);
          }
        } else {
          failCount++;
          console.warn(`[backfill-standings] FAIL leagueId=${leagueId}, season=${season}: ${result.error || result.reason}`);
        }

        results.push({
          leagueId,
          season,
          ok: result.ok,
          skipped: result.skipped,
          error: result.error,
          reason: result.reason,
          insertedRowsCount: result.insertedRowsCount,
        });
      } catch (err) {
        failCount++;
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[backfill-standings] ERROR leagueId=${leagueId}, season=${season}: ${errorMsg}`);
        results.push({
          leagueId,
          season,
          ok: false,
          error: errorMsg,
        });
      }

      // Small delay to avoid hammering the API
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`[backfill-standings] Complete: ${okCount} ok, ${skippedCount} skipped, ${failCount} failed out of ${total}`);

  return {
    total,
    okCount,
    failCount,
    skippedCount,
    results,
  };
}
