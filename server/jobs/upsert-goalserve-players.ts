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
}

interface DbTeam {
  id: string;
  goalserveTeamId: string | null;
}

export async function upsertGoalservePlayers(leagueId: string): Promise<{
  ok: boolean;
  leagueId: string;
  totalFromGoalserve: number;
  inserted: number;
  updated: number;
  skippedNoTeamMapping: number;
  error?: string;
  sample?: any;
}> {
  try {
    const response = await goalserveFetch(`soccerleague/${leagueId}`);

    const teamData = response?.league?.team;
    if (!teamData) {
      return {
        ok: false,
        leagueId,
        totalFromGoalserve: 0,
        inserted: 0,
        updated: 0,
        skippedNoTeamMapping: 0,
        error: "No team data found in response.league.team",
      };
    }

    const teamArray = Array.isArray(teamData) ? teamData : [teamData];

    const goalservePlayersList: GoalservePlayer[] = [];

    for (const team of teamArray) {
      const goalserveTeamId = String(team["@id"] ?? team.id ?? "");
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
          });
        }
      }
    }

    const dbTeams: DbTeam[] = await db
      .select({
        id: teams.id,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams);

    const teamByGoalserveId = new Map<string, DbTeam>();
    for (const team of dbTeams) {
      if (team.goalserveTeamId) {
        teamByGoalserveId.set(team.goalserveTeamId, team);
      }
    }

    let inserted = 0;
    let updated = 0;
    let skippedNoTeamMapping = 0;

    for (const gsPlayer of goalservePlayersList) {
      const dbTeam = teamByGoalserveId.get(gsPlayer.goalserveTeamId);

      if (!dbTeam) {
        skippedNoTeamMapping++;
        continue;
      }

      const existing = await db
        .select()
        .from(players)
        .where(eq(players.goalservePlayerId, gsPlayer.goalservePlayerId))
        .limit(1);

      const slug = slugify(gsPlayer.name);

      if (existing.length > 0) {
        await db
          .update(players)
          .set({
            name: gsPlayer.name,
            slug,
            teamId: dbTeam.id,
            goalservePlayerId: gsPlayer.goalservePlayerId,
          })
          .where(eq(players.goalservePlayerId, gsPlayer.goalservePlayerId));
        updated++;
      } else {
        await db.insert(players).values({
          name: gsPlayer.name,
          slug,
          teamId: dbTeam.id,
          goalservePlayerId: gsPlayer.goalservePlayerId,
        });
        inserted++;
      }
    }

    return {
      ok: true,
      leagueId,
      totalFromGoalserve: goalservePlayersList.length,
      inserted,
      updated,
      skippedNoTeamMapping,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      leagueId,
      totalFromGoalserve: 0,
      inserted: 0,
      updated: 0,
      skippedNoTeamMapping: 0,
      error,
      sample: error.slice(0, 300),
    };
  }
}
