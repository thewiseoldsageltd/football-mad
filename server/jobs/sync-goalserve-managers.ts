import { db } from "../db";
import { managers, teams } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeForMatching(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

interface GoalserveManager {
  goalserveManagerId: string | null;
  name: string;
  nationality: string | null;
  goalserveTeamId: string;
  teamName: string;
}

interface DbTeam {
  id: string;
  name: string;
  goalserveTeamId: string | null;
}

interface DbManager {
  id: string;
  name: string;
  slug: string;
  goalserveManagerId: string | null;
  currentTeamId: string | null;
}

export async function syncGoalserveManagers(leagueId: string): Promise<{
  ok: boolean;
  leagueId: string;
  goalserveManagers: number;
  inserted: number;
  updated: number;
  skipped: number;
  unmatchedTeams: { teamName: string; goalserveTeamId: string; managerName: string }[];
  error?: string;
}> {
  try {
    const response = await goalserveFetch(`soccerleague/${leagueId}`);
    
    const teamData = response?.league?.team;
    if (!teamData) {
      return {
        ok: false,
        leagueId,
        goalserveManagers: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        unmatchedTeams: [],
        error: "No team data found in response.league.team",
      };
    }
    
    const teamArray = Array.isArray(teamData) ? teamData : [teamData];
    
    const goalserveManagersList: GoalserveManager[] = [];
    
    for (const team of teamArray) {
      const goalserveTeamId = String(team["@id"] ?? team.id ?? "");
      const teamName = String(team["@name"] ?? team.name ?? "");
      
      if (!goalserveTeamId) continue;
      
      let managerData: any = null;
      let managerId: string | null = null;
      let managerName: string | null = null;
      let managerNationality: string | null = null;
      
      if (team.coach) {
        managerData = team.coach;
      } else if (team.manager) {
        managerData = team.manager;
      } else if (team.head_coach) {
        managerData = team.head_coach;
      } else if (team.trainer) {
        managerData = team.trainer;
      }
      
      if (managerData) {
        if (typeof managerData === "string") {
          managerName = managerData;
        } else if (typeof managerData === "object") {
          managerId = String(managerData["@id"] ?? managerData.id ?? "") || null;
          managerName = String(managerData["@name"] ?? managerData.name ?? "") || null;
          managerNationality = String(managerData["@nationality"] ?? managerData.nationality ?? managerData.country ?? "") || null;
        }
      }
      
      if (team["@coach"]) {
        managerName = String(team["@coach"]);
      }
      if (team["@manager"]) {
        managerName = String(team["@manager"]);
      }
      
      if (managerName && managerName.trim()) {
        goalserveManagersList.push({
          goalserveManagerId: managerId,
          name: managerName.trim(),
          nationality: managerNationality,
          goalserveTeamId,
          teamName,
        });
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

    const dbManagers: DbManager[] = await db
      .select({
        id: managers.id,
        name: managers.name,
        slug: managers.slug,
        goalserveManagerId: managers.goalserveManagerId,
        currentTeamId: managers.currentTeamId,
      })
      .from(managers);

    const managerByGoalserveId = new Map<string, DbManager>();
    const managerBySlug = new Map<string, DbManager>();
    const managerByNormalizedName = new Map<string, DbManager>();
    
    for (const mgr of dbManagers) {
      if (mgr.goalserveManagerId) {
        managerByGoalserveId.set(mgr.goalserveManagerId, mgr);
      }
      managerBySlug.set(mgr.slug, mgr);
      managerByNormalizedName.set(normalizeForMatching(mgr.name), mgr);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const unmatchedTeams: { teamName: string; goalserveTeamId: string; managerName: string }[] = [];

    for (const gsManager of goalserveManagersList) {
      const dbTeam = teamByGoalserveId.get(gsManager.goalserveTeamId);
      
      if (!dbTeam) {
        unmatchedTeams.push({
          teamName: gsManager.teamName,
          goalserveTeamId: gsManager.goalserveTeamId,
          managerName: gsManager.name,
        });
        continue;
      }

      let existingManager: DbManager | undefined;
      
      if (gsManager.goalserveManagerId) {
        existingManager = managerByGoalserveId.get(gsManager.goalserveManagerId);
      }
      
      if (!existingManager) {
        const slug = slugify(gsManager.name);
        existingManager = managerBySlug.get(slug);
      }
      
      if (!existingManager) {
        const normalized = normalizeForMatching(gsManager.name);
        existingManager = managerByNormalizedName.get(normalized);
      }

      const managerSlug = slugify(gsManager.name);
      const goalserveId = gsManager.goalserveManagerId || `mgr_${gsManager.goalserveTeamId}_${managerSlug}`;

      if (existingManager) {
        const needsUpdate =
          existingManager.currentTeamId !== dbTeam.id ||
          existingManager.goalserveManagerId !== goalserveId;
        
        if (needsUpdate) {
          await db
            .update(managers)
            .set({
              currentTeamId: dbTeam.id,
              goalserveManagerId: goalserveId,
            })
            .where(eq(managers.id, existingManager.id));
          updated++;
          
          existingManager.currentTeamId = dbTeam.id;
          existingManager.goalserveManagerId = goalserveId;
        } else {
          skipped++;
        }
      } else {
        let finalSlug = managerSlug;
        if (managerBySlug.has(finalSlug)) {
          finalSlug = `${managerSlug}-${goalserveId.slice(-8)}`;
        }
        
        try {
          const [inserted_] = await db.insert(managers).values({
            name: gsManager.name,
            slug: finalSlug,
            nationality: gsManager.nationality,
            currentTeamId: dbTeam.id,
            goalserveManagerId: goalserveId,
          }).returning();
          
          inserted++;
          
          const newMgr: DbManager = {
            id: inserted_.id,
            name: gsManager.name,
            slug: finalSlug,
            goalserveManagerId: goalserveId,
            currentTeamId: dbTeam.id,
          };
          managerBySlug.set(finalSlug, newMgr);
          managerByNormalizedName.set(normalizeForMatching(gsManager.name), newMgr);
          if (goalserveId) {
            managerByGoalserveId.set(goalserveId, newMgr);
          }
        } catch (err: any) {
          if (err?.code === "23505") {
            const [found] = await db.select().from(managers).where(eq(managers.slug, finalSlug)).limit(1);
            if (found) {
              await db
                .update(managers)
                .set({
                  currentTeamId: dbTeam.id,
                  goalserveManagerId: goalserveId,
                })
                .where(eq(managers.id, found.id));
              updated++;
            } else {
              skipped++;
            }
          } else {
            console.error(`[sync-goalserve-managers] Failed to insert manager ${gsManager.name}:`, err?.message || err);
            skipped++;
          }
        }
      }
    }

    return {
      ok: true,
      leagueId,
      goalserveManagers: goalserveManagersList.length,
      inserted,
      updated,
      skipped,
      unmatchedTeams: unmatchedTeams.slice(0, 10),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      leagueId,
      goalserveManagers: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      unmatchedTeams: [],
      error,
    };
  }
}
