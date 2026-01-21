import { db } from "../db";
import { teams } from "@shared/schema";
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

    let matched = 0;
    let updated = 0;
    const unmatched: { id: string; name: string }[] = [];

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
        unmatched.push({ id: gsTeam.goalserveTeamId, name: gsTeam.name });
      }
    }

    return {
      ok: true,
      leagueId,
      goalserveTeams: goalserveTeamsList.length,
      matched,
      updated,
      unmatchedSample: unmatched.slice(0, 15),
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      leagueId,
      goalserveTeams: 0,
      matched: 0,
      updated: 0,
      unmatchedSample: [],
      error,
    };
  }
}
