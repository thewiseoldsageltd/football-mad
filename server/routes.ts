import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth";
import { newsFiltersSchema, matches, teams, standingsSnapshots, standingsRows, competitions } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, gte, lte, lt, sql as drizzleSql, asc, desc, ilike, inArray, aliasedTable } from "drizzle-orm";
import { z } from "zod";
import { syncFplAvailability, syncFplTeams, classifyPlayer } from "./fpl-sync";
import { syncTeamMetadata } from "./team-metadata-sync";
import { requireJobSecret } from "./jobs/requireJobSecret";
import { testGoalserveConnection } from "./jobs/test-goalserve";
import { syncGoalserveCompetitions } from "./jobs/sync-goalserve-competitions";
import { syncGoalserveTeams } from "./jobs/sync-goalserve-teams";
import { syncGoalservePlayers } from "./jobs/sync-goalserve-players";
import { upsertGoalservePlayers } from "./jobs/upsert-goalserve-players";
import { previewGoalserveMatches } from "./jobs/preview-goalserve-matches";
import { upsertGoalserveMatches } from "./jobs/upsert-goalserve-matches";
import { previewGoalserveTable } from "./jobs/preview-goalserve-table";
import { upsertGoalserveTable } from "./jobs/upsert-goalserve-table";
import { upsertGoalserveStandings } from "./jobs/upsert-goalserve-standings";

