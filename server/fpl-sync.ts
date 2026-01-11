import { db } from "./db";
import { fplPlayerAvailability, teams } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

const FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";

const FPL_TEAM_SLUG_MAP: Record<string, string> = {
  "Man City": "manchester-city",
  "Man Utd": "manchester-united",
  "Spurs": "tottenham-hotspur",
  "Wolves": "wolverhampton-wanderers",
  "Nott'm Forest": "nottingham-forest",
  "Nottingham Forest": "nottingham-forest",
  "Newcastle": "newcastle-united",
  "West Ham": "west-ham-united",
  "Brighton": "brighton-and-hove-albion",
  "Leicester": "leicester-city",
  "Ipswich": "ipswich-town",
  "Crystal Palace": "crystal-palace",
  "Aston Villa": "aston-villa",
  "Liverpool": "liverpool",
  "Arsenal": "arsenal",
  "Chelsea": "chelsea",
  "Everton": "everton",
  "Fulham": "fulham",
  "Brentford": "brentford",
  "Bournemouth": "afc-bournemouth",
  "Southampton": "southampton",
};

const FPL_POSITION_MAP: Record<number, "GKP" | "DEF" | "MID" | "FWD"> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

interface FplElement {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;
  status: string;
  news: string;
  news_added: string | null;
}

interface FplTeam {
  id: number;
  name: string;
  short_name: string;
}

interface FplBootstrapData {
  elements: FplElement[];
  teams: FplTeam[];
  element_types: { id: number; singular_name_short: string }[];
}

async function getTeamSlugMapping(): Promise<Record<number, string>> {
  const allTeams = await db.select().from(teams);
  const mapping: Record<number, string> = {};
  
  return mapping;
}

function mapFplTeamToSlug(fplTeamName: string, fplShortName: string): string | null {
  if (FPL_TEAM_SLUG_MAP[fplTeamName]) {
    return FPL_TEAM_SLUG_MAP[fplTeamName];
  }
  if (FPL_TEAM_SLUG_MAP[fplShortName]) {
    return FPL_TEAM_SLUG_MAP[fplShortName];
  }
  
  const slug = fplTeamName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
  
  return slug || null;
}

export async function syncFplAvailability(): Promise<{ updated: number; skipped: number; errors: string[] }> {
  const errors: string[] = [];
  let updated = 0;
  let skipped = 0;

  try {
    const response = await fetch(FPL_BOOTSTRAP_URL);
    if (!response.ok) {
      throw new Error(`FPL API returned ${response.status}`);
    }
    
    const data: FplBootstrapData = await response.json();
    
    const fplTeamIdToSlug: Record<number, string> = {};
    for (const fplTeam of data.teams) {
      const slug = mapFplTeamToSlug(fplTeam.name, fplTeam.short_name);
      if (slug) {
        fplTeamIdToSlug[fplTeam.id] = slug;
      }
    }
    
    const now = new Date();
    
    for (const element of data.elements) {
      try {
        const teamSlug = fplTeamIdToSlug[element.team];
        if (!teamSlug) {
          skipped++;
          continue;
        }
        
        const position = FPL_POSITION_MAP[element.element_type] || "MID";
        const playerName = `${element.first_name} ${element.second_name}`.trim();
        const newsAdded = element.news_added ? new Date(element.news_added) : null;
        
        await db
          .insert(fplPlayerAvailability)
          .values({
            fplElementId: element.id,
            fplTeamId: element.team,
            teamSlug,
            playerName,
            position,
            chanceThisRound: element.chance_of_playing_this_round,
            chanceNextRound: element.chance_of_playing_next_round,
            fplStatus: element.status,
            news: element.news || null,
            newsAdded,
          })
          .onConflictDoUpdate({
            target: fplPlayerAvailability.fplElementId,
            set: {
              fplTeamId: element.team,
              teamSlug,
              playerName,
              position,
              chanceThisRound: element.chance_of_playing_this_round,
              chanceNextRound: element.chance_of_playing_next_round,
              fplStatus: element.status,
              news: element.news || null,
              newsAdded,
              lastSyncedAt: now,
            },
          });
        
        updated++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Element ${element.id}: ${msg}`);
      }
    }
    
    return { updated, skipped, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Sync failed: ${msg}`);
    return { updated, skipped, errors };
  }
}

export function getRagColor(chanceThisRound: number | null, fplStatus: string | null, news: string | null): {
  color: "green" | "light-green" | "amber" | "orange" | "red" | "unknown";
  displayPercent: string;
} {
  if (chanceThisRound === null) {
    if (fplStatus && fplStatus !== "a" || (news && news.length > 0)) {
      return { color: "red", displayPercent: "—" };
    }
    return { color: "green", displayPercent: "100%" };
  }
  
  const displayPercent = `${chanceThisRound}%`;
  
  if (chanceThisRound === 100) {
    return { color: "green", displayPercent };
  } else if (chanceThisRound >= 75) {
    return { color: "light-green", displayPercent };
  } else if (chanceThisRound >= 50) {
    return { color: "amber", displayPercent };
  } else if (chanceThisRound >= 25) {
    return { color: "orange", displayPercent };
  } else {
    return { color: "red", displayPercent };
  }
}
