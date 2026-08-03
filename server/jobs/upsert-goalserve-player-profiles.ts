import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../db";
import {
  competitionTeamMemberships,
  competitions,
  playerCareerStats,
  playerCareerTotals,
  playerHonours,
  playerProfileTransfers,
  playerSidelined,
  players,
  teams,
} from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import {
  buildSafePlayerIdentityUpdate,
  parseGoalservePlayerProfile,
  type ParsedCareerSeason,
  type ParsedCareerTotals,
} from "@shared/player-profile-feed";

const GOALSERVE_MIN_REQUEST_INTERVAL_MS = 1100;
let lastGoalserveRequestAtMs = 0;

export type UpsertPlayerProfilesParams = {
  /** Explicit player UUIDs */
  playerIds?: string[];
  /** Public slugs */
  slugs?: string[];
  /** Limit after resolving the candidate set */
  maxPlayers?: number;
  /** Skip players synced within this many hours (unless force) */
  maxAgeHours?: number;
  force?: boolean;
  dryRun?: boolean;
  /** Scope helpers when ids/slugs not provided */
  scope?: "mvp" | "league" | "team";
  leagueId?: string;
  teamSlug?: string;
};

export type UpsertPlayerProfilesResult = {
  ok: boolean;
  dryRun: boolean;
  force: boolean;
  scanned: number;
  attempted: number;
  updated: number;
  skippedFresh: number;
  skippedMissingGoalserveId: number;
  failed: number;
  sample: Array<{ slug: string; goalservePlayerId: string }>;
  errors: string[];
};

async function rateLimitedFetch(goalservePlayerId: string): Promise<unknown> {
  const elapsed = Date.now() - lastGoalserveRequestAtMs;
  if (elapsed < GOALSERVE_MIN_REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, GOALSERVE_MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastGoalserveRequestAtMs = Date.now();
  return goalserveFetch(`soccerstats/player/${goalservePlayerId}`);
}

function statsColumns(stats: ParsedCareerSeason | ParsedCareerTotals) {
  return {
    appearances: stats.appearances,
    starts: stats.starts,
    substituteAppearances: stats.substituteAppearances,
    substitutedOff: stats.substitutedOff,
    unusedBench: stats.unusedBench,
    minutes: stats.minutes,
    captainAppearances: stats.captainAppearances,
    goals: stats.goals,
    assists: stats.assists,
    shots: stats.shots,
    shotsOnTarget: stats.shotsOnTarget,
    keyPasses: stats.keyPasses,
    dribbles: stats.dribbles,
    successfulDribbles: stats.successfulDribbles,
    penaltiesWon: stats.penaltiesWon,
    penaltiesScored: stats.penaltiesScored,
    penaltiesMissed: stats.penaltiesMissed,
    woodworkHits: stats.woodworkHits,
    passes: stats.passes,
    passesAccurate: stats.passesAccurate,
    crosses: stats.crosses,
    accurateCrosses: stats.accurateCrosses,
    tackles: stats.tackles,
    interceptions: stats.interceptions,
    blocks: stats.blocks,
    clearances: stats.clearances,
    duels: stats.duels,
    duelsWon: stats.duelsWon,
    foulsWon: stats.foulsWon,
    foulsCommitted: stats.foulsCommitted,
    dispossessions: stats.dispossessions,
    penaltiesConceded: stats.penaltiesConceded,
    saves: stats.saves,
    goalsConceded: stats.goalsConceded,
    penaltiesSaved: stats.penaltiesSaved,
    insideBoxSaves: stats.insideBoxSaves,
    yellowCards: stats.yellowCards,
    secondYellow: stats.secondYellow,
    redCards: stats.redCards,
    rating: stats.rating,
  };
}

async function resolveCandidatePlayerIds(params: UpsertPlayerProfilesParams): Promise<string[]> {
  if (params.playerIds?.length) return Array.from(new Set(params.playerIds));
  if (params.slugs?.length) {
    const rows = await db
      .select({ id: players.id })
      .from(players)
      .where(inArray(players.slug, params.slugs));
    return rows.map((r) => r.id);
  }

  if (params.scope === "team" || params.teamSlug) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.slug, params.teamSlug || ""))
      .limit(1);
    if (!team) return [];
    const rows = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.teamId, team.id), isNotNull(players.goalservePlayerId)));
    return rows.map((r) => r.id);
  }

  const leagueId = params.leagueId || "1204";
  const teamRows = await db
    .select({ teamId: competitionTeamMemberships.teamId })
    .from(competitionTeamMemberships)
    .innerJoin(competitions, eq(competitionTeamMemberships.competitionId, competitions.id))
    .where(
      and(
        eq(competitions.goalserveCompetitionId, leagueId),
        eq(competitionTeamMemberships.isCurrent, true),
      ),
    );
  const teamIds = Array.from(new Set(teamRows.map((r) => r.teamId)));
  if (!teamIds.length) return [];
  const rows = await db
    .select({ id: players.id })
    .from(players)
    .where(and(inArray(players.teamId, teamIds), isNotNull(players.goalservePlayerId)));
  return rows.map((r) => r.id);
}

