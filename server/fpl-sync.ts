import { db } from "./db";
import { fplPlayerAvailability, teams } from "@shared/schema";
import { eq, sql, inArray, notInArray, and } from "drizzle-orm";

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
  "Burnley": "burnley",
  "Leeds": "leeds-united",
  "Leeds United": "leeds-united",
  "Sunderland": "sunderland",
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

export async function syncFplTeams(): Promise<{ upserted: number; demoted: number; errors: string[] }> {
  const errors: string[] = [];
  let upserted = 0;
  let demoted = 0;
  const fplSlugs: string[] = [];

  try {
    const response = await fetch(FPL_BOOTSTRAP_URL);
    if (!response.ok) {
      throw new Error(`FPL API returned ${response.status}`);
    }
    
    const data: FplBootstrapData = await response.json();
    
    for (const fplTeam of data.teams) {
      try {
        const slug = mapFplTeamToSlug(fplTeam.name, fplTeam.short_name);
        if (!slug) {
          errors.push(`Could not derive slug for team: ${fplTeam.name}`);
          continue;
        }
        
        fplSlugs.push(slug);
        
        const existing = await db.select().from(teams).where(eq(teams.slug, slug));
        
        if (existing.length > 0) {
          const existingTeam = existing[0];
          await db
            .update(teams)
            .set({
              shortName: fplTeam.short_name,
              league: "Premier League",
              name: existingTeam.name || fplTeam.name,
            })
            .where(eq(teams.slug, slug));
        } else {
          const nameExists = await db.select().from(teams).where(eq(teams.name, fplTeam.name));
          const teamName = nameExists.length > 0 ? `${fplTeam.name} FC` : fplTeam.name;
          
          await db.insert(teams).values({
            name: teamName,
            slug,
            shortName: fplTeam.short_name,
            league: "Premier League",
          });
        }
        
        upserted++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Team ${fplTeam.name}: ${msg}`);
      }
    }
    
    if (fplSlugs.length > 0) {
      const demotedTeams = await db
        .update(teams)
        .set({ league: "Championship" })
        .where(
          and(
            eq(teams.league, "Premier League"),
            notInArray(teams.slug, fplSlugs)
          )
        )
        .returning();
      
      demoted = demotedTeams.length;
      
      if (demoted > 0) {
        console.log(`[FPL Team Sync] Demoted ${demoted} teams to Championship:`, demotedTeams.map(t => t.slug).join(", "));
      }
    }
    
    const plTeams = await db.select({ name: teams.name, slug: teams.slug }).from(teams).where(eq(teams.league, "Premier League"));
    console.log(`[FPL Team Sync] Premier League teams (${plTeams.length}):`, plTeams.map(t => t.slug).join(", "));
    
    return { upserted, demoted, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Team sync failed: ${msg}`);
    return { upserted, demoted, errors };
  }
}

export type Classification = "INJURY" | "SUSPENSION" | "LOAN_OR_TRANSFER";
export type AvailabilityBucket = "RETURNING_SOON" | "COIN_FLIP" | "DOUBTFUL" | "OUT" | "SUSPENDED" | "LEFT_CLUB";
export type RingColor = "green" | "amber" | "red" | "gray";

function isLoanOrTransfer(news: string | null): boolean {
  if (!news) return false;
  const lowerNews = news.toLowerCase();
  
  if (lowerNews.includes("has joined") || 
      lowerNews.includes("on loan") || 
      lowerNews.includes("permanently")) {
    return true;
  }
  
  if (lowerNews.includes("joined") && 
      (lowerNews.includes("loan") || lowerNews.includes("permanently"))) {
    return true;
  }
  
  return false;
}

export function classifyPlayer(
  chanceNextRound: number | null, 
  chanceThisRound: number | null, 
  fplStatus: string | null, 
  news: string | null
): {
  classification: Classification;
  bucket: AvailabilityBucket;
  ringColor: RingColor;
  displayPercent: string;
  effectiveChance: number | null;
} {
  const effectiveChance = chanceNextRound ?? chanceThisRound ?? null;
  
  if (fplStatus === "s") {
    return {
      classification: "SUSPENSION",
      bucket: "SUSPENDED",
      ringColor: "red",
      displayPercent: "—",
      effectiveChance,
    };
  }
  
  if (isLoanOrTransfer(news)) {
    return {
      classification: "LOAN_OR_TRANSFER",
      bucket: "LEFT_CLUB",
      ringColor: "gray",
      displayPercent: "—",
      effectiveChance,
    };
  }
  
  if (effectiveChance === null) {
    if ((fplStatus && fplStatus !== "a") || (news && news.length > 0)) {
      return {
        classification: "INJURY",
        bucket: "OUT",
        ringColor: "red",
        displayPercent: "—",
        effectiveChance: null,
      };
    }
    return {
      classification: "INJURY",
      bucket: "RETURNING_SOON",
      ringColor: "green",
      displayPercent: "100%",
      effectiveChance: 100,
    };
  }
  
  const displayPercent = `${effectiveChance}%`;
  
  if (effectiveChance === 100) {
    return {
      classification: "INJURY",
      bucket: "RETURNING_SOON",
      ringColor: "green",
      displayPercent,
      effectiveChance,
    };
  } else if (effectiveChance === 75) {
    return {
      classification: "INJURY",
      bucket: "RETURNING_SOON",
      ringColor: "amber",
      displayPercent,
      effectiveChance,
    };
  } else if (effectiveChance === 50) {
    return {
      classification: "INJURY",
      bucket: "COIN_FLIP",
      ringColor: "amber",
      displayPercent,
      effectiveChance,
    };
  } else if (effectiveChance > 0 && effectiveChance < 50) {
    return {
      classification: "INJURY",
      bucket: "DOUBTFUL",
      ringColor: "red",
      displayPercent,
      effectiveChance,
    };
  } else {
    return {
      classification: "INJURY",
      bucket: "OUT",
      ringColor: "red",
      displayPercent,
      effectiveChance,
    };
  }
}

export function getRagColor(
  chanceNextRound: number | null, 
  chanceThisRound: number | null, 
  fplStatus: string | null, 
  news: string | null
): {
  color: "green" | "amber" | "red";
  displayPercent: string;
  effectiveChance: number | null;
} {
  const result = classifyPlayer(chanceNextRound, chanceThisRound, fplStatus, news);
  return {
    color: result.ringColor === "gray" ? "red" : result.ringColor,
    displayPercent: result.displayPercent,
    effectiveChance: result.effectiveChance,
  };
}
