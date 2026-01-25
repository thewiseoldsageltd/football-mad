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

      res.json({
        snapshot: {
          leagueId: snapshot.leagueId,
          season: snapshot.season,
          stageId: snapshot.stageId,
          asOf: snapshot.asOf,
        },
        table,
      });
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ error: "Failed to fetch standings" });
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
