/**
 * Audit / repair multi-open player_team_memberships with independent Goalserve evidence.
 *
 * Default is dry-run (no writes). Writes require BOTH:
 *   --write
 *   --confirm-safe-repairs
 *
 * Evidence hierarchy (`players.team_id` alone is never enough):
 *   SAFE_BOTH_SIGNALS | SAFE_CURRENT_SQUAD | SAFE_PLAYER_PROFILE → writable
 *   CONFLICT | INSUFFICIENT_EVIDENCE → untouched
 *
 * Usage:
 *   npm run reconcile:player-memberships
 *   npm run reconcile:player-memberships -- --dry-run
 *   npm run reconcile:player-memberships -- --write --confirm-safe-repairs
 *
 * Requires DATABASE_URL and GOALSERVE_FEED_KEY. Closes memberships via end_date only
 * (never deletes). Prefer dry-run immediately before any write; rerun dry-run after
 * write to confirm idempotency (safeWritableCloses ≈ 0).
 *
 * See docs/DEPLOYMENT_RENDER.md → Player membership reconciliation.
 */
import "../server/load-env";
import { db, pool } from "../server/db";
import {
  competitions,
  competitionTeamMemberships,
  playerTeamMemberships,
  players,
  teams,
} from "@shared/schema";
import { and, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import {
  classifyMultiCurrentMembershipRepair,
  extractGoalservePlayerProfileTeamId,
  isAuthoritativeSquadSnapshot,
  type MembershipRepairEvidenceClass,
} from "@shared/player-membership-reconcile";
import { isActivePlayerMembership } from "@shared/player-current-club";
import { goalserveFetch } from "../server/integrations/goalserve/client";

type Args = {
  write: boolean;
  confirmSafeRepairs: boolean;
};

const PROFILE_INTERVAL_MS = 350;

function parseArgs(argv: string[]): Args {
  const envWrite = process.env.WRITE === "1" || process.env.WRITE === "true";
  const envDry = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  let write = envWrite && !envDry;
  let confirmSafeRepairs = false;

  for (const arg of argv) {
    if (arg === "--write") write = true;
    else if (arg === "--dry-run") write = false;
    else if (arg === "--confirm-safe-repairs") confirmSafeRepairs = true;
  }
  if (envDry && !argv.includes("--write")) write = false;
  return { write, confirmSafeRepairs };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type OpenRow = {
  id: string;
  playerId: string;
  teamId: string;
  startDate: Date | null;
  endDate: Date | null;
  lastSeenAt: Date | null;
  playerName: string;
  playerSlug: string;
  playerTeamId: string | null;
  goalservePlayerId: string | null;
  teamName: string | null;
  goalserveTeamId: string | null;
};

async function fetchProfileTeamId(goalservePlayerId: string): Promise<string | null> {
  try {
    const payload = await goalserveFetch(`soccerstats/player/${goalservePlayerId}`);
    return extractGoalservePlayerProfileTeamId(payload);
  } catch (err) {
    console.warn(
      `[reconcile] profile fetch failed gsPlayer=${goalservePlayerId}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

type SquadIndex = {
  /** goalserveTeamId → set of goalservePlayerId */
  playersByTeam: Map<string, Set<string>>;
  /** goalserveTeamId → player count in feed */
  countsByTeam: Map<string, number>;
  leaguesFetched: string[];
  leaguesFailed: string[];
};

async function buildSquadIndex(leagueIds: string[]): Promise<SquadIndex> {
  const playersByTeam = new Map<string, Set<string>>();
  const countsByTeam = new Map<string, number>();
  const leaguesFetched: string[] = [];
  const leaguesFailed: string[] = [];

  for (const leagueId of leagueIds) {
    try {
      const data = await goalserveFetch(`soccerleague/${leagueId}`);
      const leagueNode = data?.league;
      const feedTeams: any[] = Array.isArray(leagueNode?.team)
        ? leagueNode.team
        : leagueNode?.team
          ? [leagueNode.team]
          : [];
      if (feedTeams.length === 0) {
        leaguesFailed.push(leagueId);
        continue;
      }
      for (const feedTeam of feedTeams) {
        const gsTeamId = String(feedTeam?.id || feedTeam?.["@id"] || "").trim();
        if (!gsTeamId) continue;
        const squadNode = feedTeam?.squad;
        const feedPlayers: any[] = Array.isArray(squadNode?.player)
          ? squadNode.player
          : squadNode?.player
            ? [squadNode.player]
            : [];
        const ids = new Set<string>();
        for (const fp of feedPlayers) {
          const gsPlayerId = String(fp?.id || fp?.["@id"] || "").trim();
          if (gsPlayerId) ids.add(gsPlayerId);
        }
        playersByTeam.set(gsTeamId, ids);
        countsByTeam.set(gsTeamId, ids.size);
      }
      leaguesFetched.push(leagueId);
      await sleep(200);
    } catch (err) {
      leaguesFailed.push(leagueId);
      console.warn(
        `[reconcile] league squad fetch failed leagueId=${leagueId}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return { playersByTeam, countsByTeam, leaguesFetched, leaguesFailed };
}

function squadPresenceForTeam(
  index: SquadIndex,
  goalserveTeamId: string | null,
  goalservePlayerId: string | null,
): boolean | null {
  if (!goalserveTeamId || !goalservePlayerId) return null;
  const count = index.countsByTeam.get(goalserveTeamId);
  if (count == null) return null;
  if (!isAuthoritativeSquadSnapshot(count)) return null;
  const set = index.playersByTeam.get(goalserveTeamId);
  if (!set) return null;
  return set.has(goalservePlayerId);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = new Date();

  if (args.write && !args.confirmSafeRepairs) {
    console.error(
      "[reconcile:player-memberships] Refusing write without --confirm-safe-repairs. Dry-run only.",
    );
    process.exitCode = 1;
    return;
  }

  const openRows = (await db
    .select({
      id: playerTeamMemberships.id,
      playerId: playerTeamMemberships.playerId,
      teamId: playerTeamMemberships.teamId,
      startDate: playerTeamMemberships.startDate,
      endDate: playerTeamMemberships.endDate,
      lastSeenAt: playerTeamMemberships.lastSeenAt,
      playerName: players.name,
      playerSlug: players.slug,
      playerTeamId: players.teamId,
      goalservePlayerId: players.goalservePlayerId,
      teamName: teams.name,
      goalserveTeamId: teams.goalserveTeamId,
    })
    .from(playerTeamMemberships)
    .innerJoin(players, eq(playerTeamMemberships.playerId, players.id))
    .leftJoin(teams, eq(playerTeamMemberships.teamId, teams.id))
    .where(or(isNull(playerTeamMemberships.endDate), gt(playerTeamMemberships.endDate, now)))) as OpenRow[];

  const active = openRows.filter((row) => isActivePlayerMembership(row, now));
  const byPlayer = new Map<string, OpenRow[]>();
  for (const row of active) {
    const list = byPlayer.get(row.playerId) ?? [];
    list.push(row);
    byPlayer.set(row.playerId, list);
  }

  const multiPlayers = Array.from(byPlayer.entries()).filter(([, memberships]) => {
    return new Set(memberships.map((m) => m.teamId)).size > 1;
  });

  const teamIds = Array.from(
    new Set(multiPlayers.flatMap(([, ms]) => ms.map((m) => m.teamId))),
  );

  const teamRows = teamIds.length
    ? await db
        .select({
          id: teams.id,
          goalserveTeamId: teams.goalserveTeamId,
        })
        .from(teams)
        .where(inArray(teams.id, teamIds))
    : [];
  const fmTeamByGsTeamId = new Map<string, string>();
  for (const row of teamRows) {
    if (row.goalserveTeamId) fmTeamByGsTeamId.set(String(row.goalserveTeamId), row.id);
  }

  const leagueRows = teamIds.length
    ? await db
        .select({
          teamId: competitionTeamMemberships.teamId,
          leagueId: competitions.goalserveCompetitionId,
        })
        .from(competitionTeamMemberships)
        .innerJoin(competitions, eq(competitionTeamMemberships.competitionId, competitions.id))
        .where(
          and(
            inArray(competitionTeamMemberships.teamId, teamIds),
            eq(competitionTeamMemberships.isCurrent, true),
            eq(competitions.isCup, false),
          ),
        )
    : [];
  const leagueIds = Array.from(
    new Set(
      leagueRows
        .map((r) => (r.leagueId != null ? String(r.leagueId).trim() : ""))
        .filter(Boolean),
    ),
  );

  let squadIndex: SquadIndex = {
    playersByTeam: new Map(),
    countsByTeam: new Map(),
    leaguesFetched: [],
    leaguesFailed: [],
  };

  const profileTeamIdByPlayer = new Map<string, string | null>();

  if (multiPlayers.length > 0) {
    console.log(
      `[reconcile] fetching squad indexes for ${leagueIds.length} leagues covering multi-current teams…`,
    );
    squadIndex = await buildSquadIndex(leagueIds);

    console.log(`[reconcile] fetching player profiles for ${multiPlayers.length} players…`);
    for (const [playerId, memberships] of multiPlayers) {
      const gsPlayerId = memberships[0]?.goalservePlayerId?.trim() || "";
      if (!gsPlayerId || !/^\d+$/.test(gsPlayerId)) {
        profileTeamIdByPlayer.set(playerId, null);
        continue;
      }
      await sleep(PROFILE_INTERVAL_MS);
      const gsTeamId = await fetchProfileTeamId(gsPlayerId);
      profileTeamIdByPlayer.set(playerId, gsTeamId);
    }
  }

  const counts: Record<MembershipRepairEvidenceClass, number> = {
    SAFE_BOTH_SIGNALS: 0,
    SAFE_CURRENT_SQUAD: 0,
    SAFE_PLAYER_PROFILE: 0,
    CONFLICT: 0,
    INSUFFICIENT_EVIDENCE: 0,
  };

  const safeCloseIds: string[] = [];
  const safeExamples: Array<Record<string, unknown>> = [];
  const conflictRows: Array<Record<string, unknown>> = [];
  const insufficientRows: Array<Record<string, unknown>> = [];

  for (const [playerId, memberships] of multiPlayers) {
    const sample = memberships[0]!;
    const distinctTeams = Array.from(new Set(memberships.map((m) => m.teamId)));

    const gsProfileTeamId = profileTeamIdByPlayer.get(playerId) ?? null;
    const profileTeamId = gsProfileTeamId ? fmTeamByGsTeamId.get(gsProfileTeamId) ?? null : null;

    const squadPresenceByTeamId: Record<string, boolean | null> = {};
    for (const m of memberships) {
      squadPresenceByTeamId[m.teamId] = squadPresenceForTeam(
        squadIndex,
        m.goalserveTeamId,
        sample.goalservePlayerId,
      );
    }

    const decision = classifyMultiCurrentMembershipRepair({
      playerTeamId: sample.playerTeamId,
      openMemberships: memberships.map((m) => ({
        id: m.id,
        teamId: m.teamId,
        lastSeenAt: m.lastSeenAt,
        startDate: m.startDate,
      })),
      profileTeamId,
      squadPresenceByTeamId,
    });

    counts[decision.classification]++;

    const rowSummary = {
      playerId,
      name: sample.playerName,
      slug: sample.playerSlug,
      goalservePlayerId: sample.goalservePlayerId,
      playerTeamId: sample.playerTeamId,
      teams: memberships.map((m) => m.teamName || m.teamId),
      teamIds: distinctTeams,
      profileGsTeamId: gsProfileTeamId,
      profileTeamId,
      squadPresenceByTeamId,
      classification: decision.classification,
      reason: decision.reason,
      keepTeamId: decision.keepTeamId,
      writable: decision.writable,
    };

    if (decision.writable) {
      safeCloseIds.push(...decision.closeMembershipIds);
      if (safeExamples.length < 12) {
        safeExamples.push({
          name: sample.playerName,
          classification: decision.classification,
          keepTeam:
            memberships.find((m) => m.teamId === decision.keepTeamId)?.teamName ||
            decision.keepTeamId,
          closeTeams: memberships
            .filter((m) => decision.closeMembershipIds.includes(m.id))
            .map((m) => m.teamName || m.teamId),
          reason: decision.reason,
        });
      }
    } else if (decision.classification === "CONFLICT") {
      conflictRows.push(rowSummary);
    } else {
      insufficientRows.push(rowSummary);
    }
  }

  const uniqueSafeCloseIds = Array.from(new Set(safeCloseIds));
  const willWrite = args.write && args.confirmSafeRepairs && uniqueSafeCloseIds.length > 0;

  console.log(
    JSON.stringify(
      {
        mode: willWrite ? "WRITE" : "DRY-RUN",
        openMemberships: active.length,
        playersWithOpenMemberships: byPlayer.size,
        multiCurrentPlayers: multiPlayers.length,
        classificationCounts: counts,
        safeWritableCloses: uniqueSafeCloseIds.length,
        safeWritablePlayers:
          counts.SAFE_BOTH_SIGNALS + counts.SAFE_CURRENT_SQUAD + counts.SAFE_PLAYER_PROFILE,
        conflictPlayers: counts.CONFLICT,
        insufficientPlayers: counts.INSUFFICIENT_EVIDENCE,
        leaguesFetched: squadIndex.leaguesFetched.length,
        leaguesFailed: squadIndex.leaguesFailed,
        safeExamples,
        conflictCases: conflictRows,
        insufficientCases: insufficientRows.slice(0, 40),
        insufficientOmitted: Math.max(0, insufficientRows.length - 40),
      },
      null,
      2,
    ),
  );

  if (willWrite) {
    await db
      .update(playerTeamMemberships)
      .set({ endDate: now })
      .where(inArray(playerTeamMemberships.id, uniqueSafeCloseIds));
    console.log(`[reconcile:player-memberships] closed=${uniqueSafeCloseIds.length}`);
  } else if (args.write) {
    console.log("[reconcile:player-memberships] nothing safe to close");
  } else {
    console.log(
      "[reconcile:player-memberships] dry-run only — pass --write --confirm-safe-repairs to apply SAFE_* closes",
    );
  }

  const openAfter = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(playerTeamMemberships)
    .where(or(isNull(playerTeamMemberships.endDate), gt(playerTeamMemberships.endDate, now)));
  console.log(`[reconcile:player-memberships] openMembershipsNow=${openAfter[0]?.c ?? "?"}`);
}

main()
  .catch((err) => {
    console.error("[reconcile:player-memberships] failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end().catch(() => undefined);
  });