export async function upsertGoalservePlayerProfiles(
  params: UpsertPlayerProfilesParams = {},
): Promise<UpsertPlayerProfilesResult> {
  const force = params.force ?? false;
  const dryRun = params.dryRun ?? false;
  const maxAgeHours = params.maxAgeHours ?? 168;
  const result: UpsertPlayerProfilesResult = {
    ok: true,
    dryRun,
    force,
    scanned: 0,
    attempted: 0,
    updated: 0,
    skippedFresh: 0,
    skippedMissingGoalserveId: 0,
    failed: 0,
    sample: [],
    errors: [],
  };

  let ids = await resolveCandidatePlayerIds(params);
  result.scanned = ids.length;
  if (params.maxPlayers != null && params.maxPlayers > 0) {
    ids = ids.slice(0, params.maxPlayers);
  }

  if (!ids.length) return result;

  const playerRows = await db
    .select()
    .from(players)
    .where(inArray(players.id, ids));

  const freshCutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  for (const player of playerRows) {
    const gsId = (player.goalservePlayerId || "").trim();
    if (!gsId || !/^\d+$/.test(gsId)) {
      result.skippedMissingGoalserveId++;
      continue;
    }
    if (!force && player.profileSyncedAt && player.profileSyncedAt > freshCutoff) {
      result.skippedFresh++;
      continue;
    }

    result.attempted++;
    try {
      const payload = await rateLimitedFetch(gsId);
      const parsed = parseGoalservePlayerProfile(payload);
      if (!parsed) {
        result.failed++;
        result.errors.push(`${player.slug}: empty profile payload`);
        continue;
      }

      if (dryRun) {
        result.updated++;
        if (result.sample.length < 8) {
          result.sample.push({ slug: player.slug, goalservePlayerId: gsId });
        }
        continue;
      }

      const syncedAt = new Date();
      const identityPatch = buildSafePlayerIdentityUpdate(player, parsed.identity, syncedAt);

      await db.transaction(async (tx) => {
        await tx.update(players).set(identityPatch).where(eq(players.id, player.id));

        await tx.delete(playerCareerStats).where(eq(playerCareerStats.playerId, player.id));
        await tx.delete(playerCareerTotals).where(eq(playerCareerTotals.playerId, player.id));
        await tx.delete(playerProfileTransfers).where(eq(playerProfileTransfers.playerId, player.id));
        await tx.delete(playerSidelined).where(eq(playerSidelined.playerId, player.id));
        await tx.delete(playerHonours).where(eq(playerHonours.playerId, player.id));

        if (parsed.careerSeasons.length) {
          await tx.insert(playerCareerStats).values(
            parsed.careerSeasons.map((row) => ({
              playerId: player.id,
              category: row.category,
              season: row.season,
              clubName: row.clubName,
              goalserveClubId: row.goalserveClubId,
              competitionName: row.competitionName,
              goalserveCompetitionId: row.goalserveCompetitionId,
              ...statsColumns(row),
              source: "goalserve",
              updatedAt: syncedAt,
            })),
          );
        }

        if (parsed.careerTotals) {
          await tx.insert(playerCareerTotals).values({
            playerId: player.id,
            scope: parsed.careerTotals.scope,
            ...statsColumns(parsed.careerTotals),
            source: "goalserve",
            updatedAt: syncedAt,
          });
        }

        if (parsed.transfers.length) {
          await tx.insert(playerProfileTransfers).values(
            parsed.transfers.map((t) => ({
              playerId: player.id,
              transferDate: t.transferDate,
              transferDateRaw: t.transferDateRaw,
              fromClubName: t.fromClubName,
              fromGoalserveClubId: t.fromGoalserveClubId,
              toClubName: t.toClubName,
              toGoalserveClubId: t.toGoalserveClubId,
              fee: t.fee,
              transferType: t.transferType,
              sortIndex: t.sortIndex,
              source: "goalserve",
            })),
          );
        }

        if (parsed.sidelined.length) {
          await tx.insert(playerSidelined).values(
            parsed.sidelined.map((s) => ({
              playerId: player.id,
              kind: s.kind,
              typeLabel: s.typeLabel,
              dateStart: s.dateStart,
              dateEnd: s.dateEnd,
              dateStartRaw: s.dateStartRaw,
              dateEndRaw: s.dateEndRaw,
              gamesMissed: s.gamesMissed,
              sortIndex: s.sortIndex,
              source: "goalserve",
            })),
          );
        }

        if (parsed.honours.length) {
          await tx.insert(playerHonours).values(
            parsed.honours.map((h) => ({
              playerId: player.id,
              competition: h.competition,
              country: h.country,
              status: h.status,
              count: h.count,
              seasonsRaw: h.seasonsRaw,
              sortIndex: h.sortIndex,
              source: "goalserve",
            })),
          );
        }
      });

      result.updated++;
      if (result.sample.length < 8) {
        result.sample.push({ slug: player.slug, goalservePlayerId: gsId });
      }
    } catch (err) {
      result.failed++;
      result.errors.push(
        `${player.slug}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 240),
      );
    }
  }

  if (result.failed > 0 && result.updated === 0) result.ok = false;
  return result;
}
