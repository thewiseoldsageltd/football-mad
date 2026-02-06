import { db } from "../db";
import { teams, competitions, competitionTeamMemberships } from "@shared/schema";
import { goalserveFetch } from "../integrations/goalserve/client";
import { eq } from "drizzle-orm";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function generateAbbreviations(name: string): string[] {
  const abbrevs: string[] = [];
  const words = name.split(/\s+/).filter(Boolean);
  
  if (words.length > 1) {
    abbrevs.push(words.map(w => w.slice(0, 1).toUpperCase()).join(""));
    abbrevs.push(words.map(w => w.slice(0, 3).toUpperCase()).join("").slice(0, 3));
  }
  
  const noSpaces = name.replace(/\s+/g, "");
  abbrevs.push(noSpaces.slice(0, 3).toUpperCase());
  
  return abbrevs;
}

async function ensureTeam(goalserveTeamId: string, name: string): Promise<DbTeam> {
  const safeId = String(goalserveTeamId).trim();
  const safeName = String(name).trim() || `Team ${safeId}`;
  const slug = slugify(safeName) || `team-${safeId}`;

  const [existing] = await db
    .select({ id: teams.id, name: teams.name, slug: teams.slug, shortName: teams.shortName, goalserveTeamId: teams.goalserveTeamId })
    .from(teams)
    .where(eq(teams.goalserveTeamId, safeId))
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(teams)
    .values({ name: safeName, slug, goalserveTeamId: safeId })
    .onConflictDoNothing()
    .returning({ id: teams.id, name: teams.name, slug: teams.slug, shortName: teams.shortName, goalserveTeamId: teams.goalserveTeamId });

  if (inserted) return inserted;

  const [found] = await db
    .select({ id: teams.id, name: teams.name, slug: teams.slug, shortName: teams.shortName, goalserveTeamId: teams.goalserveTeamId })
    .from(teams)
    .where(eq(teams.goalserveTeamId, safeId))
    .limit(1);

  if (!found) throw new Error(`Failed to ensure team for goalserveTeamId=${safeId}`);
  return found;
}

interface GoalserveTeam {
  goalserveTeamId: string;
  name: string;
}

interface DbTeam {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  goalserveTeamId: string | null;
}

export async function syncGoalserveTeams(leagueId: string): Promise<{
  ok: boolean;
  leagueId: string;
  goalserveTeams: number;
  matched: number;
  updated: number;
  membershipsUpserted: number;
  unmatchedSample: { id: string; name: string }[];
  error?: string;
}> {
  try {
    const response = await goalserveFetch(`soccerleague/${leagueId}`);
    
    const teamData = response?.league?.team;
    if (!teamData) {
      return {
        ok: false,
        leagueId,
        goalserveTeams: 0,
        matched: 0,
        updated: 0,
        membershipsUpserted: 0,
        unmatchedSample: [],
        error: "No team data found in response.league.team",
      };
    }
    
    const teamArray = Array.isArray(teamData) ? teamData : [teamData];
    
    const goalserveTeamsList: GoalserveTeam[] = teamArray.map((team: any) => ({
      goalserveTeamId: String(team["@id"] ?? team.id ?? ""),
      name: String(team["@name"] ?? team.name ?? ""),
    })).filter((t: GoalserveTeam) => t.goalserveTeamId && t.name);

    const dbTeams: DbTeam[] = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        shortName: teams.shortName,
        goalserveTeamId: teams.goalserveTeamId,
      })
      .from(teams);

    const dbByGoalserveId = new Map<string, DbTeam>();
    const dbBySlug = new Map<string, DbTeam>();
    const dbByNameLower = new Map<string, DbTeam>();
    const dbByShortNameLower = new Map<string, DbTeam>();

    for (const dbTeam of dbTeams) {
      if (dbTeam.goalserveTeamId) {
        dbByGoalserveId.set(dbTeam.goalserveTeamId, dbTeam);
      }
      dbBySlug.set(dbTeam.slug, dbTeam);
      dbByNameLower.set(dbTeam.name.toLowerCase(), dbTeam);
      if (dbTeam.shortName) {
        dbByShortNameLower.set(dbTeam.shortName.toLowerCase(), dbTeam);
      }
    }

    const [competitionRow] = await db
      .select({ id: competitions.id, season: competitions.season })
      .from(competitions)
      .where(eq(competitions.goalserveCompetitionId, leagueId))
      .limit(1);

    const competitionDbId = competitionRow?.id ?? null;
    const seasonKey = competitionRow?.season && String(competitionRow.season).trim()
      ? String(competitionRow.season).trim()
      : "unknown";

    let matched = 0;
    let updated = 0;
    let membershipsUpserted = 0;
    const seenTeamIds: string[] = [];

    for (const gsTeam of goalserveTeamsList) {
      let matchedDbTeam: DbTeam | undefined;

      matchedDbTeam = dbByGoalserveId.get(gsTeam.goalserveTeamId);

      if (!matchedDbTeam) {
        const gsSlug = slugify(gsTeam.name);
        matchedDbTeam = dbBySlug.get(gsSlug);
      }

      if (!matchedDbTeam) {
        matchedDbTeam = dbByNameLower.get(gsTeam.name.toLowerCase());
      }

      if (!matchedDbTeam) {
        const abbrevs = generateAbbreviations(gsTeam.name);
        for (const abbrev of abbrevs) {
          const found = dbByShortNameLower.get(abbrev.toLowerCase());
          if (found) {
            matchedDbTeam = found;
            break;
          }
        }
      }

      if (matchedDbTeam) {
        matched++;
        
        if (matchedDbTeam.goalserveTeamId !== gsTeam.goalserveTeamId) {
          await db
            .update(teams)
            .set({ goalserveTeamId: gsTeam.goalserveTeamId })
            .where(eq(teams.id, matchedDbTeam.id));
          updated++;
        }
      } else {
        const created = await ensureTeam(gsTeam.goalserveTeamId, gsTeam.name);
        matchedDbTeam = created;
        matched++;
      }

      seenTeamIds.push(matchedDbTeam.id);

      if (competitionDbId) {
        await db
          .insert(competitionTeamMemberships)
          .values({
            competitionId: competitionDbId,
            teamId: matchedDbTeam.id,
            seasonKey,
            membershipType: "league",
            isCurrent: true,
            source: "goalserve",
            lastSeenAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              competitionTeamMemberships.competitionId,
              competitionTeamMemberships.teamId,
              competitionTeamMemberships.seasonKey,
            ],
            set: {
              isCurrent: true,
              lastSeenAt: new Date(),
            },
          });
        membershipsUpserted++;
      }
    }

    if (competitionDbId && seenTeamIds.length > 0) {
      const placeholders = seenTeamIds.map((id) => `'${id}'`).join(",");
      await db.execute(
        `UPDATE competition_team_memberships
         SET is_current = false
         WHERE competition_id = '${competitionDbId}'
           AND season_key = '${seasonKey}'
           AND team_id NOT IN (${placeholders})`
      );
    }

    return {
      ok: true,
      leagueId,
      goalserveTeams: goalserveTeamsList.length,
      matched,
      updated,
      membershipsUpserted,
      unmatchedSample: [],
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      leagueId,
      goalserveTeams: 0,
      matched: 0,
      updated: 0,
      membershipsUpserted: 0,
      unmatchedSample: [],
      error,
    };
  }
}