const shareClickSchema = z.object({
  articleId: z.string(),
  platform: z.enum(["whatsapp", "twitter", "facebook", "copy", "native"]),
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<void> {
  // Auth routes
  await setupAuth(app);

  // ========== TEAMS ==========
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:slug", async (req, res) => {
    try {
      const team = await storage.getTeamBySlug(req.params.slug);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  // ========== PLAYERS ==========
  app.get("/api/players/team/:slug", async (req, res) => {
    try {
      const team = await storage.getTeamBySlug(req.params.slug);
      if (!team) {
        return res.json([]);
      }
      const players = await storage.getPlayersByTeam(team.id);
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/players/:slug", async (req, res) => {
    try {
      const player = await storage.getPlayerBySlug(req.params.slug);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      console.error("Error fetching player:", error);
      res.status(500).json({ error: "Failed to fetch player" });
    }
  });

  // ========== NEWS (with URL-driven filters) ==========
  app.get("/api/news", async (req: any, res) => {
    try {
      const parsed = newsFiltersSchema.safeParse(req.query);
      
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid filter parameters",
          details: parsed.error.errors 
        });
      }
      
      const { comp, type, teams: teamsParam, sort, range, breaking } = parsed.data;
      
      if (sort === "for-you" && !req.user) {
        return res.status(401).json({ error: "Authentication required for 'For You' sort" });
      }
      
      let teamSlugs: string[] = [];
      let myTeams = false;
      
      if (teamsParam === "my") {
        if (!req.user) {
          return res.status(401).json({ error: "Authentication required for 'My Teams' filter" });
        }
        const followedTeamIds = await storage.getFollowsByUser(req.user.id);
        const allTeams = await storage.getTeams();
        teamSlugs = allTeams
          .filter(t => followedTeamIds.includes(t.id))
          .map(t => t.slug);
        myTeams = true;
      } else if (teamsParam) {
        teamSlugs = teamsParam.split(",").filter(Boolean);
      }
      
      const result = await storage.getNewsArticles({
        comp,
        type,
        teamSlugs,
        sort,
        range,
        breaking,
      });
      
      result.appliedFilters.myTeams = myTeams;
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // ========== ARTICLES ==========
  app.get("/api/articles", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.getArticles(category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/category/:category", async (req, res) => {
    try {
      const articles = await storage.getArticles(req.params.category);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/team/:slug", async (req, res) => {
    try {
      const articles = await storage.getArticlesByTeam(req.params.slug);
      res.json(articles);
    } catch (error) {
      console.error("Error fetching articles:", error);
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/related/:slug", async (req, res) => {
    try {
      const articles = await storage.getArticles();
      const filtered = articles.filter(a => a.slug !== req.params.slug).slice(0, 6);
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching related articles:", error);
      res.status(500).json({ error: "Failed to fetch related articles" });
    }
  });

  app.get("/api/articles/:slug", async (req, res) => {
    try {
      const article = await storage.getArticleBySlug(req.params.slug);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      await storage.incrementArticleViews(article.id);
      res.json(article);
    } catch (error) {
      console.error("Error fetching article:", error);
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  // ========== MATCHES ==========
  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/upcoming", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      const upcoming = matches.filter(m => new Date(m.kickoffTime) > new Date());
      res.json(upcoming);
    } catch (error) {
      console.error("Error fetching upcoming matches:", error);
      res.status(500).json({ error: "Failed to fetch upcoming matches" });
    }
  });

  app.get("/api/matches/team/:slug", async (req, res) => {
    try {
      const matchesList = await storage.getMatchesByTeam(req.params.slug);
      res.json(matchesList);
    } catch (error) {
      console.error("Error fetching matches:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // ========== MATCHES API (Fixtures, Results, Live) ==========
  // These must be defined BEFORE /api/matches/:slug to avoid slug matching "fixtures", "results", "live"
  
  function formatMatchResponse(match: any, homeTeamData: any, awayTeamData: any) {
    const timeline = match.timeline as any;
    return {
      id: match.id,
      slug: match.slug,
      kickoffTime: match.kickoffTime,
      status: match.status,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      venue: match.venue,
      competition: match.competition,
      goalserveCompetitionId: match.goalserveCompetitionId,
      goalserveMatchId: match.goalserveMatchId,
      goalserveRound: match.goalserveRound || null,
      homeTeam: match.homeTeamId && homeTeamData
        ? { id: homeTeamData.id, name: homeTeamData.name, slug: homeTeamData.slug }
        : { goalserveTeamId: match.homeGoalserveTeamId, nameFromRaw: timeline?.home?.name || "Unknown" },
      awayTeam: match.awayTeamId && awayTeamData
        ? { id: awayTeamData.id, name: awayTeamData.name, slug: awayTeamData.slug }
        : { goalserveTeamId: match.awayGoalserveTeamId, nameFromRaw: timeline?.away?.name || "Unknown" },
    };
  }

  async function fetchTeamMap(teamIds: Set<string>) {
    if (teamIds.size === 0) return new Map();
    const teamsData = await db.select({ id: teams.id, name: teams.name, slug: teams.slug })
      .from(teams)
      .where(drizzleSql`${teams.id} IN (${drizzleSql.join(Array.from(teamIds).map(id => drizzleSql`${id}`), drizzleSql`, `)})`);
    return new Map(teamsData.map(t => [t.id, t]));
  }

  // Status sets for robust matching (case-insensitive)
  const FINISHED_STATUSES = ['finished', 'ft', 'full_time', 'ended', 'final', 'aet', 'pen'];
  const LIVE_STATUSES = ['live', 'inplay', 'in_play', 'ht', 'halftime', 'et', 'extra_time', 'pen', 'penalties', '1h', '2h'];
  
  function isFinishedStatus(status: string | null): boolean {
    if (!status) return false;
    return FINISHED_STATUSES.includes(status.toLowerCase());
  }
  
  function isLiveStatus(status: string | null): boolean {
    if (!status) return false;
    const lower = status.toLowerCase();
    return LIVE_STATUSES.includes(lower) || /^\d+$/.test(status); // numeric minute = live
  }

  // GET /api/matches/fixtures - upcoming matches (not finished) in next N days
  app.get("/api/matches/fixtures", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const competitionId = req.query.competitionId as string;
      const teamId = req.query.teamId as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 200, 200);
      const debug = req.query.debug === "1";

      const now = new Date();
      const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      // Fixtures: kickoff within window AND status is NOT finished (case-insensitive)
      const conditions: any[] = [
        gte(matches.kickoffTime, now),
        lte(matches.kickoffTime, endDate),
        drizzleSql`LOWER(COALESCE(${matches.status}, '')) NOT IN (${drizzleSql.join(FINISHED_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)})`,
      ];

      if (competitionId) {
        conditions.push(eq(matches.goalserveCompetitionId, competitionId));
      }

      if (teamId) {
        conditions.push(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)));
      }

      const results = await db.select()
        .from(matches)
        .where(and(...conditions))
        .orderBy(asc(matches.kickoffTime))
        .limit(limit);

      const teamIds = new Set<string>();
      results.forEach(m => {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      });

      const teamMap = await fetchTeamMap(teamIds);
      const formatted = results.map(m => formatMatchResponse(m, m.homeTeamId ? teamMap.get(m.homeTeamId) : null, m.awayTeamId ? teamMap.get(m.awayTeamId) : null));

      if (debug) {
        // Debug info
        const countFuture = await db.select({ count: drizzleSql<number>`COUNT(*)` })
          .from(matches)
          .where(gte(matches.kickoffTime, now));
        const sampleNext5 = await db.select({ 
          kickoffTime: matches.kickoffTime, 
          status: matches.status, 
          competition: matches.competition 
        })
          .from(matches)
          .orderBy(asc(matches.kickoffTime))
          .limit(5);
        
        return res.json({
          debug: {
            nowServer: now.toISOString(),
            nowUtc: new Date().toISOString(),
            days,
            endDate: endDate.toISOString(),
            countFutureAll: countFuture[0]?.count || 0,
            sampleNext5,
          },
          count: formatted.length,
          matches: formatted,
        });
      }

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });

  // GET /api/matches/results - finished matches in past N days
  app.get("/api/matches/results", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const competitionId = req.query.competitionId as string;
      const teamId = req.query.teamId as string;
      const round = req.query.round as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 200, 200);

      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      // Results: kickoff in past N days AND status is finished (case-insensitive)
      const conditions: any[] = [
        gte(matches.kickoffTime, startDate),
        lte(matches.kickoffTime, now),
        drizzleSql`LOWER(COALESCE(${matches.status}, '')) IN (${drizzleSql.join(FINISHED_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)})`,
      ];

      if (competitionId) {
        conditions.push(eq(matches.goalserveCompetitionId, competitionId));
      }

      if (teamId) {
        conditions.push(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)));
      }

      if (round) {
        conditions.push(eq(matches.goalserveRound, round));
      }

      const results = await db.select()
        .from(matches)
        .where(and(...conditions))
        .orderBy(desc(matches.kickoffTime))
        .limit(limit);

      const teamIds = new Set<string>();
      results.forEach(m => {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      });

      const teamMap = await fetchTeamMap(teamIds);
      const formatted = results.map(m => formatMatchResponse(m, m.homeTeamId ? teamMap.get(m.homeTeamId) : null, m.awayTeamId ? teamMap.get(m.awayTeamId) : null));

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  // GET /api/matches/live - currently live matches (case-insensitive status matching)
  app.get("/api/matches/live", async (req, res) => {
    try {
      const competitionId = req.query.competitionId as string;
      const teamId = req.query.teamId as string;

      // Live: status matches live patterns (case-insensitive)
      const conditions: any[] = [
        drizzleSql`(LOWER(COALESCE(${matches.status}, '')) IN (${drizzleSql.join(LIVE_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)}) OR ${matches.status} ~ '^[0-9]+$')`,
      ];

      if (competitionId) {
        conditions.push(eq(matches.goalserveCompetitionId, competitionId));
      }

      if (teamId) {
        conditions.push(or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)));
      }

      const results = await db.select()
        .from(matches)
        .where(and(...conditions))
        .orderBy(asc(matches.kickoffTime));

      const teamIds = new Set<string>();
      results.forEach(m => {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      });

      const teamMap = await fetchTeamMap(teamIds);
      const formatted = results.map(m => formatMatchResponse(m, m.homeTeamId ? teamMap.get(m.homeTeamId) : null, m.awayTeamId ? teamMap.get(m.awayTeamId) : null));

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching live matches:", error);
      res.status(500).json({ error: "Failed to fetch live matches" });
    }
  });

  // GET /api/matches/rounds - get distinct rounds for a competition
  app.get("/api/matches/rounds", async (req, res) => {
    try {
      const competitionId = req.query.competitionId as string;
      const days = parseInt(req.query.days as string) || 30;

      if (!competitionId) {
        return res.json({ ok: true, competitionId: null, days, rounds: [] });
      }

      const now = new Date();
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const result = await db
        .selectDistinct({ round: matches.goalserveRound })
        .from(matches)
        .where(
          and(
            eq(matches.goalserveCompetitionId, competitionId),
            gte(matches.kickoffTime, startDate),
            drizzleSql`${matches.goalserveRound} IS NOT NULL`
          )
        );

      const rounds = result
        .map(r => r.round)
        .filter((r): r is string => r !== null)
        .sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.localeCompare(b);
        });

      res.json({ ok: true, competitionId, days, rounds });
    } catch (error) {
      console.error("Error fetching rounds:", error);
      res.status(500).json({ ok: false, error: "Failed to fetch rounds" });
    }
  });

  // ========== COMPETITION PRIORITY SYSTEM ==========
  // Tier 0: UEFA comps (1-3) + England leagues/cups (4-10)
  // Tier 1: Big 5 Europe (200-299)
  // Tier 2: Scotland (300-399)
  // Default: Unknown leagues (1000)
  // Demoted: Youth/reserve/academy/friendly (9000)

  // Youth/reserve patterns - these are ALWAYS demoted to 9000
  const YOUTH_PATTERNS = [
    "u21", "u23", "u19", "u18", "u17", "u16",
    "youth", "reserve", "reserves", "academy",
    "premier league 2", "premier league cup", "friendly", "friendlies"
  ];

  function isYouthOrReserveCompetition(competitionLower: string): boolean {
    return YOUTH_PATTERNS.some(pattern => competitionLower.includes(pattern));
  }

  // Helper to detect UEFA competition - MUST contain "UEFA" prefix explicitly
  function getUefaCompetition(competition: string | null): "ucl" | "uel" | "uecl" | null {
    if (!competition) return null;
    const name = competition.toLowerCase();
    // Must explicitly contain "UEFA" to avoid CAF/AFC/CONCACAF Champions League
    if (!name.includes("uefa")) return null;
    if (name.includes("uefa champions league")) return "ucl";
    if (name.includes("uefa europa league") && !name.includes("conference")) return "uel";
    if (name.includes("uefa europa conference league")) return "uecl";
    return null;
  }

  // STRICT tier map with EXACT key matching: "countryNorm|leagueNorm" => priority
  // NEVER default missing country to "England" - use "unknown" instead
  const STRICT_PRIORITY_MAP: Record<string, number> = {
    // UEFA (Tier 0, priority 1-3) - handled separately by getUefaCompetition
    "uefa|champions league": 1,
    "uefa|europa league": 2,
    "uefa|conference league": 3,
    
    // England (Tier 0, priority 4-10)
    "england|premier league": 4,
    "england|championship": 5,
    "england|league one": 6,
    "england|league two": 7,
    "england|national league": 8,
    "england|fa cup": 9,
    "england|efl cup": 10,
    "england|carabao cup": 10,
    "england|league cup": 10,
    
    // Big 5 Europe (Tier 1, priority 200-299)
    "spain|la liga": 200,
    "spain|laliga": 200,
    "italy|serie a": 201,
    "germany|bundesliga": 202,
    "france|ligue 1": 203,
    "netherlands|eredivisie": 204,
    "holland|eredivisie": 204,
    
    // Scotland (Tier 2, priority 300-399)
    "scotland|scottish premiership": 300,
    "scotland|premiership": 300,
    "scotland|scottish championship": 301,
    "scotland|championship": 301,
    "scotland|scottish cup": 302,
  };

  // Ambiguous league names that MUST have a country to get tier priority
  // If countryNorm="unknown" AND leagueNorm is in this set, force priority to 9000
  const AMBIGUOUS_LEAGUES = new Set([
    "premier league", "championship", "league one", "league two",
    "premiership", "serie a", "ligue 1", "ligue 2", "national league"
  ]);

  // Parse competition string into normalized parts
  // Handles: "Name (Country) [ID]", "Country: Name", "UEFA Europa League"
  interface ParsedCompetition {
    countryNorm: string;      // lowercase, trimmed, or "unknown"
    leagueNorm: string;       // lowercase, trimmed
    competitionDisplayName: string;
    leagueKey: string;        // "countryNorm|leagueNorm" used for priority lookup
  }

  function parseCompetition(competition: string | null): ParsedCompetition {
    if (!competition) {
      return { countryNorm: "unknown", leagueNorm: "", competitionDisplayName: "", leagueKey: "unknown|" };
    }
    
    let country = "";
    let leagueName = competition;
    const lowerComp = competition.toLowerCase();
    
    // Pattern 1 (FIRST): "UEFA Europa League" - treat UEFA as the country (highest priority)
    // This MUST come before parentheses check to handle "UEFA Europa League (Eurocups) [1007]"
    if (lowerComp.startsWith("uefa ")) {
      country = "uefa";
      leagueName = competition.substring(5).trim(); // Remove "UEFA " prefix
    }
    
    // Pattern 2: "Name (Country) [ID]" - extract country from parentheses (only if UEFA not detected)
    if (!country) {
      const parenMatch = competition.match(/\(([^)]+)\)/);
      if (parenMatch) {
        country = parenMatch[1].trim();
      }
    }
    
    // Pattern 3: "Country: League" format
    const colonMatch = competition.match(/^([^:]+):\s*(.+)$/);
    if (colonMatch && !country) {
      country = colonMatch[1].trim();
      leagueName = colonMatch[2].trim();
    }
    
    // Clean league name - remove bracket IDs and parenthetical country
    leagueName = leagueName.replace(/\s*\[\d+\]$/, "");
    leagueName = leagueName.replace(/\s*\([^)]+\)$/, "");
    // Remove country prefix if not already handled
    if (!colonMatch && !lowerComp.startsWith("uefa ")) {
      leagueName = leagueName.replace(/^[^:]+:\s*/, "");
    }
    
    // Normalize to lowercase and trim
    const countryNorm = country ? country.toLowerCase().trim() : "unknown";
    const leagueNorm = leagueName.toLowerCase().trim();
    
    // Build display name (original competition string cleaned up)
    const competitionDisplayName = competition.replace(/\s*\[\d+\]$/, "").trim();
    
    // Build the lookup key
    const leagueKey = `${countryNorm}|${leagueNorm}`;
    
    return { countryNorm, leagueNorm, competitionDisplayName, leagueKey };
  }

  // Get priority for a competition string
  // Returns: 1-10 (UEFA+England Tier 0), 200-299 (Big 5 Tier 1), 300-399 (Scotland Tier 2),
  //          1000 (unknown), 9000 (youth/reserve/ambiguous-unknown)
  interface PriorityResult {
    priority: number;
    parsed: ParsedCompetition;
  }

  function getPriorityWithDetails(competition: string | null, euroNightsOverride: boolean = false): PriorityResult {
    const parsed = parseCompetition(competition);
    
    if (!competition) {
      return { priority: 1000, parsed };
    }
    
    const competitionLower = competition.toLowerCase();
    
    // FIRST: Check for youth/reserve - always demote to 9000
    if (isYouthOrReserveCompetition(competitionLower)) {
      return { priority: 9000, parsed };
    }
    
    // UEFA competitions - check first, always top priority
    const uefaComp = getUefaCompetition(competition);
    if (uefaComp) {
      if (uefaComp === "ucl") return { priority: 1, parsed };
      if (uefaComp === "uel") return { priority: 2, parsed };
      if (uefaComp === "uecl") return { priority: 3, parsed };
    }
    
    // If country is unknown AND league is ambiguous, force to 9000 (bottom)
    // This prevents "Championship (Indonesia)" from getting Tier 0
    if (parsed.countryNorm === "unknown" && AMBIGUOUS_LEAGUES.has(parsed.leagueNorm)) {
      return { priority: 9000, parsed };
    }
    
    // Look up in strict map using exact leagueKey
    if (STRICT_PRIORITY_MAP[parsed.leagueKey] !== undefined) {
      let basePriority = STRICT_PRIORITY_MAP[parsed.leagueKey];
      // Apply Euro nights offset for England leagues (priority 4-10)
      if (euroNightsOverride && basePriority >= 4 && basePriority <= 10) {
        basePriority = basePriority + 6; // Shift England down when UEFA playing
      }
      return { priority: basePriority, parsed };
    }
    
    // Try partial matches for non-ambiguous leagues only
    // e.g. "scottish premiership" when we have "scotland|premiership"
    if (parsed.countryNorm !== "unknown") {
      for (const [key, priority] of Object.entries(STRICT_PRIORITY_MAP)) {
        const [keyCountry, keyLeague] = key.split("|");
        if (keyCountry === parsed.countryNorm && parsed.leagueNorm.includes(keyLeague)) {
          let adjustedPriority = priority;
          if (euroNightsOverride && priority >= 4 && priority <= 10) {
            adjustedPriority = priority + 6;
          }
          return { priority: adjustedPriority, parsed };
        }
      }
    }
    
    // Default for other competitions (sorted alphabetically within this tier)
    return { priority: 1000, parsed };
  }

  // Simple priority getter for backward compatibility
  function getCompetitionPriority(competition: string | null, euroNightsOverride: boolean = false): number {
    return getPriorityWithDetails(competition, euroNightsOverride).priority;
  }

  // Helper: parse YYYY-MM-DD to UTC midnight timestamp
  function ymdToUtcMs(ymd: string): number | null {
    const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return Date.UTC(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
  }

  // Helper: map date to Goalserve feed name
  function goalserveFeedForDate(effectiveDateYmd: string): string | null {
    const effectiveMs = ymdToUtcMs(effectiveDateYmd);
    if (!effectiveMs) return null;
    const now = new Date();
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const diffDays = Math.round((effectiveMs - todayMs) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) return "soccernew/home";
    if (diffDays === -1) return "soccernew/d-1";
    if (diffDays >= 1 && diffDays <= 7) return `soccernew/d${diffDays}`;
    return null; // Outside supported range
  }

  // GET /api/matches/day - date-driven matches endpoint
  // Query params: date=YYYY-MM-DD (required), status=all|live|scheduled|fulltime, competitionId, sort=kickoff|competition, debug=1, refresh=1
  app.get("/api/matches/day", async (req, res) => {
    try {
      const dateStr = req.query.date as string;
      const status = (req.query.status as string) || "all";
      const competitionId = req.query.competitionId as string;
      const sortMode = (req.query.sort as string) || "competition"; // competition (default) or kickoff
      const debug = req.query.debug === "1";

      // Default to today in UTC if no date provided
      const effectiveDate = (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) 
        ? dateStr 
        : new Date().toISOString().split("T")[0];

      // Parse date range: start of day to start of next day (exclusive upper bound)
      const start = new Date(`${effectiveDate}T00:00:00.000Z`);
      const nextDate = new Date(start);
      nextDate.setUTCDate(nextDate.getUTCDate() + 1);

      // Build conditions using kickoffTime >= start AND kickoffTime < nextDay
      const conditions: any[] = [
        gte(matches.kickoffTime, start),
        drizzleSql`${matches.kickoffTime} < ${nextDate}`,
      ];

      // Status filtering (case-insensitive)
      if (status === "fulltime") {
        conditions.push(
          drizzleSql`LOWER(COALESCE(${matches.status}, '')) IN (${drizzleSql.join(FINISHED_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)})`
        );
      } else if (status === "live") {
        conditions.push(
          drizzleSql`(LOWER(COALESCE(${matches.status}, '')) IN (${drizzleSql.join(LIVE_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)}) OR ${matches.status} ~ '^[0-9]+$')`
        );
      } else if (status === "scheduled") {
        // Scheduled = not live and not finished
        conditions.push(
          drizzleSql`LOWER(COALESCE(${matches.status}, '')) NOT IN (${drizzleSql.join(FINISHED_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)})`
        );
        conditions.push(
          drizzleSql`NOT (LOWER(COALESCE(${matches.status}, '')) IN (${drizzleSql.join(LIVE_STATUSES.map(s => drizzleSql`${s}`), drizzleSql`, `)}) OR ${matches.status} ~ '^[0-9]+$')`
        );
      }
      // status === "all" means no status filter

      if (competitionId) {
        conditions.push(eq(matches.goalserveCompetitionId, competitionId));
      }

      const refresh = req.query.refresh === "1";

      let results = await db.select()
        .from(matches)
        .where(and(...conditions))
        .orderBy(asc(matches.kickoffTime));

      // If no results (or refresh requested), try Goalserve sync
      if (refresh || results.length === 0) {
        const feed = goalserveFeedForDate(effectiveDate);
        if (feed) {
          try {
            await upsertGoalserveMatches(feed);
            // Re-run query after sync
            results = await db.select()
              .from(matches)
              .where(and(...conditions))
              .orderBy(asc(matches.kickoffTime));
          } catch (syncErr) {
            console.error(`Goalserve sync failed for feed ${feed}:`, syncErr);
            // Continue with existing results (may be empty)
          }
        }
      }

      const teamIds = new Set<string>();
      results.forEach(m => {
        if (m.homeTeamId) teamIds.add(m.homeTeamId);
        if (m.awayTeamId) teamIds.add(m.awayTeamId);
      });

      const teamMap = await fetchTeamMap(teamIds);
      const formatted = results.map(m => formatMatchResponse(m, m.homeTeamId ? teamMap.get(m.homeTeamId) : null, m.awayTeamId ? teamMap.get(m.awayTeamId) : null));

      // Count UEFA matches for Euro nights override detection
      const uefaCounts = { ucl: 0, uel: 0, uecl: 0 };
      formatted.forEach(m => {
        const uefaComp = getUefaCompetition(m.competition);
        if (uefaComp) uefaCounts[uefaComp]++;
      });
      const hasUefa = uefaCounts.ucl > 0 || uefaCounts.uel > 0 || uefaCounts.uecl > 0;

      // Sort based on sortMode
      if (sortMode === "kickoff") {
        // sort=kickoff: kickoffTime → priorityRank → competitionName
        formatted.sort((a, b) => {
          const timeA = new Date(a.kickoffTime).getTime();
          const timeB = new Date(b.kickoffTime).getTime();
          if (timeA !== timeB) return timeA - timeB;
          const priorityA = getCompetitionPriority(a.competition, hasUefa);
          const priorityB = getCompetitionPriority(b.competition, hasUefa);
          if (priorityA !== priorityB) return priorityA - priorityB;
          return (a.competition || "").localeCompare(b.competition || "");
        });
      } else {
        // sort=competition (default): priorityRank → competitionName → kickoffTime
        formatted.sort((a, b) => {
          const priorityA = getCompetitionPriority(a.competition, hasUefa);
          const priorityB = getCompetitionPriority(b.competition, hasUefa);
          if (priorityA !== priorityB) return priorityA - priorityB;
          const compCompare = (a.competition || "").localeCompare(b.competition || "");
          if (compCompare !== 0) return compCompare;
          const timeA = new Date(a.kickoffTime).getTime();
          const timeB = new Date(b.kickoffTime).getTime();
          return timeA - timeB;
        });
      }

      if (debug) {
        // Build topSamples: first 50 matches with full priority details
        const topSamples = formatted.slice(0, 50).map((m, idx) => {
          const { priority, parsed } = getPriorityWithDetails(m.competition, hasUefa);
          const kickoffTime = new Date(m.kickoffTime).getTime();
          return {
            index: idx,
            id: m.id,
            kickoffTime: m.kickoffTime,
            status: m.status,
            competition: m.competition,
            goalserveCompetitionId: m.goalserveCompetitionId,
            parsedCountry: parsed.countryNorm,
            parsedLeague: parsed.leagueNorm,
            leagueKey: parsed.leagueKey,
            priority,
            sortKey: sortMode === "kickoff" 
              ? [kickoffTime, priority, parsed.competitionDisplayName]
              : [priority, parsed.competitionDisplayName, kickoffTime],
          };
        });

        // Build leagueSummary: counts per leagueKey (top 30)
        const leagueCounter: Record<string, { count: number; priority: number }> = {};
        formatted.forEach(m => {
          const { priority, parsed } = getPriorityWithDetails(m.competition, hasUefa);
          const key = parsed.leagueKey;
          if (!leagueCounter[key]) {
            leagueCounter[key] = { count: 0, priority };
          }
          leagueCounter[key].count++;
        });
        const leagueSummary = Object.entries(leagueCounter)
          .map(([key, val]) => ({ leagueKey: key, count: val.count, priority: val.priority }))
          .sort((a, b) => a.priority - b.priority || b.count - a.count)
          .slice(0, 30);

        return res.json({
          matches: formatted,
          debug: {
            date: effectiveDate,
            start: start.toISOString(),
            end: nextDate.toISOString(),
            status,
            competitionId: competitionId || null,
            sort: sortMode,
            hasUefa,
            uefaCounts,
            returnedCount: formatted.length,
            topSamples,
            leagueSummary,
          },
        });
      }

      res.json(formatted);
    } catch (error) {
      console.error("Error fetching matches by day:", error);
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/:slug", async (req, res) => {
    try {
      const match = await storage.getMatchBySlug(req.params.slug);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      console.error("Error fetching match:", error);
      res.status(500).json({ error: "Failed to fetch match" });
    }
  });

  // ========== TRANSFERS ==========
  app.get("/api/transfers", async (req, res) => {
    try {
      const transfers = await storage.getTransfers();
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  app.get("/api/transfers/latest", async (req, res) => {
    try {
      const transfers = await storage.getTransfers();
      res.json(transfers.slice(0, 10));
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  app.get("/api/transfers/team/:slug", async (req, res) => {
    try {
      const transfers = await storage.getTransfersByTeam(req.params.slug);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  // ========== INJURIES ==========
  app.get("/api/injuries", async (req, res) => {
    try {
      const injuries = await storage.getInjuries();
      res.json(injuries);
    } catch (error) {
      console.error("Error fetching injuries:", error);
      res.status(500).json({ error: "Failed to fetch injuries" });
    }
  });

  app.get("/api/injuries/team/:slug", async (req, res) => {
    try {
      const injuries = await storage.getInjuriesByTeam(req.params.slug);
      res.json(injuries);
    } catch (error) {
      console.error("Error fetching injuries:", error);
      res.status(500).json({ error: "Failed to fetch injuries" });
    }
  });

  // ========== FOLLOWS ==========
  app.get("/api/follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const teamIds = await storage.getFollowsByUser(userId);
      res.json(teamIds);
    } catch (error) {
      console.error("Error fetching follows:", error);
      res.status(500).json({ error: "Failed to fetch follows" });
    }
  });

  app.get("/api/follows/teams", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const teams = await storage.getFollowedTeams(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching followed teams:", error);
      res.status(500).json({ error: "Failed to fetch followed teams" });
    }
  });

  app.post("/api/follows", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { teamId } = req.body;
      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }
      const follow = await storage.followTeam(userId, teamId);
      res.json(follow);
    } catch (error) {
      console.error("Error following team:", error);
      res.status(500).json({ error: "Failed to follow team" });
    }
  });

  app.delete("/api/follows/:teamId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.unfollowTeam(userId, req.params.teamId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfollowing team:", error);
      res.status(500).json({ error: "Failed to unfollow team" });
    }
  });

  // ========== POSTS ==========
  app.get("/api/posts", async (req, res) => {
    try {
      const posts = await storage.getPosts();
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.get("/api/posts/team/:slug", async (req, res) => {
    try {
      const posts = await storage.getPostsByTeam(req.params.slug);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { content, teamId, imageUrl } = req.body;
      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }
      const post = await storage.createPost({
        userId: user.id,
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous",
        userImage: user.profileImageUrl,
        content,
        teamId: teamId || null,
        imageUrl: imageUrl || null,
      });
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.post("/api/posts/:id/like", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.likePost(req.params.id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error liking post:", error);
      res.status(500).json({ error: "Failed to like post" });
    }
  });

  // ========== COMMENTS ==========
  app.get("/api/comments/post/:postId", async (req, res) => {
    try {
      const comments = await storage.getCommentsByPost(req.params.postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  app.post("/api/comments", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { content, postId, articleId, matchId } = req.body;
      if (!content) {
        return res.status(400).json({ error: "content is required" });
      }
      const comment = await storage.createComment({
        userId: user.id,
        userName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous",
        userImage: user.profileImageUrl,
        content,
        postId: postId || null,
        articleId: articleId || null,
        matchId: matchId || null,
      });
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // ========== PRODUCTS ==========
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:slug", async (req, res) => {
    try {
      const product = await storage.getProductBySlug(req.params.slug);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // ========== ORDERS ==========
  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await storage.getOrdersByUser(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const { items, subtotal, total, shippingAddress } = req.body;
      const order = await storage.createOrder({
        userId: user.id,
        userEmail: user.email,
        items,
        subtotal,
        total,
        shippingAddress,
        status: "pending",
      });
      res.json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  // ========== SUBSCRIBERS ==========
  app.post("/api/subscribers", async (req, res) => {
    try {
      const { email, firstName, tags } = req.body;
      if (!email) {
        return res.status(400).json({ error: "email is required" });
      }
      const subscriber = await storage.createSubscriber({
        email,
        firstName: firstName || null,
        tags: tags || [],
      });
      res.json(subscriber);
    } catch (error) {
      console.error("Error creating subscriber:", error);
      res.status(500).json({ error: "Failed to subscribe" });
    }
  });

  // ========== SHARE ANALYTICS ==========
  app.post("/api/share-click", async (req: any, res) => {
    try {
      const result = shareClickSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request", details: result.error.flatten() });
      }
      const { articleId, platform } = result.data;
      const userId = req.user?.id;
      const userAgent = req.headers["user-agent"];
      await storage.trackShareClick(articleId, platform, userId, userAgent);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking share click:", error);
      res.status(500).json({ error: "Failed to track share" });
    }
  });

  // ========== FPL SYNC (Server Jobs) ==========
  app.post("/api/jobs/sync-fpl-teams", async (req, res) => {
    try {
      const syncSecret = req.headers["x-sync-secret"];
      const expectedSecret = process.env.FPL_SYNC_SECRET;
      
      if (!expectedSecret) {
        console.warn("FPL_SYNC_SECRET not configured");
        return res.status(500).json({ error: "Sync not configured" });
      }
      
      if (!syncSecret || syncSecret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log("[FPL Team Sync] Starting team sync...");
      const result = await syncFplTeams();
      console.log(`[FPL Team Sync] Complete: ${result.upserted} upserted, ${result.demoted} demoted`);
      
      if (result.errors.length > 0) {
        console.warn("[FPL Team Sync] Errors:", result.errors.slice(0, 5));
      }
      
      res.json({ ok: true, ...result });
    } catch (error) {
      console.error("[FPL Team Sync] Error:", error);
      res.status(500).json({ error: "Team sync failed" });
    }
  });

  app.post("/api/jobs/sync-fpl-availability", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const syncSecret = req.headers["x-sync-secret"];
      const expectedSecret = process.env.FPL_SYNC_SECRET;
      
      if (!expectedSecret) {
        console.warn("FPL_SYNC_SECRET not configured");
        return res.status(500).json({ error: "Sync not configured" });
      }
      
      const isAuthorized = (authHeader && authHeader === `Bearer ${expectedSecret}`) || 
                           (syncSecret && syncSecret === expectedSecret);
      
      if (!isAuthorized) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log("[FPL Sync] Starting team sync first...");
      const teamResult = await syncFplTeams();
      console.log(`[FPL Team Sync] Complete: ${teamResult.upserted} upserted, ${teamResult.demoted} demoted`);
      
      console.log("[FPL Sync] Starting availability sync...");
      const availabilityResult = await syncFplAvailability();
      console.log(`[FPL Availability Sync] Complete: ${availabilityResult.updated} updated, ${availabilityResult.skipped} skipped`);
      
      const allErrors = [...teamResult.errors, ...availabilityResult.errors];
      if (allErrors.length > 0) {
        console.warn("[FPL Sync] Errors:", allErrors.slice(0, 5));
      }
      
      res.json({ 
        ok: true, 
        teams: { upserted: teamResult.upserted, demoted: teamResult.demoted, errors: teamResult.errors },
        availability: { updated: availabilityResult.updated, skipped: availabilityResult.skipped, errors: availabilityResult.errors },
      });
    } catch (error) {
      console.error("[FPL Sync] Error:", error);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // ========== TEAM METADATA SYNC (Wikidata) ==========
  app.post("/api/jobs/sync-team-metadata", async (req, res) => {
    try {
      const syncSecret = req.headers["x-sync-secret"];
      const expectedSecret = process.env.TEAM_SYNC_SECRET;
      
      if (!expectedSecret) {
        console.warn("TEAM_SYNC_SECRET not configured");
        return res.status(500).json({ error: "Sync not configured" });
      }
      
      if (!syncSecret || syncSecret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      console.log("[Team Metadata Sync] Starting sync from Wikidata...");
      const result = await syncTeamMetadata();
      
      console.log(`[Team Metadata Sync] Complete: ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors`);
      
      if (result.errors.length > 0) {
        console.warn("[Team Metadata Sync] Errors:", result.errors.slice(0, 5));
      }
      
      res.json({ 
        ok: true, 
        updated: result.updated, 
        skipped: result.skipped, 
        errors: result.errors,
        details: result.details,
      });
    } catch (error) {
      console.error("[Team Metadata Sync] Error:", error);
      res.status(500).json({ error: "Sync failed" });
    }
  });

  // ========== GOALSERVE SYNC (Server Jobs) ==========
  app.post("/api/jobs/sync-goalserve", requireJobSecret("GOALSERVE_SYNC_SECRET"), async (req, res) => {
    res.json({ ok: true, message: "Goalserve sync stub" });
  });

  // ========== PA MEDIA INGEST (Server Jobs) ==========
  app.post("/api/jobs/ingest-pamedia", requireJobSecret("PAMEDIA_INGEST_SECRET"), async (req, res) => {
    res.json({ ok: true, message: "PA Media ingest stub" });
  });

  // ========== GOALSERVE CONNECTION TEST ==========
  app.post("/api/jobs/test-goalserve", requireJobSecret("GOALSERVE_SYNC_SECRET"), async (req, res) => {
    const result = await testGoalserveConnection();
    res.json(result);
  });

  // ========== GOALSERVE COMPETITIONS SYNC ==========
  app.post("/api/jobs/sync-goalserve-competitions", requireJobSecret("GOALSERVE_SYNC_SECRET"), async (req, res) => {
    const result = await syncGoalserveCompetitions();
    res.json(result);
  });

  // ========== GOALSERVE TEAMS SYNC ==========
  app.post(
    "/api/jobs/sync-goalserve-teams",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = String(req.query.leagueId || "1204");
      const result = await syncGoalserveTeams(leagueId);
      res.json(result);
    }
  );

  // ========== GOALSERVE PLAYERS SYNC ==========
  app.post(
    "/api/jobs/sync-goalserve-players",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = String(req.query.leagueId || "1204");
      const result = await syncGoalservePlayers(leagueId);
      res.json(result);
    }
  );

  // ========== GOALSERVE PLAYERS UPSERT ==========
  app.post(
    "/api/jobs/upsert-goalserve-players",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = String(req.query.leagueId || "1204");
      const result = await upsertGoalservePlayers(leagueId);
      res.json(result);
    }
  );

  // ========== GOALSERVE MATCHES PREVIEW (DRY RUN) ==========
  app.post(
    "/api/jobs/preview-goalserve-matches",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const feed = String(req.query.feed || "soccernew/home");
      const result = await previewGoalserveMatches(feed);
      res.json(result);
    }
  );

  // ========== DEBUG: GOALSERVE MATCHES UPSERT (no auth, for dev) ==========
  app.get("/api/debug/upsert-goalserve-matches", async (req, res) => {
    try {
      const feed = String(req.query.feed || "soccernew/home");
      const result = await upsertGoalserveMatches(feed);
      res.json(result);
    } catch (error) {
      console.error("Debug upsert-goalserve-matches error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ========== DEBUG: Team Anomaly Investigation ==========
  app.post(
    "/api/jobs/debug-team-anomaly",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      try {
        const query = String(req.query.query || "");
        if (!query) {
          return res.status(400).json({ error: "Missing query parameter" });
        }

        const teamsLike = await db
          .select({
            id: teams.id,
            name: teams.name,
            slug: teams.slug,
            goalserveTeamId: teams.goalserveTeamId,
            league: teams.league,
            createdAt: teams.createdAt,
          })
          .from(teams)
          .where(ilike(teams.name, `%${query}%`));

        const teamIds = teamsLike.map(t => t.id);

        const homeTeam = aliasedTable(teams, "homeTeam");
        const awayTeam = aliasedTable(teams, "awayTeam");

        const matchesLike = await db
          .select({
            id: matches.id,
            slug: matches.slug,
            kickoffTime: matches.kickoffTime,
            status: matches.status,
            competition: matches.competition,
            goalserveCompetitionId: matches.goalserveCompetitionId,
            homeTeamId: matches.homeTeamId,
            awayTeamId: matches.awayTeamId,
            homeScore: matches.homeScore,
            awayScore: matches.awayScore,
            homeTeamName: homeTeam.name,
            awayTeamName: awayTeam.name,
          })
          .from(matches)
          .leftJoin(homeTeam, eq(matches.homeTeamId, homeTeam.id))
          .leftJoin(awayTeam, eq(matches.awayTeamId, awayTeam.id))
          .where(
            teamIds.length > 0
              ? or(
                  inArray(matches.homeTeamId, teamIds),
                  inArray(matches.awayTeamId, teamIds)
                )
              : drizzleSql`false`
          )
          .orderBy(desc(matches.kickoffTime))
          .limit(50);

        res.json({ teamsLike, matchesLike });
      } catch (error) {
        console.error("Debug team-anomaly error:", error);
        res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  );

  // ========== MERGE DUPLICATE TEAMS ==========
  app.post(
    "/api/jobs/merge-teams",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      try {
        const { keepTeamId, removeTeamId, deleteRemoved = true } = req.body as {
          keepTeamId: string;
          removeTeamId: string;
          deleteRemoved?: boolean;
        };

        if (!keepTeamId || !removeTeamId) {
          return res.status(400).json({ error: "Missing keepTeamId or removeTeamId" });
        }

        if (keepTeamId === removeTeamId) {
          return res.status(400).json({ error: "keepTeamId and removeTeamId cannot be the same" });
        }

        // ===== PREFLIGHT: Load teams and check for conflicts BEFORE transaction =====
        const [keepTeam] = await db.select().from(teams).where(eq(teams.id, keepTeamId));
        const [removeTeam] = await db.select().from(teams).where(eq(teams.id, removeTeamId));

        if (!keepTeam) {
          return res.status(404).json({ error: `keepTeam not found: ${keepTeamId}` });
        }
        if (!removeTeam) {
          return res.status(404).json({ error: `removeTeam not found: ${removeTeamId}` });
        }

        // Determine if we need to transfer goalserveTeamId
        const needsGoalserveIdTransfer = (!keepTeam.goalserveTeamId || keepTeam.goalserveTeamId === "") && removeTeam.goalserveTeamId;
        const desiredGoalserveTeamId = needsGoalserveIdTransfer ? removeTeam.goalserveTeamId : keepTeam.goalserveTeamId;

        // Check for conflicting team if we have a goalserveTeamId to work with
        if (desiredGoalserveTeamId) {
          const [conflictingTeam] = await db.select({
            id: teams.id,
            name: teams.name,
            slug: teams.slug,
            goalserveTeamId: teams.goalserveTeamId,
          })
            .from(teams)
            .where(and(
              eq(teams.goalserveTeamId, desiredGoalserveTeamId),
              drizzleSql`${teams.id} NOT IN (${keepTeamId}, ${removeTeamId})`
            ));

          if (conflictingTeam) {
            return res.status(409).json({
              error: "goalserveTeamId already in use by another team",
              goalserveTeamId: desiredGoalserveTeamId,
              conflictingTeam: {
                id: conflictingTeam.id,
                name: conflictingTeam.name,
                slug: conflictingTeam.slug,
                goalserveTeamId: conflictingTeam.goalserveTeamId,
              },
            });
          }
        }

        // ===== TRANSACTION: All updates in safe order, no try/catch inside =====
        const result = await db.transaction(async (tx) => {
          let updatedKeepGoalserveId = false;

          // a) Transfer goalserveTeamId if needed: clear removeTeam first, then set keepTeam
          if (needsGoalserveIdTransfer && desiredGoalserveTeamId) {
            await tx.update(teams)
              .set({ goalserveTeamId: null })
              .where(eq(teams.id, removeTeamId));

            await tx.update(teams)
              .set({ goalserveTeamId: desiredGoalserveTeamId })
              .where(eq(teams.id, keepTeamId));
            updatedKeepGoalserveId = true;
          }

          // b) Update matches: move homeTeamId and awayTeamId from removeTeam to keepTeam
          const homeResult = await tx.update(matches)
            .set({ homeTeamId: keepTeamId })
            .where(eq(matches.homeTeamId, removeTeamId));
          const movedHomeCount = homeResult.rowCount || 0;

          const awayResult = await tx.update(matches)
            .set({ awayTeamId: keepTeamId })
            .where(eq(matches.awayTeamId, removeTeamId));
          const movedAwayCount = awayResult.rowCount || 0;

          // c) Delete or deprecate the remove team
          let removedDeleted = false;
          if (deleteRemoved) {
            await tx.delete(teams).where(eq(teams.id, removeTeamId));
            removedDeleted = true;
          }

          return {
            ok: true,
            keepTeamId,
            removeTeamId,
            movedHomeCount,
            movedAwayCount,
            updatedKeepGoalserveId,
            removedDeleted,
          };
        });

        res.json(result);
      } catch (error: any) {
        console.error("Merge teams error:", error);
        // Clean error message - never leak "current transaction is aborted"
        const message = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ error: message });
      }
    }
  );

  // ========== GOALSERVE MATCHES UPSERT ==========
  app.post(
    "/api/jobs/upsert-goalserve-matches",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const feed = String(req.query.feed || "soccernew/home");
      const result = await upsertGoalserveMatches(feed);
      res.json(result);
    }
  );

  // Multi-feed ingestion for future fixtures (d-1 through d7)
  app.post(
    "/api/jobs/upsert-goalserve-fixtures",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const feeds = [
        "soccernew/home",     // Today snapshot
        "soccernew/d-1",      // Yesterday (results)
        "soccernew/d1",       // Tomorrow
        "soccernew/d2",       // Day after tomorrow
        "soccernew/d3",
        "soccernew/d4",
        "soccernew/d5",
        "soccernew/d6",
        "soccernew/d7",       // 7 days ahead
      ];
      
      const results = [];
      let totalInserted = 0;
      let totalUpdated = 0;
      let totalFtWithScores = 0;
      let totalFtMissingScores = 0;
      
      for (const feed of feeds) {
        const result = await upsertGoalserveMatches(feed);
        results.push({
          feed,
          ok: result.ok,
          inserted: result.inserted,
          updated: result.updated,
          ftWithScores: result.ftWithScores,
          ftMissingScores: result.ftMissingScores,
          error: result.error,
        });
        totalInserted += result.inserted;
        totalUpdated += result.updated;
        totalFtWithScores += result.ftWithScores;
        totalFtMissingScores += result.ftMissingScores;
      }
      
      res.json({
        ok: results.every(r => r.ok),
        totalFeeds: feeds.length,
        totalInserted,
        totalUpdated,
        totalFtWithScores,
        totalFtMissingScores,
        feeds: results,
      });
    }
  );

  // ========== GOALSERVE TABLE PREVIEW (DRY RUN) ==========
  app.post(
    "/api/jobs/preview-goalserve-table",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    previewGoalserveTable
  );

  // ========== GOALSERVE TABLE UPSERT ==========
  app.post(
    "/api/jobs/upsert-goalserve-table",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = req.query.leagueId as string;
      if (!leagueId) {
        return res.status(400).json({ ok: false, error: "leagueId query param required" });
      }
      const result = await upsertGoalserveTable(leagueId);
      res.json(result);
    }
  );

  // ========== DEBUG GOALSERVE STANDINGS ==========
  app.post(
    "/api/jobs/debug-goalserve-standings",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = req.query.leagueId as string;
      const season = req.query.season as string | undefined;

      if (!leagueId) {
        return res.status(400).json({ error: "leagueId query param required" });
      }

      try {
        const GOALSERVE_FEED_KEY = process.env.GOALSERVE_FEED_KEY || "";
        let url = `https://www.goalserve.com/getfeed/${GOALSERVE_FEED_KEY}/standings/${leagueId}.xml?json=true`;
        if (season) {
          url += `&season=${encodeURIComponent(season)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
          return res.json({ ok: false, error: `Goalserve API returned ${response.status}`, leagueId });
        }

        const data = await response.json();
        const standings = data?.standings;
        if (!standings) {
          return res.json({ ok: false, error: "No standings object in response", leagueId });
        }

        const tournament = standings.tournament;
        if (!tournament) {
          return res.json({ ok: false, error: "No tournament object in response", leagueId });
        }

        let teamRows: { id: string; name: string; position: string }[] = [];
        if (Array.isArray(tournament.team)) {
          teamRows = tournament.team;
        } else if (tournament.team) {
          teamRows = [tournament.team];
        }

        const goalserveTeamIds = teamRows.map((t) => t.id);
        const existingTeams = await db
          .select({ goalserveTeamId: teams.goalserveTeamId })
          .from(teams)
          .where(inArray(teams.goalserveTeamId, goalserveTeamIds));

        const existingSet = new Set(existingTeams.map((t) => t.goalserveTeamId));
        const missingTeamIds = goalserveTeamIds.filter((id) => !existingSet.has(id));
        const missingTeams = teamRows.filter((t) => missingTeamIds.includes(t.id)).map((t) => ({
          goalserveTeamId: t.id,
          name: t.name,
        }));

        res.json({
          ok: true,
          leagueId,
          season: tournament.season || season || "",
          fetchedAt: new Date().toISOString(),
          tournament: {
            league: tournament.league,
            season: tournament.season,
            stageId: tournament.stage_id,
            timestamp: standings.timestamp,
          },
          sampleTeams: teamRows.slice(0, 3).map((t) => ({
            id: t.id,
            name: t.name,
            position: t.position,
          })),
          totalTeams: teamRows.length,
          missingTeams,
          missingCount: missingTeams.length,
        });
      } catch (error) {
        console.error("Debug standings error:", error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  );

  // ========== GOALSERVE STANDINGS UPSERT ==========
  app.post(
    "/api/jobs/upsert-goalserve-standings",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = req.query.leagueId as string;
      const season = req.query.season as string | undefined;
      const force = req.query.force === "1";

      if (!leagueId) {
        return res.status(400).json({ ok: false, error: "leagueId query param required" });
      }

      try {
        const result = await upsertGoalserveStandings(leagueId, { seasonParam: season, force });
        if (!result.ok && result.missingTeams && result.missingTeams.length > 0) {
          return res.status(409).json({
            error: result.error,
            leagueId: result.leagueId,
            season: result.season,
            missingTeamIds: result.missingTeams.map((t) => t.goalserveTeamId),
            missingTeamNames: result.missingTeams.map((t) => t.name),
          });
        }
        res.json(result);
      } catch (error) {
        console.error("Standings upsert error:", error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  );

  // ========== PURGE STANDINGS (dev-only for fixing bad data) ==========
  app.post(
    "/api/jobs/purge-standings",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = req.query.leagueId as string;
      const season = req.query.season as string;

      if (!leagueId || !season) {
        return res.status(400).json({ ok: false, error: "leagueId and season query params required" });
      }

      try {
        // Find all snapshots for this league+season
        const snapshotsToPurge = await db
          .select({ id: standingsSnapshots.id })
          .from(standingsSnapshots)
          .where(and(
            eq(standingsSnapshots.leagueId, leagueId),
            eq(standingsSnapshots.season, season)
          ));

        const snapshotIds = snapshotsToPurge.map(s => s.id);
        
        let deletedRowsCount = 0;
        let deletedSnapshotsCount = 0;

        if (snapshotIds.length > 0) {
          // Delete rows first (foreign key constraint)
          const rowsResult = await db
            .delete(standingsRows)
            .where(inArray(standingsRows.snapshotId, snapshotIds))
            .returning({ id: standingsRows.id });
          deletedRowsCount = rowsResult.length;

          // Then delete snapshots
          const snapshotsResult = await db
            .delete(standingsSnapshots)
            .where(inArray(standingsSnapshots.id, snapshotIds))
            .returning({ id: standingsSnapshots.id });
          deletedSnapshotsCount = snapshotsResult.length;
        }

        console.log(`[PurgeStandings] leagueId=${leagueId} season=${season} deletedSnapshots=${deletedSnapshotsCount} deletedRows=${deletedRowsCount}`);

        res.json({
          ok: true,
          leagueId,
          season,
          deletedSnapshotsCount,
          deletedRowsCount,
        });
      } catch (error) {
        console.error("Purge standings error:", error);
        res.status(500).json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" });
      }
    }
  );

  // ========== DEV: Search Competitions Mapping ==========
  app.get("/api/dev/competitions/search", async (req, res) => {
    const q = (req.query.q as string || "").toLowerCase().trim();
    const countryFilter = (req.query.country as string || "").toLowerCase().trim();
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    if (!q && !countryFilter) {
      return res.status(400).json({ error: "Provide at least 'q' or 'country' query param" });
    }

    try {
      const allComps = await db.select({
        id: competitions.id,
        name: competitions.name,
        country: competitions.country,
        goalserveCompetitionId: competitions.goalserveCompetitionId,
        type: competitions.type,
      }).from(competitions);

      let results = allComps.filter((c) => {
        const nameMatch = !q || (c.name?.toLowerCase().includes(q));
        const countryMatch = !countryFilter || (c.country?.toLowerCase().includes(countryFilter));
        return nameMatch && countryMatch;
      });

      // Sort: exact name match first, then country match, then alphabetical
      results.sort((a, b) => {
        const aNameExact = a.name?.toLowerCase() === q ? 0 : 1;
        const bNameExact = b.name?.toLowerCase() === q ? 0 : 1;
        if (aNameExact !== bNameExact) return aNameExact - bNameExact;

        const aCountryMatch = a.country?.toLowerCase().includes(countryFilter) ? 0 : 1;
        const bCountryMatch = b.country?.toLowerCase().includes(countryFilter) ? 0 : 1;
        if (aCountryMatch !== bCountryMatch) return aCountryMatch - bCountryMatch;

        return (a.name || "").localeCompare(b.name || "");
      });

      res.json(results.slice(0, limit));
    } catch (error) {
      console.error("Competitions search error:", error);
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // ========== DEV: Preview Goalserve Standings Metadata ==========
  app.get(
    "/api/dev/goalserve/standings-preview",
    requireJobSecret("GOALSERVE_SYNC_SECRET"),
    async (req, res) => {
      const leagueId = req.query.leagueId as string;

      if (!leagueId) {
        return res.status(400).json({ ok: false, error: "leagueId query param required" });
      }

      const feedKey = process.env.GOALSERVE_FEED_KEY;
      if (!feedKey) {
        return res.status(500).json({ ok: false, error: "GOALSERVE_FEED_KEY not configured" });
      }

      try {
        const url = `https://www.goalserve.com/getfeed/${feedKey}/standings/${leagueId}.xml?json=true`;
        const response = await fetch(url, { headers: { Accept: "application/json" } });

        if (!response.ok) {
          return res.status(502).json({
            ok: false,
            error: `Goalserve returned ${response.status}`,
            leagueId,
          });
        }

        const json = await response.json();
        const standings = json?.standings;
        if (!standings) {
          return res.json({
            ok: false,
            error: "No 'standings' key in response",
            leagueId,
            topLevelKeys: Object.keys(json || {}),
          });
        }

        const tournament = standings.tournament;
        if (!tournament) {
          return res.json({
            ok: false,
            error: "No 'tournament' in standings",
            leagueId,
            standingsKeys: Object.keys(standings),
          });
        }

        // Parse teams from stages
        let teamCount = 0;
        const stages = tournament.stage;
        const stageArr = Array.isArray(stages) ? stages : stages ? [stages] : [];
        for (const stage of stageArr) {
          const teams = stage?.team;
          const teamArr = Array.isArray(teams) ? teams : teams ? [teams] : [];
          teamCount += teamArr.length;
        }

        res.json({
          ok: true,
          leagueId,
          country: tournament.country ?? null,
          leagueName: tournament.league ?? null,
          season: tournament.season ?? null,
          stageCount: stageArr.length,
          stageIds: stageArr.map((s: any) => s?.id ?? null),
          teamCount,
        });
      } catch (error) {
        console.error("Goalserve standings preview error:", error);
        res.status(500).json({
          ok: false,
          error: error instanceof Error ? error.message : "Unknown error",
          leagueId,
        });
      }
    }
  );

  // ========== PUBLIC STANDINGS ENDPOINT ==========
  // In-memory throttle map for auto-refresh: key = "leagueId:season", value = lastRunMs
  const standingsAutoRefreshThrottle = new Map<string, number>();
  const STANDINGS_REFRESH_COOLDOWN_MS = 60_000; // 1 minute

  app.get("/api/standings", async (req, res) => {
    try {
      const leagueId = req.query.leagueId as string;
      if (!leagueId) {
        return res.status(400).json({ error: "leagueId query param required" });
      }

      const now = new Date();
      const currentYear = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      const defaultSeason = `${currentYear}/${currentYear + 1}`;
      const season = (req.query.season as string) || defaultSeason;
      const asOfParam = req.query.asOf as string | undefined;
      const autoRefresh = req.query.autoRefresh === "1";

      // Auto-refresh logic: attempt standings ingestion if allowed by throttle
      if (autoRefresh) {
        const throttleKey = `${leagueId}:${season}`;
        const lastRun = standingsAutoRefreshThrottle.get(throttleKey) || 0;
        const nowMs = Date.now();
        
        if (nowMs - lastRun >= STANDINGS_REFRESH_COOLDOWN_MS) {
          standingsAutoRefreshThrottle.set(throttleKey, nowMs);
          try {
            const result = await upsertGoalserveStandings(leagueId, { seasonParam: season });
            if (result.ok) {
              console.log(`[StandingsAutoRefresh] leagueId=${leagueId} season=${season} ${result.skipped ? "SKIPPED (no change)" : `rows=${result.insertedRowsCount}`}`);
            } else {
              console.warn(`[StandingsAutoRefresh] leagueId=${leagueId} season=${season} FAILED: ${result.error}`);
            }
          } catch (refreshErr) {
            console.error(`[StandingsAutoRefresh] leagueId=${leagueId} season=${season} ERROR:`, refreshErr);
          }
        }
      }

      const conditions = [
        eq(standingsSnapshots.leagueId, leagueId),
        eq(standingsSnapshots.season, season),
      ];

      if (asOfParam) {
        const asOfDate = new Date(asOfParam);
        conditions.push(lte(standingsSnapshots.asOf, asOfDate));
      }

      const [snapshot] = await db
        .select()
        .from(standingsSnapshots)
        .where(and(...conditions))
        .orderBy(desc(standingsSnapshots.asOf))
        .limit(1);

      if (!snapshot) {
        return res.status(404).json({ error: "No standings snapshot found", leagueId, season });
      }

      const rows = await db
        .select({
          position: standingsRows.position,
          teamId: standingsRows.teamId,
          teamGoalserveId: standingsRows.teamGoalserveId,
          played: standingsRows.played,
          won: standingsRows.won,
          drawn: standingsRows.drawn,
          lost: standingsRows.lost,
          goalsFor: standingsRows.goalsFor,
          goalsAgainst: standingsRows.goalsAgainst,
          goalDifference: standingsRows.goalDifference,
          points: standingsRows.points,
          recentForm: standingsRows.recentForm,
          movementStatus: standingsRows.movementStatus,
          qualificationNote: standingsRows.qualificationNote,
          homePlayed: standingsRows.homePlayed,
          homeWon: standingsRows.homeWon,
          homeDrawn: standingsRows.homeDrawn,
          homeLost: standingsRows.homeLost,
          homeGoalsFor: standingsRows.homeGoalsFor,
          homeGoalsAgainst: standingsRows.homeGoalsAgainst,
          awayPlayed: standingsRows.awayPlayed,
          awayWon: standingsRows.awayWon,
          awayDrawn: standingsRows.awayDrawn,
          awayLost: standingsRows.awayLost,
          awayGoalsFor: standingsRows.awayGoalsFor,
          awayGoalsAgainst: standingsRows.awayGoalsAgainst,
          teamName: teams.name,
          teamSlug: teams.slug,
          teamCrestUrl: teams.logoUrl,
        })
        .from(standingsRows)
        .leftJoin(teams, eq(standingsRows.teamId, teams.id))
        .where(eq(standingsRows.snapshotId, snapshot.id))
        .orderBy(asc(standingsRows.position));

      const table = rows.map((r) => ({
        position: r.position,
        team: {
          id: r.teamId,
          name: r.teamName || r.teamGoalserveId,
          slug: r.teamSlug,
          crestUrl: r.teamCrestUrl,
        },
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        recentForm: r.recentForm,
        movementStatus: r.movementStatus,
        qualificationNote: r.qualificationNote,
        home: {
          played: r.homePlayed,
          won: r.homeWon,
          drawn: r.homeDrawn,
          lost: r.homeLost,
          goalsFor: r.homeGoalsFor,
          goalsAgainst: r.homeGoalsAgainst,
        },
        away: {
          played: r.awayPlayed,
          won: r.awayWon,
          drawn: r.awayDrawn,
          lost: r.awayLost,
          goalsFor: r.awayGoalsFor,
          goalsAgainst: r.awayGoalsAgainst,
        },
      }));

      // Fetch fixtures from Goalserve XML to get proper <week number="X"> containers
      interface RoundInfo {
        key: string;
        number: number;
        label: string;
        startDate: string | null;
        endDate: string | null;
        matchesCount: number;
        hasAnyMatches: boolean;
        hasScheduledMatches: boolean;
      }

      interface MatchInfo {
        id: string;
        home: { id?: string; name: string };
        away: { id?: string; name: string };
        score: { home: number; away: number } | null;
        kickoffDate: string | null;
        kickoffTime: string | null;
        status: string;
      }

      // Helper to check if a status means "scheduled"
      const isScheduledStatus = (status: string): boolean => {
        const s = status?.toLowerCase().trim() || "";
        return (
          s === "scheduled" || 
          s === "ns" || 
          s === "notstarted" || 
          s === "fixture" ||
          s === "tbd" ||
          s === "time tbd" ||
          s === "timetbd" ||
          /^\d{1,2}:\d{2}$/.test(s)
        );
      };

      // Fetch Goalserve XML for proper week numbers
      const { goalserveFetchXml } = await import("./integrations/goalserve/client");
      const xmlEndpoint = season 
        ? `soccerfixtures/leagueid/${leagueId}?season=${encodeURIComponent(season)}`
        : `soccerfixtures/leagueid/${leagueId}`;
      
      let xmlData: any;
      try {
        xmlData = await goalserveFetchXml(xmlEndpoint);
      } catch (xmlErr) {
        console.error("[Standings] Failed to fetch Goalserve XML:", xmlErr);
        xmlData = null;
      }

      const matchesByRound: Record<string, MatchInfo[]> = {};
      const rounds: RoundInfo[] = [];
      let defaultMatchweek = 1;

      // Parse XML week containers
      if (xmlData) {
        // Navigate to weeks container - Goalserve XML may use different root elements
        // For soccerfixtures/leagueid: results.tournament.week[]
        // For other endpoints: scores.tournament.week[]
        const tournament = xmlData?.results?.tournament 
          ?? xmlData?.scores?.tournament 
          ?? xmlData?.tournament;
        let weeks: any[] = [];
        
        if (tournament?.week) {
          weeks = Array.isArray(tournament.week) ? tournament.week : [tournament.week];
        }

        // Helper to parse date from "dd.mm.yyyy" format
        const parseGoalserveDate = (dateStr: string): Date | null => {
          if (!dateStr) return null;
          const parts = dateStr.split(".");
          if (parts.length === 3) {
            const [day, month, year] = parts.map(p => parseInt(p, 10));
            return new Date(year, month - 1, day);
          }
          return null;
        };

        // Helper to parse match from XML
        const parseXmlMatch = (m: any, weekNum: number): MatchInfo => {
          const matchDate = m["@_date"] ?? m.date ?? "";
          const matchTime = m["@_time"] ?? m.time ?? "";
          const status = m["@_status"] ?? m.status ?? "scheduled";
          const matchId = m["@_id"] ?? m.id ?? `mw${weekNum}-${Math.random().toString(36).slice(2, 9)}`;
          
          const parsedDate = parseGoalserveDate(matchDate);
          const kickoffDate = parsedDate ? parsedDate.toISOString().split("T")[0] : null;
          
          // Support both hometeam/awayteam AND localteam/visitorteam (Goalserve uses both)
          const homeTeamNode = m.hometeam ?? m.localteam ?? {};
          const awayTeamNode = m.awayteam ?? m.visitorteam ?? {};
          
          // Extract team names - check multiple attribute formats
          const homeName = homeTeamNode["@_name"] ?? homeTeamNode["@name"] ?? homeTeamNode.name ?? m["@_hometeam"] ?? "TBD";
          const awayName = awayTeamNode["@_name"] ?? awayTeamNode["@name"] ?? awayTeamNode.name ?? m["@_awayteam"] ?? "TBD";
          
          // Extract team IDs
          const homeId = homeTeamNode["@_id"] ?? homeTeamNode["@id"] ?? homeTeamNode.id ?? undefined;
          const awayId = awayTeamNode["@_id"] ?? awayTeamNode["@id"] ?? awayTeamNode.id ?? undefined;
          
          // Parse scores - prefer ft_score, fallback to score, then match-level scores
          let homeScore: number | null = null;
          let awayScore: number | null = null;
          
          // First try team-level scores (localteam/visitorteam format)
          const homeFtScore = homeTeamNode["@_ft_score"] ?? homeTeamNode["@ft_score"] ?? homeTeamNode.ft_score;
          const awayFtScore = awayTeamNode["@_ft_score"] ?? awayTeamNode["@ft_score"] ?? awayTeamNode.ft_score;
          const homeTeamScore = homeTeamNode["@_score"] ?? homeTeamNode["@score"] ?? homeTeamNode.score;
          const awayTeamScore = awayTeamNode["@_score"] ?? awayTeamNode["@score"] ?? awayTeamNode.score;
          
          // Prefer ft_score if available and non-empty
          if (homeFtScore !== undefined && homeFtScore !== "" && awayFtScore !== undefined && awayFtScore !== "") {
            homeScore = parseInt(String(homeFtScore), 10);
            awayScore = parseInt(String(awayFtScore), 10);
          } else if (homeTeamScore !== undefined && homeTeamScore !== "" && awayTeamScore !== undefined && awayTeamScore !== "") {
            homeScore = parseInt(String(homeTeamScore), 10);
            awayScore = parseInt(String(awayTeamScore), 10);
          } else {
            // Fallback to match-level scores
            const matchHomeScore = m["@_homescore"] ?? m.homescore ?? null;
            const matchAwayScore = m["@_awayscore"] ?? m.awayscore ?? null;
            if (matchHomeScore !== null && matchHomeScore !== "" && matchAwayScore !== null && matchAwayScore !== "") {
              homeScore = parseInt(String(matchHomeScore), 10);
              awayScore = parseInt(String(matchAwayScore), 10);
            }
          }
          
          return {
            id: String(matchId),
            home: { id: homeId, name: homeName },
            away: { id: awayId, name: awayName },
            score: (homeScore !== null && awayScore !== null && !isNaN(homeScore) && !isNaN(awayScore))
              ? { home: homeScore, away: awayScore }
              : null,
            kickoffDate,
            kickoffTime: matchTime || null,
            status: String(status),
          };
        };

        // Process each week
        for (const week of weeks) {
          const weekNum = parseInt(week["@_number"] ?? week.number ?? "0", 10);
          if (weekNum < 1) continue;
          
          const key = `MW${weekNum}`;
          const weekMatches: MatchInfo[] = [];
          let startDate: string | null = null;
          let endDate: string | null = null;
          let hasScheduled = false;
          
          // Get matches from week - can be in week.match or week.matches.match
          let matchList: any[] = [];
          if (week.match) {
            matchList = Array.isArray(week.match) ? week.match : [week.match];
          } else if (week.matches?.match) {
            matchList = Array.isArray(week.matches.match) ? week.matches.match : [week.matches.match];
          }
          
          for (const m of matchList) {
            const matchInfo = parseXmlMatch(m, weekNum);
            weekMatches.push(matchInfo);
            
            if (matchInfo.kickoffDate) {
              if (!startDate || matchInfo.kickoffDate < startDate) startDate = matchInfo.kickoffDate;
              if (!endDate || matchInfo.kickoffDate > endDate) endDate = matchInfo.kickoffDate;
            }
            
            if (isScheduledStatus(matchInfo.status)) {
              hasScheduled = true;
            }
          }
          
          matchesByRound[key] = weekMatches;
          rounds.push({
            key,
            number: weekNum,
            label: String(weekNum),
            startDate,
            endDate,
            matchesCount: weekMatches.length,
            hasAnyMatches: weekMatches.length > 0,
            hasScheduledMatches: hasScheduled,
          });
        }

        // Sort rounds by week number ascending
        rounds.sort((a, b) => a.number - b.number);
      }

      // Determine default matchweek
      // Strategy: pick the first round that has any scheduled (not yet played) matches
      // If all matches are completed, pick the highest round with any matches
      let latestScheduledRoundKey = "";
      let latestActiveRoundKey = "";
      let firstScheduledRoundKey = "";
      
      for (const round of rounds) {
        if (round.hasAnyMatches) {
          latestActiveRoundKey = round.key;
        }
        if (round.hasScheduledMatches) {
          if (!firstScheduledRoundKey) {
            firstScheduledRoundKey = round.key;
          }
          latestScheduledRoundKey = round.key;
        }
      }
      
      // Prefer the first round with scheduled matches (current matchweek)
      // Fall back to latest active round (all matches completed)
      // Final fallback to first round
      if (firstScheduledRoundKey) {
        const match = firstScheduledRoundKey.match(/(\d+)/);
        if (match) defaultMatchweek = parseInt(match[1], 10);
      } else if (latestActiveRoundKey) {
        const match = latestActiveRoundKey.match(/(\d+)/);
        if (match) defaultMatchweek = parseInt(match[1], 10);
      }
      
      const latestRoundKey = firstScheduledRoundKey || latestActiveRoundKey || (rounds.length > 0 ? rounds[0].key : "");

      res.json({
        snapshot: {
          leagueId: snapshot.leagueId,
          season: snapshot.season,
          stageId: snapshot.stageId,
          asOf: snapshot.asOf,
        },
        table,
        rounds,
        matchesByRound,
        latestRoundKey,
        latestScheduledRoundKey,
        defaultMatchweek,
        latestActiveRoundKey,
      });
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // ========== CUP PROGRESS ENDPOINT ==========
  // Fetches cup fixtures grouped by round from Goalserve
  app.get("/api/cup/progress", async (req, res) => {
    try {
      const competitionId = req.query.competitionId as string;
      if (!competitionId) {
        return res.status(400).json({ error: "competitionId query param required" });
      }

      const feedKey = process.env.GOALSERVE_FEED_KEY;
      if (!feedKey) {
        return res.status(500).json({ error: "GOALSERVE_FEED_KEY not configured" });
      }

      // Season param is optional - Goalserve uses it for filtering (e.g., 2025/2026)
      const season = req.query.season as string | undefined;

      // Use goalserveFetch helper for consistent handling
      // CORRECT URL format: soccerfixtures/leagueid/{LEAGUE_ID}
      // Verify with: curl -sS "https://www.goalserve.com/getfeed/$GOALSERVE_FEED_KEY/soccerfixtures/leagueid/1198?json=true" | head -n 40
      const { goalserveFetch } = await import("./integrations/goalserve/client");
      const endpoint = season 
        ? `soccerfixtures/leagueid/${competitionId}?season=${encodeURIComponent(season)}`
        : `soccerfixtures/leagueid/${competitionId}`;
      
      let data: any;
      try {
        data = await goalserveFetch(endpoint);
      } catch (fetchError: any) {
        // Check if Goalserve returned HTML (wrong endpoint/auth/feed key)
        const errorMsg = fetchError?.message || "";
        if (errorMsg.includes("<") || errorMsg.includes("html") || errorMsg.includes("non-JSON")) {
          console.error("[CupProgress] Goalserve returned HTML (likely wrong endpoint/auth/feed key):", errorMsg.slice(0, 300));
          return res.status(502).json({ 
            error: "Goalserve returned HTML instead of JSON. Check feed key and endpoint.", 
            competitionId, 
            rounds: [] 
          });
        }
        throw fetchError;
      }

      // Parse the Goalserve structure - handle BOTH shapes:
      // a) results.tournament.stage[].week[].match[]
      // b) results.tournament.stage[].match[]
      // Also handle: stage.round[].match[] (some cups use "round" instead of "week")
      interface CupMatch {
        id: string;
        home: { id?: string; name: string };
        away: { id?: string; name: string };
        score?: { home: number; away: number } | null;
        penalties?: { home: number; away: number } | null;  // shootout score
        kickoff?: string;
        kickoffDate?: string | null;  // YYYY-MM-DD format
        kickoffTime?: string | null;  // HH:mm format (24-hour)
        status: string;
      }
      interface CupRound {
        name: string;
        order: number;
        matches: CupMatch[];
        status: "completed" | "in_progress" | "upcoming";
      }

      const roundsMap = new Map<string, CupMatch[]>();

      // Goalserve cup feed: results.tournament.stage... (note: "results" not "fixtures" for this feed)
      // Try both data.results and data.res.fixtures for compatibility
      const results = data?.results || data?.res?.fixtures;
      if (!results) {
        console.log("[CupProgress] No results/fixtures found in response, returning empty rounds");
        return res.json({ competitionId, rounds: [] });
      }

      // Tournament can be single object or array
      const tournaments = Array.isArray(results.tournament) 
        ? results.tournament 
        : results.tournament 
          ? [results.tournament] 
          : [];

      // Helper to robustly extract attributes from Goalserve match nodes
      // Handles: node[key], node["@"+key], node["@_"+key], node["@"]?.[key], node["$"]?.[key]
      const getAttr = (node: any, key: string): string | null => {
        if (!node || typeof node !== "object") return null;
        const direct = node[key];
        if (typeof direct === "string" && direct.trim()) return direct.trim();

        const at = node[`@${key}`];
        if (typeof at === "string" && at.trim()) return at.trim();

        const atUnderscore = node[`@_${key}`];
        if (typeof atUnderscore === "string" && atUnderscore.trim()) return atUnderscore.trim();

        const atObj = node["@"]?.[key];
        if (typeof atObj === "string" && atObj.trim()) return atObj.trim();

        const dollarObj = node["$"]?.[key];
        if (typeof dollarObj === "string" && dollarObj.trim()) return dollarObj.trim();

        return null;
      };

      // Convert DD.MM.YYYY → YYYY-MM-DD
      const toIsoFromDotDate = (d: string | null): string | null => {
        if (!d) return null;
        const s = d.trim();
        const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s);
        if (!m) return null;
        const [, dd, mm, yyyy] = m;
        return `${yyyy}-${mm}-${dd}`;
      };

      // Helper to safely parse int or return null
      const toIntOrNull = (v: any): number | null => {
        if (v == null) return null;
        const s = String(v).trim();
        if (!s) return null;
        const n = parseInt(s, 10);
        return Number.isFinite(n) ? n : null;
      };

      // Helper to get any matching attribute from multiple keys
      const getAny = (node: any, keys: string[]): any => {
        for (const k of keys) {
          const v = 
            node?.[k] ??
            node?.[`@_${k}`] ??
            node?.[`@${k}`] ??
            node?.["@"]?.[k] ??
            node?.["$"]?.[k];
          if (v != null && String(v).trim() !== "") return v;
        }
        return null;
      };

      // Helper to parse a single match object
      const parseMatch = (m: any, roundName: string) => {
        const homeTeam = m.hometeam || m.localteam || {};
        const awayTeam = m.awayteam || m.visitorteam || {};
        
        // Detect shootout via status OR presence of penalty fields
        const rawStatus = String(getAny(m, ["status"]) ?? m?.["@status"] ?? m?.status ?? "").trim();
        const isPensStatus = /pen/i.test(rawStatus) || rawStatus === "Pen." || rawStatus === "PEN";

        // Extract penalty shootout scores from team objects (@pen_score)
        const penHome = toIntOrNull(homeTeam["@pen_score"] ?? homeTeam["@_pen_score"] ?? getAny(m, ["pen_home", "homepen", "penalty_home", "ps_home"]));
        const penAway = toIntOrNull(awayTeam["@pen_score"] ?? awayTeam["@_pen_score"] ?? getAny(m, ["pen_away", "awaypen", "penalty_away", "ps_away"]));
        const hasPens = penHome != null && penAway != null;

        // Extract FT (full-time) score from team objects - this is the actual match result before shootout
        const ftHome = toIntOrNull(homeTeam["@ft_score"] ?? homeTeam["@_ft_score"]);
        const ftAway = toIntOrNull(awayTeam["@ft_score"] ?? awayTeam["@_ft_score"]);
        
        // Extract ET (extra-time) score if available
        const etHome = toIntOrNull(homeTeam["@et_score"] ?? homeTeam["@_et_score"]);
        const etAway = toIntOrNull(awayTeam["@et_score"] ?? awayTeam["@_et_score"]);

        // Team-level @score (may be shootout total for Pen. matches, so use only as fallback)
        const teamHomeScore = toIntOrNull(homeTeam["@score"] ?? homeTeam["@_score"] ?? homeTeam.score ?? m["@homescore"] ?? m["@_homescore"] ?? m.homescore);
        const teamAwayScore = toIntOrNull(awayTeam["@score"] ?? awayTeam["@_score"] ?? awayTeam.score ?? m["@awayscore"] ?? m["@_awayscore"] ?? m.awayscore);

        // Choose final score:
        // For penalty matches: prefer FT/ET scores (the actual drawn match) over @score (which may be shootout total)
        // For non-penalty matches: use @score as normal
        let finalHome: number | null;
        let finalAway: number | null;
        
        if (isPensStatus || hasPens) {
          // Use FT score if available (match ended in draw), otherwise use ET score, finally fallback to @score
          finalHome = ftHome ?? etHome ?? teamHomeScore;
          finalAway = ftAway ?? etAway ?? teamAwayScore;
        } else {
          finalHome = teamHomeScore;
          finalAway = teamAwayScore;
        }
        
        const hasScore = finalHome != null && finalAway != null;
        const penalties = hasPens ? { home: penHome, away: penAway } : null;

        // Extract date and time using robust attribute helper
        const rawDate = getAttr(m, "date");
        const rawTime = getAttr(m, "time");
        const formattedDate = getAttr(m, "formatted_date");
        const formattedTime = getAttr(m, "formatted_time");
        
        // Convert to ISO date format (YYYY-MM-DD)
        const kickoffDate = toIsoFromDotDate(rawDate) ?? toIsoFromDotDate(formattedDate) ?? null;
        
        // Extract HH:mm (24-hour format), null if missing
        const kickoffTime = (rawTime && rawTime.includes(":")) 
          ? rawTime 
          : (formattedTime && formattedTime.includes(":") ? formattedTime : null);

        const match: CupMatch = {
          id: getAttr(m, "id") || String(Math.random()),
          home: {
            id: getAttr(homeTeam, "id") || undefined,
            name: getAttr(homeTeam, "name") || "TBD",
          },
          away: {
            id: getAttr(awayTeam, "id") || undefined,
            name: getAttr(awayTeam, "name") || "TBD",
          },
          score: hasScore ? {
            home: finalHome!,
            away: finalAway!,
          } : null,
          penalties,
          kickoff: formattedDate || rawDate || undefined,
          kickoffDate,
          kickoffTime,
          status: getAttr(m, "status") || "NS",
        };

        if (!roundsMap.has(roundName)) {
          roundsMap.set(roundName, []);
        }
        roundsMap.get(roundName)!.push(match);
      };

      // Helper to get matches as array
      const toArray = (item: any) => {
        if (!item) return [];
        return Array.isArray(item) ? item : [item];
      };

      for (const tournament of tournaments) {
        const stages = toArray(tournament.stage);

        for (const stage of stages) {
          const stageName = stage["@name"] || stage.name || "";
          
          // Shape A: stage.week[].match[] (some cup feeds use "week" for rounds)
          const weeks = toArray(stage.week);
          for (const week of weeks) {
            const roundName = week["@name"] || week.name || week["@round_name"] || stageName || "Unknown Round";
            const matches = toArray(week.match);
            for (const m of matches) {
              // Use match-level round info if available, else use week name
              const matchRound = m["@round_name"] || m.round || roundName;
              parseMatch(m, matchRound);
            }
          }

          // Shape B: stage.round[].match[] (some cups use "round")
          const rounds = toArray(stage.round);
          for (const round of rounds) {
            const roundName = round["@name"] || round.name || stageName || "Unknown Round";
            const matches = toArray(round.match);
            for (const m of matches) {
              parseMatch(m, roundName);
            }
          }

          // Shape C: stage.match[] (matches directly under stage)
          if (stage.match && !weeks.length && !rounds.length) {
            const matches = toArray(stage.match);
            for (const m of matches) {
              const roundName = m["@round_name"] || m.round || stageName || "Unknown Round";
              parseMatch(m, roundName);
            }
          }
        }
      }

      // ============ COMPETITION-SPECIFIC CANONICAL ROUND SYSTEMS ============
      
      // FA CUP: 14 canonical rounds (qualifying 1-6, proper 7-14)
      const FA_CUP_CANONICAL_ROUNDS: Record<string, number> = {
        "Extra Preliminary Round": 1,
        "Preliminary Round": 2,
        "First Qualifying Round": 3,
        "Second Qualifying Round": 4,
        "Third Qualifying Round": 5,
        "Fourth Qualifying Round": 6,
        "First Round": 7,
        "Second Round": 8,
        "Third Round": 9,
        "Fourth Round": 10,
        "Fifth Round": 11,
        "Quarter-finals": 12,
        "Semi-finals": 13,
        "Final": 14,
      };
      
      // EFL CUP (Carabao Cup): 7 canonical rounds
      const EFL_CUP_CANONICAL_ROUNDS: Record<string, number> = {
        "First Round": 1,
        "Second Round": 2,
        "Third Round": 3,
        "Fourth Round": 4,
        "Quarter-finals": 5,
        "Semi-finals": 6,
        "Final": 7,
      };
      
      // COPA DEL REY (Spain Cup): 8 canonical rounds (mirror Goalserve stage names)
      const COPA_DEL_REY_CANONICAL_ROUNDS: Record<string, number> = {
        "1/128-finals": 1,
        "1/64-finals": 2,
        "1/32-finals": 3,
        "1/16-finals": 4,
        "1/8-finals": 5,
        "Quarter-finals": 6,
        "Semi-finals": 7,
        "Final": 8,
      };
      
      // COPPA ITALIA (Italy Cup): 7 canonical rounds (mirror Goalserve stage names)
      const COPPA_ITALIA_CANONICAL_ROUNDS: Record<string, number> = {
        "1/64-finals": 1,
        "1/32-finals": 2,
        "1/16-finals": 3,
        "1/8-finals": 4,
        "Quarter-finals": 5,
        "Semi-finals": 6,
        "Final": 7,
      };
      
      // DFB POKAL (Germany Cup): 6 canonical rounds (user-friendly labels)
      // Maps Goalserve fraction labels to human-readable round names
      const DFB_POKAL_CANONICAL_ROUNDS: Record<string, number> = {
        "First Round": 1,
        "Second Round": 2,
        "Round of 16": 3,
        "Quarter-finals": 4,
        "Semi-finals": 5,
        "Final": 6,
      };
      
      // SCOTTISH CUP: Uses FA Cup style naming (maps Goalserve fractions to named rounds)
      const SCOTTISH_CUP_CANONICAL_ROUNDS: Record<string, number> = {
        "First Round": 1,
        "Second Round": 2,
        "Third Round": 3,
        "Fourth Round": 4,
        "Fifth Round": 5,
        "Quarter-finals": 6,
        "Semi-finals": 7,
        "Final": 8,
      };
      
      // SCOTTISH LEAGUE CUP: Named rounds, filter out "Regular season"
      const SCOTTISH_LEAGUE_CUP_CANONICAL_ROUNDS: Record<string, number> = {
        "Second Round": 1,
        "Quarter-finals": 2,
        "Semi-finals": 3,
        "Final": 4,
      };
      
      // COUPE DE FRANCE: Uses Goalserve fraction labels as-is, ordered correctly
      const COUPE_DE_FRANCE_CANONICAL_ROUNDS: Record<string, number> = {
        "1/128-finals": 1,
        "1/64-finals": 2,
        "1/32-finals": 3,
        "1/16-finals": 4,
        "1/8-finals": 5,
        "Quarter-finals": 6,
        "Semi-finals": 7,
        "Final": 8,
      };
      
      // Select canonical rounds based on competition
      const isEflCup = competitionId === "1199";
      const isCopaDelRey = competitionId === "1397";
      const isCoppaItalia = competitionId === "1264";
      const isDfbPokal = competitionId === "1226";
      const isScottishCup = competitionId === "1371";
      const isScottishLeagueCup = competitionId === "1372";
      const isCoupeDeFrance = competitionId === "1218";
      
      const CANONICAL_ROUNDS = isScottishCup
        ? SCOTTISH_CUP_CANONICAL_ROUNDS
        : isScottishLeagueCup
          ? SCOTTISH_LEAGUE_CUP_CANONICAL_ROUNDS
          : isCoupeDeFrance
            ? COUPE_DE_FRANCE_CANONICAL_ROUNDS
            : isDfbPokal
              ? DFB_POKAL_CANONICAL_ROUNDS
              : isCoppaItalia
                ? COPPA_ITALIA_CANONICAL_ROUNDS
                : isCopaDelRey 
                  ? COPA_DEL_REY_CANONICAL_ROUNDS 
                  : isEflCup 
                    ? EFL_CUP_CANONICAL_ROUNDS 
                    : FA_CUP_CANONICAL_ROUNDS;

      // FA Cup normalizer: returns canonical name or null (discard if null)
      const normalizeToCanonicalRound_FA_CUP = (name: string): string | null => {
        const lower = name.toLowerCase().trim();
        
        // Map Goalserve fractional notation to proper round names
        if (lower === "1/128-finals") return "First Round";
        if (lower === "1/64-finals") return "Second Round";
        if (lower === "1/32-finals") return "Third Round";
        if (lower === "1/16-finals") return "Fourth Round";
        if (lower === "1/8-finals") return "Fifth Round";
        
        // Map quarter/semi/final variations
        if (lower.includes("quarter") && lower.includes("final") && !lower.includes("qualifying")) {
          return "Quarter-finals";
        }
        if (lower.includes("semi") && lower.includes("final") && !lower.includes("qualifying")) {
          return "Semi-finals";
        }
        if ((lower === "final" || lower === "finals" || lower === "the final") && !lower.includes("qualifying")) {
          return "Final";
        }
        
        // Map qualifying rounds (case-insensitive, tolerate "1st/first", hyphens, etc)
        if (lower.includes("extra") && lower.includes("prelim")) return "Extra Preliminary Round";
        if (lower.includes("prelim") && !lower.includes("extra")) return "Preliminary Round";
        if ((lower.includes("1st") || lower.includes("first")) && lower.includes("qual")) return "First Qualifying Round";
        if ((lower.includes("2nd") || lower.includes("second")) && lower.includes("qual")) return "Second Qualifying Round";
        if ((lower.includes("3rd") || lower.includes("third")) && lower.includes("qual")) return "Third Qualifying Round";
        if ((lower.includes("4th") || lower.includes("fourth")) && lower.includes("qual")) return "Fourth Qualifying Round";
        
        // Map "Round of XX" and "Last XX" to proper rounds
        if (lower.includes("round of 64") || lower.includes("last 64")) return "Second Round";
        if (lower.includes("round of 32") || lower.includes("last 32")) return "Third Round";
        if (lower.includes("round of 16") || lower.includes("last 16")) return "Fourth Round";
        if (lower.includes("round of 8") || lower.includes("last 8")) return "Quarter-finals";
        if (lower.includes("round of 4") || lower.includes("last 4")) return "Semi-finals";
        
        // Map ordinal rounds: "1st Round", "First Round", "Round 1", etc.
        if (/^(1st|first)\s*(round)?(\s*proper)?$/.test(lower) || /^round\s*1$/.test(lower)) return "First Round";
        if (/^(2nd|second)\s*(round)?(\s*proper)?$/.test(lower) || /^round\s*2$/.test(lower)) return "Second Round";
        if (/^(3rd|third)\s*(round)?(\s*proper)?$/.test(lower) || /^round\s*3$/.test(lower)) return "Third Round";
        if (/^(4th|fourth)\s*(round)?(\s*proper)?$/.test(lower) || /^round\s*4$/.test(lower)) return "Fourth Round";
        if (/^(5th|fifth)\s*(round)?(\s*proper)?$/.test(lower) || /^round\s*5$/.test(lower)) return "Fifth Round";
        
        // Handle explicit canonical names (already properly cased in feed)
        for (const canonical of Object.keys(FA_CUP_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // No match - discard this round (returns null)
        return null;
      };
      
      // EFL Cup normalizer: returns canonical name or "Unknown: {name}" for safety
      const normalizeToCanonicalRound_EFL_CUP = (name: string): string => {
        const lower = name.toLowerCase().trim();
        
        // FIRST ROUND variants
        if (lower === "first round" || lower === "1st round" || lower === "round 1" || lower === "round1") return "First Round";
        if (lower === "1/64-finals" || lower === "1/64 final" || lower === "1/64 finals") return "First Round";
        if (lower.includes("round of 64") || lower.includes("last 64")) return "First Round";
        
        // SECOND ROUND variants
        if (lower === "second round" || lower === "2nd round" || lower === "round 2" || lower === "round2") return "Second Round";
        if (lower === "1/32-finals" || lower === "1/32 final" || lower === "1/32 finals") return "Second Round";
        if (lower.includes("round of 32") || lower.includes("last 32")) return "Second Round";
        
        // THIRD ROUND variants
        if (lower === "third round" || lower === "3rd round" || lower === "round 3" || lower === "round3") return "Third Round";
        if (lower === "1/16-finals" || lower === "1/16 final" || lower === "1/16 finals") return "Third Round";
        if (lower.includes("round of 16") || lower.includes("last 16")) return "Third Round";
        
        // FOURTH ROUND variants
        if (lower === "fourth round" || lower === "4th round" || lower === "round 4" || lower === "round4") return "Fourth Round";
        if (lower === "1/8-finals" || lower === "1/8 final" || lower === "1/8 finals") return "Fourth Round";
        
        // QUARTER-FINALS variants
        if ((lower.includes("quarter") && lower.includes("final")) || lower === "qf" || lower === "quarterfinals") return "Quarter-finals";
        
        // SEMI-FINALS variants
        if ((lower.includes("semi") && lower.includes("final")) || lower === "sf" || lower === "semifinals") return "Semi-finals";
        
        // FINAL variants
        if (lower === "final" || lower === "finals" || lower === "the final") return "Final";
        
        // Handle explicit canonical names (already properly cased in feed)
        for (const canonical of Object.keys(EFL_CUP_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // TEMPORARY SAFETY: preserve unknown rounds for debugging instead of discarding
        console.log(`[EFL Cup] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // Copa del Rey normalizer: returns canonical name or "Unknown: {name}" for safety
      // Maps 1:1 to Goalserve stage names
      const normalizeToCanonicalRound_COPA_DEL_REY = (name: string): string => {
        const lower = name.toLowerCase().trim();
        
        // Fractional notation mappings (1:1 to Goalserve stages)
        if (lower.includes("1/128")) return "1/128-finals";
        if (lower.includes("1/64")) return "1/64-finals";
        if (lower.includes("1/32")) return "1/32-finals";
        if (lower.includes("1/16")) return "1/16-finals";
        if (lower.includes("1/8")) return "1/8-finals";
        if (lower.includes("1/4")) return "Quarter-finals";
        
        // Quarter-finals variants (quarterfinals, quarter-final, quarter final, qf)
        if (lower.includes("quarter") || lower === "qf") return "Quarter-finals";
        
        // Semi-finals variants (including "semifinal", "semi-final 1st leg", etc.)
        if (lower.includes("semi")) return "Semi-finals";
        
        // Final (anything containing "final" but NOT semi-final or quarter-final)
        if (lower.includes("final") && !lower.includes("semi") && !lower.includes("quarter")) return "Final";
        
        // Handle explicit canonical names
        for (const canonical of Object.keys(COPA_DEL_REY_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // TEMPORARY SAFETY: preserve unknown rounds for debugging
        console.log(`[Copa del Rey] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // Coppa Italia normalizer: returns canonical name or "Unknown: {name}" for safety
      // Maps 1:1 to Goalserve stage names
      const normalizeToCanonicalRound_COPPA_ITALIA = (name: string): string => {
        const lower = name.toLowerCase().trim();
        
        // Fractional notation mappings (1:1 to Goalserve stages)
        if (lower.includes("1/64")) return "1/64-finals";
        if (lower.includes("1/32")) return "1/32-finals";
        if (lower.includes("1/16")) return "1/16-finals";
        if (lower.includes("1/8")) return "1/8-finals";
        
        // Quarter-finals variants
        if (lower.includes("quarter") || lower === "qf") return "Quarter-finals";
        
        // Semi-finals variants
        if (lower.includes("semi")) return "Semi-finals";
        
        // Final (anything containing "final" but NOT semi-final or quarter-final)
        if (lower.includes("final") && !lower.includes("semi") && !lower.includes("quarter")) return "Final";
        
        // Handle explicit canonical names
        for (const canonical of Object.keys(COPPA_ITALIA_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // TEMPORARY SAFETY: preserve unknown rounds for debugging
        console.log(`[Coppa Italia] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // DFB Pokal normalizer: maps Goalserve fraction labels to user-friendly names
      const normalizeToCanonicalRound_DFB_POKAL = (name: string): string => {
        const lower = name.toLowerCase().trim();
        
        // Map Goalserve fractional notation to user-friendly round names
        if (lower.includes("1/32")) return "First Round";
        if (lower.includes("1/16")) return "Second Round";
        if (lower.includes("1/8")) return "Round of 16";
        
        // Quarter-finals variants (quarterfinals, quarter-final, quarter final, qf)
        if (lower.includes("quarter") || lower === "qf") return "Quarter-finals";
        
        // Semi-finals variants (normalize "Semifinals" → "Semi-finals")
        if (lower.includes("semi")) return "Semi-finals";
        
        // Final (anything containing "final" but NOT semi-final or quarter-final)
        if (lower.includes("final") && !lower.includes("semi") && !lower.includes("quarter")) return "Final";
        
        // Handle explicit canonical names
        for (const canonical of Object.keys(DFB_POKAL_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // TEMPORARY SAFETY: preserve unknown rounds for debugging
        console.log(`[DFB Pokal] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // SCOTTISH CUP normalizer: Maps Goalserve fraction labels to FA Cup style names
      const normalizeToCanonicalRound_SCOTTISH_CUP = (name: string): string | null => {
        const lower = name.toLowerCase().trim();
        
        // Map Goalserve fractional notation to FA Cup style round names
        if (lower === "1/128-finals") return "First Round";
        if (lower === "1/64-finals") return "Second Round";
        if (lower === "1/32-finals") return "Third Round";
        if (lower === "1/16-finals") return "Fourth Round";
        if (lower === "1/8-finals") return "Fifth Round";
        
        // Keep standard names as-is
        if (lower === "quarterfinals" || lower === "quarter-finals" || lower === "quarter-final") return "Quarter-finals";
        if (lower === "semifinals" || lower === "semi-finals" || lower === "semi-final") return "Semi-finals";
        if (lower === "final" || lower === "finals" || lower === "the final") return "Final";
        
        // Check exact matches to canonical rounds
        for (const canonical of Object.keys(SCOTTISH_CUP_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // Pass through unknown rounds for debugging
        console.log(`[Scottish Cup] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // SCOTTISH LEAGUE CUP normalizer: Maps "1/8-finals" to "Second Round", filters Regular season
      const normalizeToCanonicalRound_SCOTTISH_LEAGUE_CUP = (name: string): string | null => {
        const lower = name.toLowerCase().trim();
        
        // Filter out non-knockout rounds
        if (lower.includes("regular season") || lower.includes("group stage") || lower.includes("league")) {
          return null;
        }
        
        // Map "1/8-finals" to "Second Round" (the knockout start round)
        if (lower === "1/8-finals") return "Second Round";
        
        // Keep standard names as-is
        if (lower === "quarterfinals" || lower === "quarter-finals" || lower === "quarter-final") return "Quarter-finals";
        if (lower === "semifinals" || lower === "semi-finals" || lower === "semi-final") return "Semi-finals";
        if (lower === "final" || lower === "finals" || lower === "the final") return "Final";
        
        // Check exact matches to canonical rounds
        for (const canonical of Object.keys(SCOTTISH_LEAGUE_CUP_CANONICAL_ROUNDS)) {
          if (lower === canonical.toLowerCase()) return canonical;
        }
        
        // Pass through unknown rounds for debugging
        console.log(`[Scottish League Cup] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // Generic passthrough normalizer: preserves Goalserve labels with minimal normalization
      // Used for Coupe de France only now
      const normalizeToCanonicalRound_PASSTHROUGH = (
        canonicalRounds: Record<string, number>,
        competitionName: string
      ) => (name: string): string | null => {
        const trimmed = name.trim();
        const lower = trimmed.toLowerCase();
        
        // Normalize common variants
        let normalized = trimmed;
        if (lower === "quarterfinals" || lower === "quarter-final" || lower === "quarter final") {
          normalized = "Quarter-finals";
        } else if (lower === "semifinals" || lower === "semi-final" || lower === "semi final") {
          normalized = "Semi-finals";
        } else if (lower === "final" || lower === "finals" || lower === "the final") {
          normalized = "Final";
        }
        
        // Check if it matches a canonical round (case-insensitive)
        for (const canonical of Object.keys(canonicalRounds)) {
          if (lower === canonical.toLowerCase() || normalized === canonical) {
            return canonical;
          }
        }
        
        // Preserve unknown rounds for debugging
        console.log(`[${competitionName}] Unknown round name preserved: "${name}"`);
        return `Unknown: ${name}`;
      };
      
      // Select normalizer based on competition
      const normalizeToCanonicalRound = isScottishCup
        ? normalizeToCanonicalRound_SCOTTISH_CUP
        : isScottishLeagueCup
          ? normalizeToCanonicalRound_SCOTTISH_LEAGUE_CUP
          : isCoupeDeFrance
            ? normalizeToCanonicalRound_PASSTHROUGH(COUPE_DE_FRANCE_CANONICAL_ROUNDS, "Coupe de France")
            : isDfbPokal
              ? (name: string): string | null => normalizeToCanonicalRound_DFB_POKAL(name)
              : isCoppaItalia
                ? (name: string): string | null => normalizeToCanonicalRound_COPPA_ITALIA(name)
                : isCopaDelRey
                  ? (name: string): string | null => normalizeToCanonicalRound_COPA_DEL_REY(name)
                  : isEflCup 
                    ? (name: string): string | null => normalizeToCanonicalRound_EFL_CUP(name)
                    : normalizeToCanonicalRound_FA_CUP;

      // Match count sanity guards - discard rounds with unrealistic match counts
      const FA_CUP_MAX_MATCHES: Record<string, number> = {
        "Quarter-finals": 8,
        "Semi-finals": 4,
        "Final": 2,
        "Fifth Round": 16,
        "Fourth Round": 24,
        "Third Round": 40,
        "Second Round": 40,
        "First Round": 80,
      };
      
      const EFL_CUP_MAX_MATCHES: Record<string, number> = {
        "Quarter-finals": 8,
        "Semi-finals": 4,
        "Final": 2,
        "Fourth Round": 16,
        "Third Round": 32,
        "Second Round": 50,
        "First Round": 50,
      };
      
      const DFB_POKAL_MAX_MATCHES: Record<string, number> = {
        "Quarter-finals": 8,
        "Semi-finals": 4,
        "Final": 2,
        "Round of 16": 16,
        "Second Round": 32,
        "First Round": 64,
      };
      
      // Scottish Cup max matches (FA Cup style round names)
      const SCOTTISH_CUP_MAX_MATCHES: Record<string, number> = {
        "First Round": 128,
        "Second Round": 64,
        "Third Round": 32,
        "Fourth Round": 24,
        "Fifth Round": 16,
        "Quarter-finals": 8,
        "Semi-finals": 4,
        "Final": 2,
      };
      
      // Scottish League Cup max matches
      const SCOTTISH_LEAGUE_CUP_MAX_MATCHES: Record<string, number> = {
        "Second Round": 16,
        "Quarter-finals": 8,
        "Semi-finals": 4,
        "Final": 2,
      };
      
      // Coupe de France max matches (fraction labels)
      const COUPE_DE_FRANCE_MAX_MATCHES: Record<string, number> = {
        "1/128-finals": 128,
        "1/64-finals": 64,
        "1/32-finals": 32,
        "1/16-finals": 16,
        "1/8-finals": 8,
        "Quarter-finals": 8,
        "Semi-finals": 4,
        "Final": 2,
      };
      
      const ROUND_MAX_MATCHES = isScottishCup
        ? SCOTTISH_CUP_MAX_MATCHES
        : isScottishLeagueCup
          ? SCOTTISH_LEAGUE_CUP_MAX_MATCHES
          : isCoupeDeFrance
            ? COUPE_DE_FRANCE_MAX_MATCHES
            : isDfbPokal 
              ? DFB_POKAL_MAX_MATCHES 
              : isEflCup 
                ? EFL_CUP_MAX_MATCHES 
                : FA_CUP_MAX_MATCHES;

      // Debug flag for logging discarded rounds
      const DEBUG_CUP_ROUNDS = process.env.DEBUG_CUP_ROUNDS === "true";

      // Group matches by canonical round, deduping by match ID
      const canonicalRoundsMap: Map<string, Map<string, CupMatch>> = new Map();
      
      const roundEntries = Array.from(roundsMap.entries());
      for (const [rawName, matchList] of roundEntries) {
        const canonicalName = normalizeToCanonicalRound(rawName);
        
        if (!canonicalName) {
          // Round doesn't map to any canonical name - discard
          if (DEBUG_CUP_ROUNDS) {
            console.log(`[Cup] Discarding non-canonical round: "${rawName}" (${matchList.length} matches)`);
          }
          continue;
        }
        
        // Initialize map for this canonical round if needed
        if (!canonicalRoundsMap.has(canonicalName)) {
          canonicalRoundsMap.set(canonicalName, new Map());
        }
        const matchMap = canonicalRoundsMap.get(canonicalName)!;
        
        // Add matches, deduping by ID
        for (const match of matchList) {
          if (!matchMap.has(match.id)) {
            matchMap.set(match.id, match);
          }
        }
      }

      // Build final rounds array, applying sanity guards
      const cupRounds: CupRound[] = [];
      
      // Seed all canonical rounds for Copa del Rey (like FA Cup) so empty rounds appear in UI
      if (isCopaDelRey) {
        for (const [roundName, order] of Object.entries(COPA_DEL_REY_CANONICAL_ROUNDS)) {
          if (!canonicalRoundsMap.has(roundName)) {
            canonicalRoundsMap.set(roundName, new Map());
          }
        }
      }
      
      // Seed all canonical rounds for Coppa Italia so empty rounds appear in UI
      if (isCoppaItalia) {
        for (const [roundName, order] of Object.entries(COPPA_ITALIA_CANONICAL_ROUNDS)) {
          if (!canonicalRoundsMap.has(roundName)) {
            canonicalRoundsMap.set(roundName, new Map());
          }
        }
      }
      
      // Seed all canonical rounds for DFB Pokal so empty rounds appear in UI
      if (isDfbPokal) {
        for (const [roundName, order] of Object.entries(DFB_POKAL_CANONICAL_ROUNDS)) {
          if (!canonicalRoundsMap.has(roundName)) {
            canonicalRoundsMap.set(roundName, new Map());
          }
        }
      }
      
      // Seed all canonical rounds for Scottish League Cup so empty rounds appear in UI
      if (isScottishLeagueCup) {
        for (const [roundName, order] of Object.entries(SCOTTISH_LEAGUE_CUP_CANONICAL_ROUNDS)) {
          if (!canonicalRoundsMap.has(roundName)) {
            canonicalRoundsMap.set(roundName, new Map());
          }
        }
      }
      
      // Seed all canonical rounds for Scottish Cup so empty rounds appear in UI
      if (isScottishCup) {
        for (const [roundName, order] of Object.entries(SCOTTISH_CUP_CANONICAL_ROUNDS)) {
          if (!canonicalRoundsMap.has(roundName)) {
            canonicalRoundsMap.set(roundName, new Map());
          }
        }
      }
      
      // Scottish League Cup fix: Move mislabelled Final from Semi-finals
      // Goalserve sometimes labels the Final as "Semi-finals", resulting in 3+ matches
      if (isScottishLeagueCup) {
        const semisMap = canonicalRoundsMap.get("Semi-finals");
        const finalMap = canonicalRoundsMap.get("Final");
        
        if (semisMap && semisMap.size >= 3 && (!finalMap || finalMap.size === 0)) {
          // Find the match with the latest kickoff datetime
          const semisMatches = Array.from(semisMap.values()) as CupMatch[];
          
          let latestMatch: CupMatch | null = null;
          let latestKickoff = "";
          
          for (const match of semisMatches) {
            // Build kickoff datetime string for comparison
            let kickoff = match.kickoff || "";
            if (!kickoff && match.kickoffDate) {
              kickoff = match.kickoffDate + (match.kickoffTime ? " " + match.kickoffTime : "");
            }
            
            if (kickoff > latestKickoff) {
              latestKickoff = kickoff;
              latestMatch = match;
            }
          }
          
          if (latestMatch) {
            // Remove from Semi-finals
            semisMap.delete(latestMatch.id);
            
            // Add to Final
            if (!canonicalRoundsMap.has("Final")) {
              canonicalRoundsMap.set("Final", new Map());
            }
            const newFinalMap = canonicalRoundsMap.get("Final")!;
            newFinalMap.set(latestMatch.id, latestMatch);
            
            console.log(`[Scottish League Cup] Moved match ${latestMatch.id} from Semi-finals to Final (kickoff: ${latestKickoff})`);
          }
        }
      }
      
      const canonicalEntries = Array.from(canonicalRoundsMap.entries());
      for (const [canonicalName, matchMap] of canonicalEntries) {
        const matchList: CupMatch[] = Array.from(matchMap.values());
        
        // EFL Cup specific: drop unknown rounds containing qualifying/preliminary keywords
        if (isEflCup && canonicalName.startsWith("Unknown: ")) {
          const rawLabel = canonicalName.replace("Unknown: ", "").toLowerCase();
          const dropKeywords = ["prelim", "preliminary", "qualifying", "qualification"];
          if (dropKeywords.some(kw => rawLabel.includes(kw))) {
            continue; // Drop this round for EFL Cup
          }
        }
        
        // Sanity guard: check match count
        const maxMatches = ROUND_MAX_MATCHES[canonicalName];
        if (maxMatches && matchList.length > maxMatches) {
          if (DEBUG_CUP_ROUNDS) {
            console.log(`[Cup] Sanity guard: "${canonicalName}" has ${matchList.length} matches (limit ${maxMatches}), discarding`);
          }
          continue; // Discard rounds with too many matches (likely combined qualifying data)
        }
        
        // Sort matches by kickoff datetime
        matchList.sort((a: CupMatch, b: CupMatch) => {
          if (!a.kickoff && !b.kickoff) return 0;
          if (!a.kickoff) return 1;
          if (!b.kickoff) return -1;
          return a.kickoff.localeCompare(b.kickoff);
        });
        
        const order = CANONICAL_ROUNDS[canonicalName] ?? 99;
        
        // Compute round status: empty rounds are always "upcoming"
        let roundStatus: "completed" | "in_progress" | "upcoming" = "upcoming";
        if (matchList.length > 0) {
          const completedStatuses = ["ft", "aet", "pen", "awarded", "cancelled", "postponed"];
          const liveIndicators = ["ht", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
          
          const allCompleted = matchList.every((m) => {
            const s = m.status.toLowerCase();
            return completedStatuses.some(cs => s.includes(cs));
          });
          
          const anyLive = matchList.some((m) => {
            const s = m.status.toLowerCase();
            if (s === "ht") return true;
            if (/^\d+$/.test(s)) return true; // minute markers like "45", "90"
            return liveIndicators.some(li => s === li);
          });
          
          if (anyLive) {
            roundStatus = "in_progress";
          } else if (allCompleted) {
            roundStatus = "completed";
          }
        }
        
        cupRounds.push({
          name: canonicalName,
          order,
          matches: matchList,
          status: roundStatus,
        });
      }

      // Sort rounds by order (early rounds first)
      cupRounds.sort((a, b) => a.order - b.order);

      res.json({ competitionId, rounds: cupRounds });
    } catch (error) {
      console.error("Error fetching cup progress:", error);
      res.status(500).json({ error: "Failed to fetch cup progress" });
    }
  });

  // ========== EUROPE COMPETITIONS (UCL, UEL, UECL) ==========
  // Competition IDs: UCL=1005, UEL=1007, UECL=18853
  const EUROPE_COMPETITIONS: Record<string, { id: string; name: string; format: "league_phase" | "group_stage" }> = {
    "champions-league": { id: "1005", name: "UEFA Champions League", format: "league_phase" },
    "europa-league": { id: "1007", name: "UEFA Europa League", format: "league_phase" },
    "conference-league": { id: "18853", name: "UEFA Europa Conference League", format: "league_phase" },
  };

  // UCL knockout round mapping (Goalserve labels -> canonical names)
  const UCL_KNOCKOUT_ROUNDS: Record<string, { name: string; order: number }> = {
    "knockout round play-offs": { name: "Knockout Play-offs", order: 1 },
    "knockout play-offs": { name: "Knockout Play-offs", order: 1 },
    "play-offs": { name: "Knockout Play-offs", order: 1 },
    "1/8-finals": { name: "Round of 16", order: 2 },
    "round of 16": { name: "Round of 16", order: 2 },
    "1/4-finals": { name: "Quarter-finals", order: 3 },
    "quarter-finals": { name: "Quarter-finals", order: 3 },
    "quarterfinals": { name: "Quarter-finals", order: 3 },
    "1/2-finals": { name: "Semi-finals", order: 4 },
    "semi-finals": { name: "Semi-finals", order: 4 },
    "semifinals": { name: "Semi-finals", order: 4 },
    "final": { name: "Final", order: 5 },
  };

  app.get("/api/europe/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      const competition = EUROPE_COMPETITIONS[slug];
      
      if (!competition) {
        return res.status(404).json({ error: `Unknown competition: ${slug}` });
      }

      const feedKey = process.env.GOALSERVE_FEED_KEY;
      if (!feedKey) {
        return res.status(500).json({ error: "GOALSERVE_FEED_KEY not configured" });
      }

      const season = (req.query.season as string) || "2025/2026";
      const { goalserveFetch } = await import("./integrations/goalserve/client");

      // Fetch fixtures and standings in parallel
      const fixturesEndpoint = `soccerfixtures/leagueid/${competition.id}?season=${encodeURIComponent(season)}`;
      const standingsEndpoint = `standings/${competition.id}.xml`;

      let fixturesData: any = null;
      let standingsData: any = null;

      try {
        [fixturesData, standingsData] = await Promise.all([
          goalserveFetch(fixturesEndpoint).catch((e: any) => {
            console.log(`[Europe] Fixtures fetch error for ${slug}:`, e?.message?.slice(0, 200));
            return null;
          }),
          goalserveFetch(standingsEndpoint).catch((e: any) => {
            console.log(`[Europe] Standings fetch error for ${slug}:`, e?.message?.slice(0, 200));
            return null;
          }),
        ]);
      } catch (fetchError: any) {
        console.error(`[Europe] Parallel fetch error:`, fetchError?.message);
      }

      // Helper to extract attributes from Goalserve nodes
      const getAttr = (node: any, key: string): string | null => {
        if (!node || typeof node !== "object") return null;
        const direct = node[key];
        if (typeof direct === "string" && direct.trim()) return direct.trim();
        const at = node[`@${key}`];
        if (typeof at === "string" && at.trim()) return at.trim();
        const atUnderscore = node[`@_${key}`];
        if (typeof atUnderscore === "string" && atUnderscore.trim()) return atUnderscore.trim();
        const atObj = node["@"]?.[key];
        if (typeof atObj === "string" && atObj.trim()) return atObj.trim();
        const dollarObj = node["$"]?.[key];
        if (typeof dollarObj === "string" && dollarObj.trim()) return dollarObj.trim();
        return null;
      };

      // Parse match from Goalserve node
      interface EuropeMatch {
        id: string;
        home: { id?: string; name: string };
        away: { id?: string; name: string };
        score?: { home: number; away: number } | null;
        penalties?: { home: number; away: number } | null;
        kickoff?: string;
        kickoffDate?: string | null;
        kickoffTime?: string | null;
        status: string;
        venue?: string;
      }

      const parseMatch = (m: any): EuropeMatch | null => {
        const id = getAttr(m, "id") || getAttr(m, "static_id");
        if (!id) return null;

        const home = m.localteam || m.home || {};
        const away = m.visitorteam || m.visitor || m.away || {};
        
        const homeName = getAttr(home, "name") || "TBD";
        const awayName = getAttr(away, "name") || "TBD";
        const homeId = getAttr(home, "id");
        const awayId = getAttr(away, "id");

        // Parse score - try multiple Goalserve formats:
        // 1. Individual team scores (score/goals attribute on each team)
        // 2. Combined ft_score as "X-Y" on match
        // 3. Extra time score (et_score) for AET matches
        let homeScore: number | null = null;
        let awayScore: number | null = null;

        // Method 1: Individual score attributes on teams
        const homeScoreAttr = getAttr(home, "score") || getAttr(home, "goals");
        const awayScoreAttr = getAttr(away, "score") || getAttr(away, "goals");
        if (homeScoreAttr !== null && awayScoreAttr !== null) {
          const hParsed = parseInt(homeScoreAttr, 10);
          const aParsed = parseInt(awayScoreAttr, 10);
          if (!isNaN(hParsed) && !isNaN(aParsed)) {
            homeScore = hParsed;
            awayScore = aParsed;
          }
        }

        // Method 2: Combined ft_score as "X-Y"
        if (homeScore === null || awayScore === null) {
          const ftScore = getAttr(m, "ft_score") || getAttr(home, "ft_score");
          if (ftScore && ftScore.includes("-")) {
            const [h, a] = ftScore.split("-").map(s => parseInt(s.trim(), 10));
            if (!isNaN(h) && !isNaN(a)) {
              homeScore = h;
              awayScore = a;
            }
          }
        }

        // Method 3: Extra time score for AET matches
        if (homeScore === null || awayScore === null) {
          const etScore = getAttr(m, "et_score");
          if (etScore && etScore.includes("-")) {
            const [h, a] = etScore.split("-").map(s => parseInt(s.trim(), 10));
            if (!isNaN(h) && !isNaN(a)) {
              homeScore = h;
              awayScore = a;
            }
          }
        }

        // Method 4: Generic score attribute "X-Y" on match
        if (homeScore === null || awayScore === null) {
          const matchScore = getAttr(m, "score");
          if (matchScore && matchScore.includes("-")) {
            const [h, a] = matchScore.split("-").map(s => parseInt(s.trim(), 10));
            if (!isNaN(h) && !isNaN(a)) {
              homeScore = h;
              awayScore = a;
            }
          }
        }

        // Penalties - try multiple formats
        const penScore = getAttr(m, "pen_score") || getAttr(home, "pen_score");
        let penalties: { home: number; away: number } | null = null;
        if (penScore && penScore.includes("-")) {
          const [ph, pa] = penScore.split("-").map(s => parseInt(s.trim(), 10));
          if (!isNaN(ph) && !isNaN(pa)) {
            penalties = { home: ph, away: pa };
          }
        }

        // Date/time parsing
        const rawDate = getAttr(m, "date") || "";
        const rawTime = getAttr(m, "time") || "";
        let kickoffDate: string | null = null;
        let kickoffTime: string | null = null;

        if (rawDate) {
          const parts = rawDate.split(".");
          if (parts.length === 3) {
            kickoffDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
          }
        }
        if (rawTime && /^\d{1,2}:\d{2}$/.test(rawTime)) {
          kickoffTime = rawTime.length === 4 ? "0" + rawTime : rawTime;
        }

        const kickoff = kickoffDate && kickoffTime ? `${kickoffDate} ${kickoffTime}` : kickoffDate || "";

        // Status mapping
        const rawStatus = getAttr(m, "status") || "";
        let status = rawStatus;
        const lowerStatus = rawStatus.toLowerCase();
        if (lowerStatus === "not started" || rawStatus === "NS") status = "Not Started";
        else if (rawStatus === "FT" || lowerStatus === "finished" || lowerStatus === "full-time" || lowerStatus === "full time") status = "Full-Time";
        else if (rawStatus === "HT") status = "Half-Time";
        else if (rawStatus === "AET" || lowerStatus === "after extra time" || lowerStatus === "extra time") status = "AET";
        else if (rawStatus === "PEN" || lowerStatus.includes("penalty") || lowerStatus.includes("pens")) status = "Penalties";

        const venue = getAttr(m, "venue") || undefined;

        // Debug log for finished matches without scores
        const isFinished = ["Full-Time", "AET", "Penalties"].includes(status);
        if (isFinished && (homeScore === null || awayScore === null)) {
          console.warn("[EUROPE] Missing score for finished match", { 
            id, 
            status, 
            rawStatus,
            homeScoreAttr: getAttr(home, "score"),
            awayScoreAttr: getAttr(away, "score"),
            ftScore: getAttr(m, "ft_score"),
            etScore: getAttr(m, "et_score"),
            matchScore: getAttr(m, "score"),
            penScore
          });
        }

        return {
          id,
          home: { id: homeId || undefined, name: homeName },
          away: { id: awayId || undefined, name: awayName },
          score: homeScore !== null && awayScore !== null ? { home: homeScore, away: awayScore } : null,
          penalties,
          kickoff,
          kickoffDate,
          kickoffTime,
          status,
          venue,
        };
      };

      // Parse standings
      interface StandingTeam {
        position: number;
        name: string;
        teamId?: string;
        played: number;
        won: number;
        drawn: number;
        lost: number;
        goalsFor: number;
        goalsAgainst: number;
        goalDifference: number;
        points: number;
        recentForm?: string;
        description?: string;
      }

      const standings: StandingTeam[] = [];
      
      if (standingsData) {
        const standingsRoot = standingsData?.standings || standingsData;
        const tournaments = Array.isArray(standingsRoot?.tournament) 
          ? standingsRoot.tournament 
          : standingsRoot?.tournament 
            ? [standingsRoot.tournament] 
            : [];

        for (const tournament of tournaments) {
          const teams = Array.isArray(tournament?.team) ? tournament.team : tournament?.team ? [tournament.team] : [];
          
          for (const team of teams) {
            const position = parseInt(getAttr(team, "position") || "0", 10);
            const name = getAttr(team, "name") || "Unknown";
            const teamId = getAttr(team, "id") || undefined;
            const recentForm = getAttr(team, "recent_form") || undefined;
            
            const overall = team.overall || {};
            const total = team.total || {};
            const description = team.description || {};
            
            const played = parseInt(getAttr(overall, "gp") || "0", 10);
            const won = parseInt(getAttr(overall, "w") || "0", 10);
            const drawn = parseInt(getAttr(overall, "d") || "0", 10);
            const lost = parseInt(getAttr(overall, "l") || "0", 10);
            const goalsFor = parseInt(getAttr(overall, "gs") || "0", 10);
            const goalsAgainst = parseInt(getAttr(overall, "ga") || "0", 10);
            const goalDifference = parseInt(getAttr(total, "gd") || "0", 10);
            const points = parseInt(getAttr(total, "p") || "0", 10);
            const descValue = getAttr(description, "value") || undefined;

            standings.push({
              position,
              name,
              teamId,
              played,
              won,
              drawn,
              lost,
              goalsFor,
              goalsAgainst,
              goalDifference,
              points,
              recentForm,
              description: descValue,
            });
          }
        }

        // Sort by position
        standings.sort((a, b) => a.position - b.position);
      }

      // Parse fixtures into matchdays and knockout rounds
      interface Matchday {
        matchday: number;
        matches: EuropeMatch[];
      }

      interface KnockoutRound {
        name: string;
        order: number;
        matches: EuropeMatch[];
        status: "completed" | "in_progress" | "upcoming";
      }

      const matchdays: Matchday[] = [];
      const knockoutRoundsMap = new Map<string, EuropeMatch[]>();
      const seenMatchIds = new Set<string>();

      if (fixturesData) {
        const results = fixturesData?.results || fixturesData;
        const tournaments = Array.isArray(results?.tournament)
          ? results.tournament
          : results?.tournament
            ? [results.tournament]
            : [];

        for (const tournament of tournaments) {
          const stages = Array.isArray(tournament?.stage)
            ? tournament.stage
            : tournament?.stage
              ? [tournament.stage]
              : [];

          for (const stage of stages) {
            const stageName = (getAttr(stage, "name") || "").toLowerCase();
            const stageRound = (getAttr(stage, "round") || "").toLowerCase();

            // Check if this is League Phase (has weeks/matchdays)
            const isLeaguePhase = stageName.includes("league phase") || 
                                  stageName.includes("group") || 
                                  stageRound.includes("group");

            if (isLeaguePhase) {
              // Parse weeks/matchdays
              const weeks = Array.isArray(stage?.week)
                ? stage.week
                : stage?.week
                  ? [stage.week]
                  : [];

              for (const week of weeks) {
                const weekNumber = parseInt(getAttr(week, "number") || "0", 10);
                if (weekNumber <= 0) continue;

                const matches = Array.isArray(week?.match)
                  ? week.match
                  : week?.match
                    ? [week.match]
                    : [];

                const parsedMatches: EuropeMatch[] = [];
                for (const m of matches) {
                  const parsed = parseMatch(m);
                  if (parsed && !seenMatchIds.has(parsed.id)) {
                    seenMatchIds.add(parsed.id);
                    parsedMatches.push(parsed);
                  }
                }

                if (parsedMatches.length > 0) {
                  // Sort matches by kickoff
                  parsedMatches.sort((a, b) => (a.kickoff || "").localeCompare(b.kickoff || ""));

                  const existing = matchdays.find(md => md.matchday === weekNumber);
                  if (existing) {
                    existing.matches.push(...parsedMatches);
                  } else {
                    matchdays.push({ matchday: weekNumber, matches: parsedMatches });
                  }
                }
              }
            } else if (!stageName.includes("qualifying")) {
              // Knockout stage - map to canonical round names
              const roundKey = stageName || stageRound;
              const roundMapping = UCL_KNOCKOUT_ROUNDS[roundKey];

              if (roundMapping) {
                const matches = Array.isArray(stage?.match)
                  ? stage.match
                  : stage?.match
                    ? [stage.match]
                    : [];

                // Also check for weeks in knockout (two-legged ties)
                const weeks = Array.isArray(stage?.week)
                  ? stage.week
                  : stage?.week
                    ? [stage.week]
                    : [];

                const allMatches: any[] = [...matches];
                for (const week of weeks) {
                  const weekMatches = Array.isArray(week?.match)
                    ? week.match
                    : week?.match
                      ? [week.match]
                      : [];
                  allMatches.push(...weekMatches);
                }

                for (const m of allMatches) {
                  const parsed = parseMatch(m);
                  if (parsed && !seenMatchIds.has(parsed.id)) {
                    seenMatchIds.add(parsed.id);
                    const existing = knockoutRoundsMap.get(roundMapping.name) || [];
                    existing.push(parsed);
                    knockoutRoundsMap.set(roundMapping.name, existing);
                  }
                }
              } else {
                console.log(`[Europe] Unknown knockout stage: "${stageName}" / "${stageRound}" for ${slug}`);
              }
            }
          }
        }
      }

      // Sort matchdays
      matchdays.sort((a, b) => a.matchday - b.matchday);

      // Helper to compute rounds from matches for unified navigation
      interface RoundInfo {
        key: string;
        index: number;
        label: string;
        startDate: string | null;
        endDate: string | null;
        matchesCount: number;
        hasAnyMatches: boolean;
      }

      const computeRounds = (
        matchdays: Matchday[], 
        knockoutRoundsMap: Map<string, EuropeMatch[]>
      ): { rounds: RoundInfo[]; matchesByRound: Record<string, EuropeMatch[]>; latestRoundKey: string } => {
        const rounds: RoundInfo[] = [];
        const matchesByRound: Record<string, EuropeMatch[]> = {};
        let latestRoundKey = "1";
        let roundIndex = 0;

        // Add league phase matchdays
        for (const md of matchdays) {
          const key = String(md.matchday);
          matchesByRound[key] = md.matches;
          
          let startDate: string | null = null;
          let endDate: string | null = null;
          
          if (md.matches.length > 0) {
            const dates = md.matches
              .map(m => m.kickoffDate)
              .filter((d): d is string => !!d)
              .sort();
            if (dates.length > 0) {
              startDate = dates[0];
              endDate = dates[dates.length - 1];
            }
          }
          
          rounds.push({
            key,
            index: roundIndex++,
            label: String(md.matchday),
            startDate,
            endDate,
            matchesCount: md.matches.length,
            hasAnyMatches: md.matches.length > 0,
          });
          
          if (md.matches.length > 0) {
            latestRoundKey = key;
          }
        }

        // Add knockout rounds
        const koOrder = ["Knockout Play-offs", "Round of 16", "Quarter-finals", "Semi-finals", "Final"];
        const koKeyMap: Record<string, string> = {
          "Knockout Play-offs": "PO",
          "Round of 16": "L16",
          "Quarter-finals": "QF",
          "Semi-finals": "SF",
          "Final": "F",
        };
        
        for (const roundName of koOrder) {
          const matches = knockoutRoundsMap.get(roundName) || [];
          const key = koKeyMap[roundName];
          
          matchesByRound[key] = matches;
          
          let startDate: string | null = null;
          let endDate: string | null = null;
          
          if (matches.length > 0) {
            const dates = matches
              .map(m => m.kickoffDate)
              .filter((d): d is string => !!d)
              .sort();
            if (dates.length > 0) {
              startDate = dates[0];
              endDate = dates[dates.length - 1];
            }
          }
          
          rounds.push({
            key,
            index: roundIndex++,
            label: roundName.replace("Knockout Play-offs", "Play-offs"),
            startDate,
            endDate,
            matchesCount: matches.length,
            hasAnyMatches: matches.length > 0,
          });
          
          if (matches.length > 0) {
            latestRoundKey = key;
          }
        }

        return { rounds, matchesByRound, latestRoundKey };
      }

      // Build knockout rounds array with status
      const knockoutRounds: KnockoutRound[] = [];
      const knockoutEntries = Array.from(knockoutRoundsMap.entries());
      for (const [name, matches] of knockoutEntries) {
        const mapping = Object.values(UCL_KNOCKOUT_ROUNDS).find((m: { name: string; order: number }) => m.name === name);
        if (!mapping) continue;

        // Sort matches by kickoff
        matches.sort((a: EuropeMatch, b: EuropeMatch) => (a.kickoff || "").localeCompare(b.kickoff || ""));

        // Determine status
        const allCompleted = matches.every((m: EuropeMatch) => 
          m.status === "Full-Time" || m.status === "AET" || m.status === "Penalties"
        );
        const anyLive = matches.some((m: EuropeMatch) => 
          m.status !== "Not Started" && m.status !== "Full-Time" && 
          m.status !== "AET" && m.status !== "Penalties"
        );

        let status: "completed" | "in_progress" | "upcoming" = "upcoming";
        if (allCompleted && matches.length > 0) status = "completed";
        else if (anyLive) status = "in_progress";

        knockoutRounds.push({
          name,
          order: mapping.order,
          matches,
          status,
        });
      }

      // Sort knockout rounds by order
      knockoutRounds.sort((a, b) => a.order - b.order);

      // Compute unified rounds data for navigation
      const { rounds, matchesByRound, latestRoundKey } = computeRounds(matchdays, knockoutRoundsMap);

      // Build response
      const response = {
        competition: {
          slug,
          name: competition.name,
          country: "Europe",
          goalserveCompetitionId: competition.id,
        },
        season,
        standings,
        rounds,
        matchesByRound,
        latestRoundKey,
        phases: [
          {
            type: "league_phase" as const,
            name: "League Phase",
            standings,
            matchdays,
          },
          {
            type: "knockout" as const,
            name: "Knockout Stage",
            rounds: knockoutRounds,
          },
        ],
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching Europe competition:", error);
      res.status(500).json({ error: "Failed to fetch Europe competition" });
    }
  });

  // ========== FPL AVAILABILITY (Team Hub Injuries) ==========
  app.get("/api/teams/:teamSlug/availability", async (req, res) => {
    try {
      const { teamSlug } = req.params;
      const sortBy = req.query.sort === "lowest" ? "lowest" : "recent";
      
      const availability = await storage.getFplAvailabilityByTeam(teamSlug, sortBy);
      
      const enriched = availability.map((player) => {
        const result = classifyPlayer(player.chanceNextRound, player.chanceThisRound, player.fplStatus, player.news);
        return {
          ...player,
          classification: result.classification,
          bucket: result.bucket,
          ringColor: result.ringColor,
          displayPercent: result.displayPercent,
          effectiveChance: result.effectiveChance,
        };
      });
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });

  // Global availability endpoint for Treatment Room page
  app.get("/api/availability", async (req, res) => {
    try {
      const availability = await storage.getAllFplAvailability();
      const teams = await storage.getTeams();
      
      const teamMap = new Map(teams.map(t => [t.slug, { name: t.name, shortName: t.shortName }]));
      
      const enriched = availability.map((player) => {
        const result = classifyPlayer(player.chanceNextRound, player.chanceThisRound, player.fplStatus, player.news);
        const teamInfo = teamMap.get(player.teamSlug);
        return {
          ...player,
          teamName: teamInfo?.name || player.teamSlug,
          teamShortName: teamInfo?.shortName || player.teamSlug.toUpperCase().slice(0, 3),
          classification: result.classification,
          bucket: result.bucket,
          ringColor: result.ringColor,
          displayPercent: result.displayPercent,
          effectiveChance: result.effectiveChance,
        };
      });
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching global availability:", error);
      res.status(500).json({ error: "Failed to fetch availability" });
    }
  });
}
