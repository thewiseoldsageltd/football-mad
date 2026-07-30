import { and, desc, eq } from "drizzle-orm";
import { db, pool } from "../db";
import {
  competitionSeasons,
  competitions,
  matches,
  standingsSnapshots,
} from "@shared/schema";
import {
  buildCompetitionSeasonList,
  normalizeSeasonKey,
  resolveCurrentSeasonKey,
  seasonKeyToUiLabel,
  seasonKeyToUrlSlug,
} from "@shared/season";

export type SeasonListEntry = {
  key: string;
  label: string;
  slug: string;
};

export type CompetitionSeasonsResponse = {
  leagueId: string;
  competitionId: string | null;
  competitionName: string | null;
  currentSeason: SeasonListEntry;
  seasons: SeasonListEntry[];
};

function toEntry(key: string): SeasonListEntry {
  return {
    key,
    label: seasonKeyToUiLabel(key),
    slug: seasonKeyToUrlSlug(key),
  };
}

/**
 * List available Tables seasons for a Goalserve league id and resolve current season.
 * Does not call Goalserve — uses stored competition / standings / match season data.
 *
 * Current season preference (trusted markers only; no live Goalserve call here):
 * 1. competition_seasons.is_current
 * 2. competitions.season (trusted marker written by bare feeds)
 * 3. August–July calendar fallback
 *
 * Standings/match season keys populate the available list only.
 */
export async function getCompetitionSeasonsForLeague(
  leagueId: string,
): Promise<CompetitionSeasonsResponse> {
  const [competition] = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      season: competitions.season,
    })
    .from(competitions)
    .where(eq(competitions.goalserveCompetitionId, leagueId))
    .limit(1);

  const snapshotSeasons = await db
    .selectDistinct({ season: standingsSnapshots.season })
    .from(standingsSnapshots)
    .where(eq(standingsSnapshots.leagueId, leagueId));

  let matchSeasonValues: Array<string | null> = [];
  let markedCurrent: string | null = null;
  let competitionSeasonValues: string[] = [];

  if (competition?.id) {
    const matchSeasons = await db
      .selectDistinct({ seasonKey: matches.seasonKey })
      .from(matches)
      .where(eq(matches.goalserveCompetitionId, leagueId));
    matchSeasonValues = matchSeasons.map((r) => r.seasonKey);

    const competitionSeasonRows = await db
      .select({ seasonKey: competitionSeasons.seasonKey })
      .from(competitionSeasons)
      .where(eq(competitionSeasons.competitionId, competition.id));
    competitionSeasonValues = competitionSeasonRows.map((r) => r.seasonKey);

    const [marked] = await db
      .select({ seasonKey: competitionSeasons.seasonKey })
      .from(competitionSeasons)
      .where(
        and(
          eq(competitionSeasons.competitionId, competition.id),
          eq(competitionSeasons.isCurrent, true),
        ),
      )
      .orderBy(desc(competitionSeasons.updatedAt))
      .limit(1);
    markedCurrent = marked?.seasonKey ?? null;
  }

  const standingsSeasonValues = snapshotSeasons.map((r) => r.season);

  // No live provider feed on this path — use marked current, then stored competitions.season.
  const finalCurrent = resolveCurrentSeasonKey({
    markedCurrentSeason: markedCurrent,
    storedCompetitionSeason: competition?.season ?? null,
    now: new Date(),
  });

  const seasons = buildCompetitionSeasonList({
    standingsSeasons: standingsSeasonValues,
    matchSeasons: matchSeasonValues,
    competitionSeasons: competitionSeasonValues,
    currentSeason: finalCurrent,
  }).map(toEntry);

  return {
    leagueId,
    competitionId: competition?.id ?? null,
    competitionName: competition?.name ?? null,
    currentSeason: toEntry(finalCurrent),
    seasons,
  };
}

/** Find a standings snapshot season string that matches the requested canonical key. */
export async function findStandingsSeasonVariant(
  leagueId: string,
  requestedCanonical: string,
): Promise<string | null> {
  const wanted = normalizeSeasonKey(requestedCanonical);
  if (!wanted) return null;

  const rows = await db
    .selectDistinct({ season: standingsSnapshots.season })
    .from(standingsSnapshots)
    .where(eq(standingsSnapshots.leagueId, leagueId));

  for (const row of rows) {
    if (normalizeSeasonKey(row.season) === wanted) return row.season;
  }
  return wanted;
}

type PgClient = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

/**
 * Mark competition_seasons.is_current exclusively for seasonKey inside an existing
 * pg client transaction. Callers must BEGIN/COMMIT around this.
 */
export async function markExclusiveCompetitionSeasonCurrentOnClient(
  client: PgClient,
  competitionId: string,
  seasonKey: string,
): Promise<void> {
  const canonical = normalizeSeasonKey(seasonKey) || seasonKey;
  await client.query(
    `
    INSERT INTO competition_seasons (competition_id, season_key, is_current, updated_at)
    VALUES ($1, $2, true, NOW())
    ON CONFLICT (competition_id, season_key)
    DO UPDATE SET is_current = true, updated_at = NOW()
    `,
    [competitionId, canonical],
  );
  await client.query(
    `
    UPDATE competition_seasons
    SET is_current = false, updated_at = NOW()
    WHERE competition_id = $1
      AND season_key <> $2
      AND is_current = true
    `,
    [competitionId, canonical],
  );
}

/**
 * Atomically mark competition_seasons.is_current exclusively for seasonKey.
 * Opens its own transaction when no client is supplied.
 */
export async function markExclusiveCompetitionSeasonCurrent(
  competitionId: string,
  seasonKey: string,
  client?: PgClient,
): Promise<void> {
  if (client) {
    await markExclusiveCompetitionSeasonCurrentOnClient(client, competitionId, seasonKey);
    return;
  }

  const owned = await pool.connect();
  try {
    await owned.query("BEGIN");
    await markExclusiveCompetitionSeasonCurrentOnClient(owned, competitionId, seasonKey);
    await owned.query("COMMIT");
  } catch (err) {
    await owned.query("ROLLBACK");
    throw err;
  } finally {
    owned.release();
  }
}

/**
 * Atomically set competitions.season and exclusive competition_seasons.is_current
 * for a trusted bare/current-feed season.
 */
export async function setTrustedCurrentCompetitionSeason(
  competitionId: string,
  seasonKey: string,
  previousSeason?: string | null,
): Promise<void> {
  const canonical = normalizeSeasonKey(seasonKey) || seasonKey;
  const previousCanonical = previousSeason
    ? normalizeSeasonKey(previousSeason) || previousSeason
    : null;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (previousCanonical !== canonical) {
      await client.query(`UPDATE competitions SET season = $1 WHERE id = $2`, [
        canonical,
        competitionId,
      ]);
    }
    await markExclusiveCompetitionSeasonCurrentOnClient(client, competitionId, canonical);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Ensure a competition_seasons row exists without changing which season is current.
 * Used by historical/manual season syncs for available-season evidence.
 */
export async function ensureCompetitionSeasonEvidence(
  competitionId: string,
  seasonKey: string,
): Promise<void> {
  const canonical = normalizeSeasonKey(seasonKey) || seasonKey;
  await db
    .insert(competitionSeasons)
    .values({
      competitionId,
      seasonKey: canonical,
      isCurrent: false,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [competitionSeasons.competitionId, competitionSeasons.seasonKey],
      set: { updatedAt: new Date() },
    });
}
