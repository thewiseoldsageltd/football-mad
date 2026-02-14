import { db } from "../db";
import { players, managers, playerTeamMemberships, teamManagers, squadsSnapshots, teams } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

const GOALSERVE_FEED_KEY = process.env.GOALSERVE_FEED_KEY || "";
const GOALSERVE_BASE = "https://www.goalserve.com";

function computeHash(data: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface UpsertGoalserveSquadsResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  leagueId: string;
  asOf?: string;
  insertedPlayersCount: number;
  insertedManagersCount: number;
  insertedTeamPlayersCount: number;
  insertedTeamManagersCount: number;
  endpointUsed: string;
  tournamentCount?: number;
  skippedTeams?: string[];
  error?: string | null;
}

export async function upsertGoalserveSquads(
  leagueId: string,
  opts?: { force?: boolean }
): Promise<UpsertGoalserveSquadsResult> {
  const force = opts?.force ?? false;
  const endpointUsed = `${GOALSERVE_BASE}/getfeed/${GOALSERVE_FEED_KEY}/soccerleague/${leagueId}?json=true`;

  let response: Response;
  try {
    response = await fetch(endpointUsed);
  } catch (fetchErr) {
    return {
      ok: false,
      leagueId,
      endpointUsed,
      insertedPlayersCount: 0,
      insertedManagersCount: 0,
      insertedTeamPlayersCount: 0,
      insertedTeamManagersCount: 0,
      error: `Fetch failed for ${endpointUsed}: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      leagueId,
      endpointUsed,
      insertedPlayersCount: 0,
      insertedManagersCount: 0,
      insertedTeamPlayersCount: 0,
      insertedTeamManagersCount: 0,
      error: `Goalserve API returned ${response.status} for ${endpointUsed}`,
    };
  }

  const data = await response.json();

  const leagueNode = data?.league;
  if (!leagueNode) {
    return {
      ok: false,
      leagueId,
      endpointUsed,
      insertedPlayersCount: 0,
      insertedManagersCount: 0,
      insertedTeamPlayersCount: 0,
      insertedTeamManagersCount: 0,
      error: "No league object in response",
    };
  }

  const feedTeams: any[] = Array.isArray(leagueNode.team) ? leagueNode.team : (leagueNode.team ? [leagueNode.team] : []);

  if (feedTeams.length === 0) {
    return {
      ok: false,
      leagueId,
      endpointUsed,
      insertedPlayersCount: 0,
      insertedManagersCount: 0,
      insertedTeamPlayersCount: 0,
      insertedTeamManagersCount: 0,
      error: "No teams in league feed",
    };
  }

  const payloadHash = computeHash(data);

  const [latestSnapshot] = await db
    .select({ id: squadsSnapshots.id, payloadHash: squadsSnapshots.payloadHash })
    .from(squadsSnapshots)
    .where(eq(squadsSnapshots.leagueId, leagueId))
    .orderBy(desc(squadsSnapshots.createdAt))
    .limit(1);

  if (latestSnapshot?.payloadHash === payloadHash && !force) {
    return {
      ok: true,
      skipped: true,
      reason: "hash_match",
      leagueId,
      endpointUsed,
      insertedPlayersCount: 0,
      insertedManagersCount: 0,
      insertedTeamPlayersCount: 0,
      insertedTeamManagersCount: 0,
    };
  }

  let asOfDate: Date;
  const tsRaw = leagueNode.timestamp;
  if (typeof tsRaw === "string" && tsRaw.trim()) {
    const match = tsRaw.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
    if (match) {
      const [, dd, mm, yyyy, hh, min, ss] = match;
      asOfDate = new Date(Date.UTC(
        parseInt(yyyy, 10),
        parseInt(mm, 10) - 1,
        parseInt(dd, 10),
        parseInt(hh, 10),
        parseInt(min, 10),
        parseInt(ss, 10)
      ));
    } else {
      asOfDate = new Date();
    }
  } else {
    asOfDate = new Date();
  }

  let insertedPlayersCount = 0;
  let insertedManagersCount = 0;
  let insertedTeamPlayersCount = 0;
  let insertedTeamManagersCount = 0;
  const skippedTeams: string[] = [];

  for (const feedTeam of feedTeams) {
    const gsTeamId = String(feedTeam?.id || feedTeam?.["@id"] || "").trim();
    const teamName = String(feedTeam?.name || feedTeam?.["@name"] || "").trim();

    if (!gsTeamId) {
      skippedTeams.push(`unknown (no id)`);
      continue;
    }

    const [dbTeam] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.goalserveTeamId, gsTeamId))
      .limit(1);

    if (!dbTeam) {
      skippedTeams.push(`${teamName || gsTeamId} (no DB team for gsId=${gsTeamId})`);
      continue;
    }

    const teamId = dbTeam.id;

    const coach = feedTeam?.coach;
    const coachId = String(coach?.id || coach?.["@id"] || "").trim();
    const coachName = String(coach?.name || coach?.["@name"] || "").trim();

    if (coachId && coachName) {
      let managerSlug = slugify(coachName);
      if (!managerSlug) managerSlug = `manager-${coachId}`;

      const [existingManager] = await db
        .select({ id: managers.id })
        .from(managers)
        .where(eq(managers.goalserveManagerId, coachId))
        .limit(1);

      let managerId: string;
      if (existingManager) {
        managerId = existingManager.id;
        await db.update(managers)
          .set({ name: coachName, currentTeamId: teamId })
          .where(eq(managers.id, managerId));
      } else {
        try {
          const [inserted] = await db.insert(managers)
            .values({
              name: coachName,
              slug: managerSlug,
              goalserveManagerId: coachId,
              currentTeamId: teamId,
            })
            .onConflictDoNothing()
            .returning({ id: managers.id });

          if (inserted) {
            managerId = inserted.id;
            insertedManagersCount++;
          } else {
            const [found] = await db
              .select({ id: managers.id })
              .from(managers)
              .where(eq(managers.goalserveManagerId, coachId))
              .limit(1);
            managerId = found?.id || "";
          }
        } catch (insertErr) {
          console.warn(`[SquadsIngest] Manager insert failed for gsId=${coachId}:`, insertErr);
          const [found] = await db
            .select({ id: managers.id })
            .from(managers)
            .where(eq(managers.goalserveManagerId, coachId))
            .limit(1);
          managerId = found?.id || "";
        }
      }

      if (managerId) {
        await db.insert(teamManagers)
          .values({ teamId, managerId, asOf: asOfDate })
          .onConflictDoUpdate({
            target: teamManagers.teamId,
            set: { managerId, asOf: asOfDate },
          });
        insertedTeamManagersCount++;
      }
    }

    const squadNode = feedTeam?.squad;
    const feedPlayers: any[] = Array.isArray(squadNode?.player)
      ? squadNode.player
      : (squadNode?.player ? [squadNode.player] : []);

    for (const fp of feedPlayers) {
      const gsPlayerId = String(fp?.id || fp?.["@id"] || "").trim();
      const playerName = String(fp?.name || fp?.["@name"] || "").trim();
      const playerPosition = String(fp?.position || fp?.["@position"] || "").trim() || null;
      const shirtNumber = String(fp?.number || fp?.["@number"] || "").trim() || null;

      if (!gsPlayerId || !playerName) continue;

      let playerSlug = slugify(playerName);
      if (!playerSlug) playerSlug = `player-${gsPlayerId}`;

      const [existingPlayer] = await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.goalservePlayerId, gsPlayerId))
        .limit(1);

      let playerId: string;
      if (existingPlayer) {
        playerId = existingPlayer.id;
        await db.update(players)
          .set({ name: playerName, position: playerPosition, teamId: teamId })
          .where(eq(players.id, playerId));
      } else {
        try {
          const [inserted] = await db.insert(players)
            .values({
              name: playerName,
              slug: playerSlug,
              goalservePlayerId: gsPlayerId,
              position: playerPosition,
              teamId: teamId,
            })
            .onConflictDoNothing()
            .returning({ id: players.id });

          if (inserted) {
            playerId = inserted.id;
            insertedPlayersCount++;
          } else {
            const [found] = await db
              .select({ id: players.id })
              .from(players)
              .where(eq(players.goalservePlayerId, gsPlayerId))
              .limit(1);
            playerId = found?.id || "";
          }
        } catch (insertErr) {
          console.warn(`[SquadsIngest] Player insert failed for gsId=${gsPlayerId}:`, insertErr);
          const [found] = await db
            .select({ id: players.id })
            .from(players)
            .where(eq(players.goalservePlayerId, gsPlayerId))
            .limit(1);
          playerId = found?.id || "";
        }
      }

      if (playerId) {
        const [existingMembership] = await db
          .select({ id: playerTeamMemberships.id })
          .from(playerTeamMemberships)
          .where(and(
            eq(playerTeamMemberships.playerId, playerId),
            eq(playerTeamMemberships.teamId, teamId),
          ))
          .limit(1);

        if (existingMembership) {
          await db.update(playerTeamMemberships)
            .set({ shirtNumber, position: playerPosition, startDate: asOfDate, source: "goalserve" })
            .where(eq(playerTeamMemberships.id, existingMembership.id));
        } else {
          try {
            await db.insert(playerTeamMemberships)
              .values({
                playerId,
                teamId,
                shirtNumber,
                position: playerPosition,
                startDate: asOfDate,
                source: "goalserve",
              })
              .onConflictDoNothing();
          } catch (err) {
            console.warn(`[SquadsIngest] Membership insert failed playerId=${playerId} teamId=${teamId}:`, err);
          }
        }
        insertedTeamPlayersCount++;
      }
    }
  }

  try {
    await db.insert(squadsSnapshots)
      .values({
        leagueId,
        asOf: asOfDate,
        payloadHash,
        endpointUsed,
      })
      .onConflictDoNothing();
  } catch (snapErr) {
    console.warn(`[SquadsIngest] Snapshot insert failed:`, snapErr);
  }

  console.log(`[SquadsIngest] leagueId=${leagueId} players=${insertedPlayersCount} managers=${insertedManagersCount} teamPlayers=${insertedTeamPlayersCount} teamManagers=${insertedTeamManagersCount} skippedTeams=${skippedTeams.length}`);

  return {
    ok: true,
    leagueId,
    asOf: asOfDate.toISOString(),
    endpointUsed,
    insertedPlayersCount,
    insertedManagersCount,
    insertedTeamPlayersCount,
    insertedTeamManagersCount,
    tournamentCount: feedTeams.length,
    skippedTeams: skippedTeams.length > 0 ? skippedTeams : undefined,
  };
}
