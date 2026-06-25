import { eq } from "drizzle-orm";
import { db } from "../db";
import { competitions } from "@shared/schema";
import { resolveCompetitionIdForRequestSlug } from "./spa-entity-noindex";

/** Tables UI competition slugs → display names (aligned with client `tables-mock`). */
const TABLES_COMPETITION_DISPLAY_NAMES: Record<string, string> = {
  "premier-league": "Premier League",
  championship: "Championship",
  "league-one": "League One",
  "league-two": "League Two",
  "national-league": "National League",
  "scottish-premiership": "Scottish Premiership",
  "scottish-championship": "Scottish Championship",
  "la-liga": "La Liga",
  "serie-a": "Serie A",
  bundesliga: "Bundesliga",
  "ligue-1": "Ligue 1",
  "champions-league": "Champions League",
  "europa-league": "Europa League",
  "conference-league": "Conference League",
  "fa-cup": "FA Cup",
  "efl-cup": "EFL Cup",
  "scottish-cup": "Scottish Cup",
  "scottish-league-cup": "Scottish League Cup",
  "copa-del-rey": "Copa del Rey",
  "coppa-italia": "Coppa Italia",
  "dfb-pokal": "DFB-Pokal",
  "coupe-de-france": "Coupe de France",
};

function titleCaseFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function competitionDisplayName(row: {
  canonicalName: string | null;
  name: string;
}): string {
  const canon = row.canonicalName?.trim();
  return canon || row.name;
}

export function formatTablesSeasonDisplay(seasonSlug: string | null | undefined): string {
  if (!seasonSlug?.trim()) return "";
  const slug = seasonSlug.trim();
  const short = slug.match(/^(\d{4})-(\d{2})$/);
  if (short) return `${short[1]}/${short[2]}`;
  return slug.replace("-", "/");
}

async function resolveTablesCompetitionDisplayName(compSlug: string): Promise<string> {
  const norm = compSlug.trim().toLowerCase();
  const fromMap = TABLES_COMPETITION_DISPLAY_NAMES[norm];
  if (fromMap) return fromMap;

  const entityId = await resolveCompetitionIdForRequestSlug(norm);
  if (entityId) {
    const [row] = await db
      .select({
        name: competitions.name,
        canonicalName: competitions.canonicalName,
      })
      .from(competitions)
      .where(eq(competitions.id, entityId))
      .limit(1);
    if (row) return competitionDisplayName(row);
  }

  return titleCaseFromSlug(norm);
}

function buildTablesCompetitionMeta(
  competition: string,
  seasonDisplay: string,
  canonicalPath: string,
): { title: string; description: string; canonicalPath: string } {
  const title = seasonDisplay
    ? `${competition} Table & Standings ${seasonDisplay} | Football Mad`
    : `${competition} Table & Standings | Football Mad`;
  const description = seasonDisplay
    ? `${competition} league table, standings, form and points for the ${seasonDisplay} season on Football Mad.`
    : `${competition} league table, standings, form and points on Football Mad.`;
  return { title, description, canonicalPath };
}

/**
 * Resolve tables hub metadata for `/tables` and subroutes.
 * Canonical path is always the request path (unchanged from Phase 1).
 */
export async function resolveTablesPageMetadata(
  path: string,
): Promise<{ title: string; description: string; canonicalPath: string }> {
  if (path === "/tables") {
    return {
      title: "Football League Tables & Standings | Football Mad",
      description:
        "Live league tables, standings and cup progress for the Premier League, EFL, Scotland, Europe and more.",
      canonicalPath: "/tables",
    };
  }

  if (path === "/tables/cups") {
    return {
      title: "Cup Competitions Tables & Progress | Football Mad",
      description:
        "Cup competition tables, knockout progress and tournament standings on Football Mad.",
      canonicalPath: "/tables/cups",
    };
  }

  if (path === "/tables/europe") {
    return {
      title: "European Competition Tables & Progress | Football Mad",
      description:
        "Champions League, Europa League and Conference League tables and tournament progress on Football Mad.",
      canonicalPath: "/tables/europe",
    };
  }

  const cupsMatch = path.match(/^\/tables\/cups\/([^/]+)(?:\/([^/]+))?$/);
  if (cupsMatch) {
    const compSlug = decodeURIComponent(cupsMatch[1]);
    const seasonSlug = cupsMatch[2] ? decodeURIComponent(cupsMatch[2]) : null;
    const competition = await resolveTablesCompetitionDisplayName(compSlug);
    const seasonDisplay = formatTablesSeasonDisplay(seasonSlug);
    return buildTablesCompetitionMeta(competition, seasonDisplay, path);
  }

  const europeMatch = path.match(/^\/tables\/europe\/([^/]+)(?:\/([^/]+))?$/);
  if (europeMatch) {
    const compSlug = decodeURIComponent(europeMatch[1]);
    const seasonSlug = europeMatch[2] ? decodeURIComponent(europeMatch[2]) : null;
    const competition = await resolveTablesCompetitionDisplayName(compSlug);
    const seasonDisplay = formatTablesSeasonDisplay(seasonSlug);
    return buildTablesCompetitionMeta(competition, seasonDisplay, path);
  }

  const leagueMatch = path.match(/^\/tables\/([^/]+)(?:\/([^/]+))?$/);
  if (leagueMatch) {
    const compSlug = decodeURIComponent(leagueMatch[1]);
    const seasonSlug = leagueMatch[2] ? decodeURIComponent(leagueMatch[2]) : null;
    const competition = await resolveTablesCompetitionDisplayName(compSlug);
    const seasonDisplay = formatTablesSeasonDisplay(seasonSlug);
    return buildTablesCompetitionMeta(competition, seasonDisplay, path);
  }

  return {
    title: "Football League Tables & Standings | Football Mad",
    description:
      "Live league tables, standings and cup progress for the Premier League, EFL, Scotland, Europe and more.",
    canonicalPath: path,
  };
}
