import { db } from "../db";
import { players, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface GoalservePlayer {
  goalservePlayerId: string;
  name: string;
  goalserveTeamId: string;
  teamName: string;
}

interface DbPlayer {
  id: string;
  name: string;
  slug: string;
  teamId: string | null;
  goalservePlayerId: string | null;
}

interface DbTeam {
  id: string;
  name: string;
  goalserveTeamId: string | null;
}

export async function syncGoalservePlayers(leagueId: string): Promise<{
  ok: boolean;
  leagueId: string;
  goalservePlayers: number;
  matched: number;
  updated: number;
  unmatchedSample: { teamName: string; goalserveTeamId: string; playerId: string; playerName: string }[];
  error?: string;
}> {
  try {
    const response = await goalserveFetch(`soccerleague/${leagueId}`);
    
    const teamData = response?.league?.team;
    if (!teamData) {
      return {
        ok: false,
        leagueId,
        goalservePlayers: 0,
        matched: 0,
        updated: 0,
        unmatchedSample: [],
        error: "No team data found in response.league.team",
      };
    }
    
    const teamArray = Array.isArray(teamData) ? teamData : [teamData];
    
    const goalservePlayersList: GoalservePlayer[] = [];
    
    for (const team of teamArray) {
      const goalserveTeamId = String(team["@id"] ?? team.id ?? "");
      const teamName = String(team["@name"] ?? team.name ?? "");
      
      if (!goalserveTeamId) continue;
      
      const squadData = team.squad?.player || team.player || [];
      const playerArray = Array.isArray(squadData) ? squadData : [squadData];
      
      for (const player of playerArray) {
        const playerId = String(player["@id"] ?? player.id ?? "");
        const playerName = String(player["@name"] ?? player.name ?? "");
        
        if (playerId && playerName) {
          goalservePlayersList.push({
            goalservePlayerId: playerId,
            name: playerName,
            goalserveTeamId,
            teamName,
          });
        }
      }
    }

    const dbTeams: DbTeam[] = await db
      .select({
        id: teams.id,
        name: teams.name,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams);

    const teamByGoalserveId = new Map<string, DbTeam>();
    for (const team of dbTeams) {
      if (team.goalserveTeamId) {
        teamByGoalserveId.set(team.goalserveTeamId, team);
      }
    }

    const dbPlayers: DbPlayer[] = await db
      .select({
        id: players.id,
        name: players.name,
        slug: players.slug,
        teamId: players.teamId,
        goalservePlayerId: players.goalservePlayerId,
      })
      .from(players);

    const playersByTeamId = new Map<string, DbPlayer[]>();
    for (const player of dbPlayers) {
      if (player.teamId) {
        const existing = playersByTeamId.get(player.teamId) || [];
        existing.push(player);
        playersByTeamId.set(player.teamId, existing);
      }
    }

    let matched = 0;
    let updated = 0;
    const unmatched: { teamName: string; goalserveTeamId: string; playerId: string; playerName: string }[] = [];

    for (const gsPlayer of goalservePlayersList) {
      const dbTeam = teamByGoalserveId.get(gsPlayer.goalserveTeamId);
      
      if (!dbTeam) {
        unmatched.push({
          teamName: gsPlayer.teamName,
          goalserveTeamId: gsPlayer.goalserveTeamId,
          playerId: gsPlayer.goalservePlayerId,
          playerName: gsPlayer.name,
        });
        continue;
      }

      const teamPlayers = playersByTeamId.get(dbTeam.id) || [];
      
      let matchedPlayer: DbPlayer | undefined;
      
      for (const dbPlayer of teamPlayers) {
        if (dbPlayer.goalservePlayerId === gsPlayer.goalservePlayerId) {
          matchedPlayer = dbPlayer;
          break;
        }
      }
      
      if (!matchedPlayer) {
        const gsNameLower = gsPlayer.name.toLowerCase();
        for (const dbPlayer of teamPlayers) {
          if (dbPlayer.name.toLowerCase() === gsNameLower) {
            matchedPlayer = dbPlayer;
            break;
          }
        }
      }
      
      if (!matchedPlayer) {
        const gsSlug = slugify(gsPlayer.name);
        for (const dbPlayer of teamPlayers) {
          if (dbPlayer.slug === gsSlug) {
            matchedPlayer = dbPlayer;
            break;
          }
        }
      }

      if (matchedPlayer) {
        matched++;
        
        if (matchedPlayer.goalservePlayerId !== gsPlayer.goalservePlayerId) {
          await db
            .update(players)
            .set({ goalservePlayerId: gsPlayer.goalservePlayerId })
            .where(eq(players.id, matchedPlayer.id));
          updated++;
        }
      } else {
        unmatched.push({
          teamName: gsPlayer.teamName,
          goalserveTeamId: gsPlayer.goalserveTeamId,
          playerId: gsPlayer.goalservePlayerId,
          playerName: gsPlayer.name,
        });
      }
    }

    return {
      ok: true,
      leagueId,
      goalservePlayers: goalservePlayersList.length,
      matched,
      updated,
      unmatchedSample: unmatched.slice(0, 15),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      leagueId,
      goalservePlayers: 0,
      matched: 0,
      updated: 0,
      unmatchedSample: [],
      error,
    };
  }
}
