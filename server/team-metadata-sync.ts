import { db } from "./db";
import { teams } from "@shared/schema";
import { eq } from "drizzle-orm";

const DISPLAY_NAME_TO_SLUG: Record<string, string> = {
  "Arsenal": "arsenal",
  "Aston Villa": "aston-villa",
  "Bournemouth": "afc-bournemouth",
  "Brentford": "brentford",
  "Brighton": "brighton-and-hove-albion",
  "Burnley": "burnley",
  "Chelsea": "chelsea",
  "Crystal Palace": "crystal-palace",
  "Everton": "everton",
  "Fulham": "fulham",
  "Leeds": "leeds-united",
  "Liverpool": "liverpool",
  "Man City": "manchester-city",
  "Man Utd": "manchester-united",
  "Newcastle": "newcastle-united",
  "Nottingham Forest": "nottingham-forest",
  "Sunderland": "sunderland",
  "Tottenham": "tottenham-hotspur",
  "West Ham": "west-ham-united",
  "Wolves": "wolverhampton-wanderers",
};

const SLUG_TO_DISPLAY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(DISPLAY_NAME_TO_SLUG).map(([name, slug]) => [slug, name])
);

const WIKIDATA_NAME_TO_DISPLAY_NAME: Record<string, string> = {
  "arsenal f.c.": "Arsenal",
  "arsenal fc": "Arsenal",
  "arsenal": "Arsenal",
  "aston villa f.c.": "Aston Villa",
  "aston villa fc": "Aston Villa",
  "aston villa": "Aston Villa",
  "a.f.c. bournemouth": "Bournemouth",
  "afc bournemouth": "Bournemouth",
  "bournemouth": "Bournemouth",
  "brentford f.c.": "Brentford",
  "brentford fc": "Brentford",
  "brentford": "Brentford",
  "brighton & hove albion f.c.": "Brighton",
  "brighton & hove albion fc": "Brighton",
  "brighton and hove albion": "Brighton",
  "brighton": "Brighton",
  "burnley f.c.": "Burnley",
  "burnley fc": "Burnley",
  "burnley": "Burnley",
  "chelsea f.c.": "Chelsea",
  "chelsea fc": "Chelsea",
  "chelsea": "Chelsea",
  "crystal palace f.c.": "Crystal Palace",
  "crystal palace fc": "Crystal Palace",
  "crystal palace": "Crystal Palace",
  "everton f.c.": "Everton",
  "everton fc": "Everton",
  "everton": "Everton",
  "fulham f.c.": "Fulham",
  "fulham fc": "Fulham",
  "fulham": "Fulham",
  "leeds united f.c.": "Leeds",
  "leeds united fc": "Leeds",
  "leeds united": "Leeds",
  "leeds": "Leeds",
  "liverpool f.c.": "Liverpool",
  "liverpool fc": "Liverpool",
  "liverpool": "Liverpool",
  "manchester city f.c.": "Man City",
  "manchester city fc": "Man City",
  "manchester city": "Man City",
  "man city": "Man City",
  "manchester united f.c.": "Man Utd",
  "manchester united fc": "Man Utd",
  "manchester united": "Man Utd",
  "man utd": "Man Utd",
  "newcastle united f.c.": "Newcastle",
  "newcastle united fc": "Newcastle",
  "newcastle united": "Newcastle",
  "newcastle": "Newcastle",
  "nottingham forest f.c.": "Nottingham Forest",
  "nottingham forest fc": "Nottingham Forest",
  "nottingham forest": "Nottingham Forest",
  "sunderland a.f.c.": "Sunderland",
  "sunderland afc": "Sunderland",
  "sunderland": "Sunderland",
  "tottenham hotspur f.c.": "Tottenham",
  "tottenham hotspur fc": "Tottenham",
  "tottenham hotspur": "Tottenham",
  "tottenham": "Tottenham",
  "spurs": "Tottenham",
  "west ham united f.c.": "West Ham",
  "west ham united fc": "West Ham",
  "west ham united": "West Ham",
  "west ham": "West Ham",
  "wolverhampton wanderers f.c.": "Wolves",
  "wolverhampton wanderers fc": "Wolves",
  "wolverhampton wanderers": "Wolves",
  "wolves": "Wolves",
};

const MANUAL_OVERRIDES: Record<string, { manager?: string; stadiumName?: string }> = {};

function normalizeClubName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "'")
    .replace(/[^\w\s&.]/g, "")
    .trim();
}

function mapWikidataNameToDisplayName(wikidataName: string): string | null {
  const normalized = normalizeClubName(wikidataName);
  return WIKIDATA_NAME_TO_DISPLAY_NAME[normalized] || null;
}

