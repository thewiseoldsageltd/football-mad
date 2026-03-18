import { and, eq, gt, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../db";
import { competitionTeamMemberships, competitions, playerTeamMemberships, players, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";

const GOALSERVE_MIN_REQUEST_INTERVAL_MS = 1000;
let lastGoalserveRequestAtMs = 0;

type NationalityScope = "league" | "mvp" | "team";

interface ResolveScopeParams {
  scope?: NationalityScope;
  leagueId?: string;
  teamId?: string;
  teamSlug?: string;
}

interface ResolveScopeResult {
  scopeLabel: "mvp" | "team" | "league";
  leagueId: string;
  teamIds: Set<string>;
}

export interface EnrichGoalservePlayerNationalityParams {
  scope?: NationalityScope;
  leagueId?: string;
  teamId?: string;
  teamSlug?: string;
  maxPlayers?: number;
  dryRun?: boolean;
  force?: boolean;
}

export interface EnrichGoalservePlayerNationalityResult {
  ok: boolean;
  scope: "mvp" | "team" | "league";
  leagueId: string;
  dryRun: boolean;
  force: boolean;
  scanned: number;
  withGoalserveId: number;
  attempted: number;
  updated: number;
  unchanged: number;
  skippedMissingGoalserveId: number;
  skippedUnsupportedGoalserveId: number;
  skippedMissingNationality: number;
  failed: number;
  sampleUpdated: Array<{ id: string; goalservePlayerId: string; nationality: string }>;
  errors: string[];
}

function normalizeNationality(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

function extractPlayerNationality(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const candidateNodes = [
    root?.players,
    root?.player,
  ];

  const playerNodes: unknown[] = [];
  for (const node of candidateNodes) {
    if (!node || typeof node !== "object") continue;
    const record = node as Record<string, unknown>;
    const player = record.player ?? record.players ?? node;
    if (Array.isArray(player)) {
      playerNodes.push(...player);
    } else {
      playerNodes.push(player);
    }
  }

  for (const node of playerNodes) {
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    const nationality = normalizeNationality(
      obj.nationality ??
      obj["@nationality"] ??
      obj.country ??
      obj["@country"] ??
      obj.nation ??
      obj["@nation"],
    );
    if (nationality) return nationality;
  }

  return null;
}

async function goalserveRateLimitedPlayerFetch(goalservePlayerId: string): Promise<unknown> {
  const elapsed = Date.now() - lastGoalserveRequestAtMs;
  if (elapsed < GOALSERVE_MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) => setTimeout(resolve, GOALSERVE_MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastGoalserveRequestAtMs = Date.now();
  return goalserveFetch(`soccerstats/player/${goalservePlayerId}`);
}

async function resolveScope(params: ResolveScopeParams): Promise<ResolveScopeResult> {
  if (params.scope === "team" || params.teamId || params.teamSlug) {
    let resolvedTeamId = params.teamId ?? null;
    if (!resolvedTeamId && params.teamSlug) {
      const [team] = await db
        .select({ id: teams.id })
        .from(teams)
        .where(eq(teams.slug, params.teamSlug))
        .limit(1);
      resolvedTeamId = team?.id ?? null;
    }

    return {
      scopeLabel: "team",
      leagueId: params.leagueId ?? "1204",
      teamIds: resolvedTeamId ? new Set([resolvedTeamId]) : new Set<string>(),
    };
  }

  if (params.scope === "mvp" || (!params.scope && !params.leagueId)) {
    const rows = await db
      .select({ teamId: competitionTeamMemberships.teamId })
      .from(competitionTeamMemberships)
      .innerJoin(competitions, eq(competitionTeamMemberships.competitionId, competitions.id))
      .where(
        and(
          eq(competitionTeamMemberships.isCurrent, true),
          eq(competitions.isPriority, true),
          eq(competitions.isCup, false),
        ),
      );

    return {
      scopeLabel: "mvp",
      leagueId: params.leagueId ?? "1204",
      teamIds: new Set(rows.map((row) => row.teamId)),
    };
  }

  const leagueId = params.leagueId ?? "1204";
  const compRows = await db
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.goalserveCompetitionId, leagueId));
  const compIds = compRows.map((row) => row.id);
  if (compIds.length === 0) {
    return {
      scopeLabel: "league",
      leagueId,
      teamIds: new Set<string>(),
    };
  }

  const teamRows = await db
    .select({ teamId: competitionTeamMemberships.teamId })
    .from(competitionTeamMemberships)
    .where(
      and(
        inArray(competitionTeamMemberships.competitionId, compIds),
        eq(competitionTeamMemberships.isCurrent, true),
      ),
    );

  return {
    scopeLabel: "league",
    leagueId,
    teamIds: new Set(teamRows.map((row) => row.teamId)),
  };
}

export async function enrichGoalservePlayerNationality(
  params?: EnrichGoalservePlayerNationalityParams,
): Promise<EnrichGoalservePlayerNationalityResult> {
  const dryRun = params?.dryRun ?? false;
  const force = params?.force ?? false;
  const maxPlayers = Math.max(1, params?.maxPlayers ?? 1000);

  const result: EnrichGoalservePlayerNationalityResult = {
    ok: true,
    scope: "mvp",
    leagueId: params?.leagueId ?? "1204",
    dryRun,
    force,
    scanned: 0,
    withGoalserveId: 0,
    attempted: 0,
    updated: 0,
    unchanged: 0,
    skippedMissingGoalserveId: 0,
    skippedUnsupportedGoalserveId: 0,
    skippedMissingNationality: 0,
    failed: 0,
    sampleUpdated: [],
    errors: [],
  };

  try {
    const { scopeLabel, leagueId, teamIds } = await resolveScope({
      scope: params?.scope,
      leagueId: params?.leagueId,
      teamId: params?.teamId,
      teamSlug: params?.teamSlug,
    });

    result.scope = scopeLabel;
    result.leagueId = leagueId;

    if (teamIds.size === 0) {
      result.ok = false;
      result.errors.push(
        scopeLabel === "team"
          ? "No team found for team-scoped player nationality enrichment"
          : scopeLabel === "mvp"
            ? "No MVP league-scoped teams found from current priority competitions"
            : `No teams found for leagueId=${leagueId}`,
      );
      return result;
    }

    const now = new Date();
    const teamIdList = Array.from(teamIds);
    const membershipRows = await db
      .select({ playerId: playerTeamMemberships.playerId })
      .from(playerTeamMemberships)
      .where(
        and(
          inArray(playerTeamMemberships.teamId, teamIdList),
          or(isNull(playerTeamMemberships.endDate), gt(playerTeamMemberships.endDate, now)),
        ),
      );

    const scopedPlayerIds = new Set<string>(membershipRows.map((row) => row.playerId));

    const playersById = new Map<string, { id: string; goalservePlayerId: string | null; nationality: string | null; teamId: string | null }>();

    const teamPlayers = await db
      .select({
        id: players.id,
        goalservePlayerId: players.goalservePlayerId,
        nationality: players.nationality,
        teamId: players.teamId,
      })
      .from(players)
      .where(
        and(
          isNotNull(players.goalservePlayerId),
          inArray(players.teamId, teamIdList),
        ),
      );
    for (const row of teamPlayers) playersById.set(row.id, row);

    if (scopedPlayerIds.size > 0) {
      const membershipPlayers = await db
        .select({
          id: players.id,
          goalservePlayerId: players.goalservePlayerId,
          nationality: players.nationality,
          teamId: players.teamId,
        })
        .from(players)
        .where(
          and(
            isNotNull(players.goalservePlayerId),
            inArray(players.id, Array.from(scopedPlayerIds)),
          ),
        );
      for (const row of membershipPlayers) playersById.set(row.id, row);
    }

    const playerRows = Array.from(playersById.values());

    result.scanned = playerRows.length;

    const selectedRows = playerRows
      .slice(0, maxPlayers)
      .filter((row) => force || !normalizeNationality(row.nationality));

    for (const row of selectedRows) {
      const goalserveId = (row.goalservePlayerId ?? "").trim();
      if (!goalserveId) {
        result.skippedMissingGoalserveId++;
        continue;
      }

      result.withGoalserveId++;

      if (!/^\d+$/.test(goalserveId)) {
        result.skippedUnsupportedGoalserveId++;
        continue;
      }

      result.attempted++;

      try {
        const payload = await goalserveRateLimitedPlayerFetch(goalserveId);
        const nationality = extractPlayerNationality(payload);
        if (!nationality) {
          result.skippedMissingNationality++;
          continue;
        }

        const currentNationality = normalizeNationality(row.nationality);
        if (currentNationality === nationality) {
          result.unchanged++;
          continue;
        }

        if (!dryRun) {
          await db
            .update(players)
            .set({ nationality })
            .where(eq(players.id, row.id));
        }

        result.updated++;
        if (result.sampleUpdated.length < 20) {
          result.sampleUpdated.push({ id: row.id, goalservePlayerId: goalserveId, nationality });
        }
      } catch (err) {
        result.failed++;
        result.errors.push(`player ${goalserveId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    result.ok = false;
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
}