interface WikidataResult {
  clubLabel: string;
  stadiumLabel?: string;
  managerLabel?: string;
}

async function fetchWikidataTeamMetadata(): Promise<WikidataResult[]> {
  const sparqlQuery = `
    SELECT ?clubLabel ?stadiumLabel ?managerLabel WHERE {
      ?club wdt:P31 wd:Q476028;
            wdt:P118 wd:Q9448.
      OPTIONAL { ?club wdt:P115 ?stadium. }
      OPTIONAL { ?club wdt:P286 ?manager. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `;

  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparqlQuery)}`;

  const response = await fetch(url, {
    headers: {
      "Accept": "application/sparql-results+json",
      "User-Agent": "FootballMad/1.0 (https://replit.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`Wikidata query failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const results: WikidataResult[] = [];

  for (const binding of data.results.bindings) {
    results.push({
      clubLabel: binding.clubLabel?.value || "",
      stadiumLabel: binding.stadiumLabel?.value,
      managerLabel: binding.managerLabel?.value,
    });
  }

  return results;
}

export interface SyncTeamMetadataResult {
  updated: number;
  skipped: number;
  errors: string[];
  details: Array<{ slug: string; action: string; changes?: string[] }>;
}

export async function syncTeamMetadata(): Promise<SyncTeamMetadataResult> {
  const result: SyncTeamMetadataResult = {
    updated: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  console.log("[team-metadata-sync] Fetching data from Wikidata...");

  let wikidataResults: WikidataResult[];
  try {
    wikidataResults = await fetchWikidataTeamMetadata();
    console.log(`[team-metadata-sync] Received ${wikidataResults.length} results from Wikidata`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Wikidata fetch failed: ${message}`);
    console.error("[team-metadata-sync] Wikidata fetch failed:", message);
    return result;
  }

  const wikidataByDisplayName: Record<string, WikidataResult> = {};
  for (const row of wikidataResults) {
    const displayName = mapWikidataNameToDisplayName(row.clubLabel);
    if (displayName) {
      if (!wikidataByDisplayName[displayName] || 
          (row.managerLabel && !wikidataByDisplayName[displayName].managerLabel)) {
        wikidataByDisplayName[displayName] = row;
      }
    }
  }

  console.log(`[team-metadata-sync] Mapped ${Object.keys(wikidataByDisplayName).length} clubs to our display names`);

  for (const [displayName, slug] of Object.entries(DISPLAY_NAME_TO_SLUG)) {
    try {
      const [existingTeam] = await db.select().from(teams).where(eq(teams.slug, slug));

      if (!existingTeam) {
        result.skipped++;
        result.details.push({ slug, action: "skipped - team not in DB" });
        console.log(`[team-metadata-sync] Skipping ${slug} - not found in database`);
        continue;
      }

      const wikidataRow = wikidataByDisplayName[displayName];
      const override = MANUAL_OVERRIDES[slug];

      const updates: Partial<{ name: string; manager: string; stadiumName: string }> = {};
      const changes: string[] = [];

      if (existingTeam.name !== displayName) {
        updates.name = displayName;
        changes.push(`name: "${existingTeam.name}" -> "${displayName}"`);
      }

      const newManager = override?.manager || wikidataRow?.managerLabel;
      if (newManager && (!existingTeam.manager || existingTeam.manager.trim() === "")) {
        updates.manager = newManager;
        changes.push(`manager: "${existingTeam.manager || ""}" -> "${newManager}"`);
      } else if (newManager && newManager !== existingTeam.manager) {
        updates.manager = newManager;
        changes.push(`manager: "${existingTeam.manager}" -> "${newManager}"`);
      }

      const newStadium = override?.stadiumName || wikidataRow?.stadiumLabel;
      if (newStadium && (!existingTeam.stadiumName || existingTeam.stadiumName.trim() === "")) {
        updates.stadiumName = newStadium;
        changes.push(`stadiumName: "${existingTeam.stadiumName || ""}" -> "${newStadium}"`);
      }

      if (Object.keys(updates).length > 0) {
        await db.update(teams).set(updates).where(eq(teams.slug, slug));
        result.updated++;
        result.details.push({ slug, action: "updated", changes });
        console.log(`[team-metadata-sync] Updated ${slug}: ${changes.join(", ")}`);
      } else {
        result.skipped++;
        result.details.push({ slug, action: "skipped - no changes needed" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${slug}: ${message}`);
      console.error(`[team-metadata-sync] Error processing ${slug}:`, message);
    }
  }

  console.log(`[team-metadata-sync] Sync complete: ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`);

  return result;
}
