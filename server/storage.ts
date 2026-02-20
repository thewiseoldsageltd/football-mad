import { db } from "./db";
import { eq, and, desc, ilike, sql, or, inArray, gte, lt } from "drizzle-orm";
import {
  teams, players, articles, articleTeams, matches, transfers, injuries,
  follows, posts, comments, reactions, products, orders, subscribers, shareClicks,
  fplPlayerAvailability, managers, articleManagers, articlePlayers,
  competitions, articleCompetitions,
  type Team, type InsertTeam,
  type Player, type InsertPlayer,
  type Article, type InsertArticle,
  type Match, type InsertMatch,
  type Transfer, type InsertTransfer,
  type Injury, type InsertInjury,
  type Follow, type InsertFollow,
  type Post, type InsertPost,
  type Comment, type InsertComment,
  type Reaction, type InsertReaction,
  type Product, type InsertProduct,
  type Order, type InsertOrder,
  type Subscriber, type InsertSubscriber,
  type FplPlayerAvailability,
  type Manager,
  type Competition,
  NEWS_COMPETITIONS,
  NEWS_TIME_RANGES,
  type NewsFiltersResponse,
} from "@shared/schema";

// Minimal entity data for article pills
export interface ArticleEntityPill {
  type: "competition" | "team" | "player" | "manager";
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  fallbackText: string;
  color?: string;
}

export interface EntityWithProvenance {
  id: string;
  name: string;
  slug: string;
  source: string;
  salienceScore: number;
}

export interface ArticleWithEntities extends Article {
  entityTeams: (Pick<Team, "id" | "name" | "slug" | "shortName" | "primaryColor" | "logoUrl"> & { source: string; salienceScore: number })[];
  entityPlayers: (Pick<Player, "id" | "name" | "slug"> & { source: string; salienceScore: number })[];
  entityManagers: (Pick<Manager, "id" | "name" | "slug"> & { source: string; salienceScore: number })[];
  entityCompetitions: (Pick<Competition, "id" | "name" | "slug"> & { source: string; salienceScore: number })[];
}

export interface NewsFilterParams {
  comp: string;
  type: string[];
  teamSlugs: string[];
  sort: string;
  range: string;
  breaking: boolean;
  limit?: number;
  cursor?: string; // Format: "sortAt|id" for stable cursor pagination
}

export interface NewsUpdatesParams {
  since?: string;       // ISO timestamp
  sinceId?: string;     // UUID tie-breaker
  limit: number;        // default 200, max 500
}

export interface NewsUpdatesResponse {
  articles: any[];
  nextCursor: { since: string; sinceId: string } | null;
  serverTime: string;
}

export interface IStorage {
  // Teams
  getTeams(): Promise<Team[]>;
  getTeamBySlug(slug: string): Promise<Team | undefined>;
  getTeamById(id: string): Promise<Team | undefined>;
  createTeam(data: InsertTeam): Promise<Team>;
  
  // Players
  getPlayersByTeam(teamId: string): Promise<Player[]>;
  getPlayerBySlug(slug: string): Promise<(Player & { team?: Team | null }) | undefined>;
  createPlayer(data: InsertPlayer): Promise<Player>;
  
  // Articles
  getArticles(category?: string): Promise<Article[]>;
  getArticleBySlug(slug: string): Promise<Article | undefined>;
  getArticleWithEntities(slug: string): Promise<ArticleWithEntities | undefined>;
  getArticlesByTeam(teamSlug: string): Promise<Article[]>;
  createArticle(data: InsertArticle): Promise<Article>;
  incrementArticleViews(id: string): Promise<void>;
  getNewsArticles(params: NewsFilterParams): Promise<NewsFiltersResponse>;
  getNewsUpdates(params: NewsUpdatesParams): Promise<NewsUpdatesResponse>;
  
  // Matches
  getMatches(): Promise<(Match & { homeTeam?: Team; awayTeam?: Team })[]>;
  getMatchBySlug(slug: string): Promise<(Match & { homeTeam?: Team; awayTeam?: Team }) | undefined>;
  getMatchesByTeam(teamSlug: string): Promise<(Match & { homeTeam?: Team; awayTeam?: Team })[]>;
  createMatch(data: InsertMatch): Promise<Match>;
  
  // Transfers
  getTransfers(): Promise<Transfer[]>;
  getTransfersByTeam(teamSlug: string): Promise<Transfer[]>;
  createTransfer(data: InsertTransfer): Promise<Transfer>;
  
  // Injuries
  getInjuries(): Promise<Injury[]>;
  getInjuriesByTeam(teamSlug: string): Promise<Injury[]>;
  createInjury(data: InsertInjury): Promise<Injury>;
  
  // Follows
  getFollowsByUser(userId: string): Promise<string[]>;
  getFollowedTeams(userId: string): Promise<Team[]>;
  followTeam(userId: string, teamId: string): Promise<Follow>;
  unfollowTeam(userId: string, teamId: string): Promise<void>;
  
  // Posts
  getPosts(): Promise<(Post & { team?: Team })[]>;
  getPostsByTeam(teamSlug: string): Promise<(Post & { team?: Team })[]>;
  getPostById(id: string): Promise<Post | undefined>;
  createPost(data: InsertPost): Promise<Post>;
  likePost(postId: string, userId: string): Promise<void>;
  
  // Comments
  getCommentsByPost(postId: string): Promise<Comment[]>;
  createComment(data: InsertComment): Promise<Comment>;
  
  // Products
  getProducts(): Promise<(Product & { team?: Team })[]>;
  getProductBySlug(slug: string): Promise<(Product & { team?: Team }) | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  
  // Orders
  getOrdersByUser(userId: string): Promise<Order[]>;
  createOrder(data: InsertOrder): Promise<Order>;
  
  // Subscribers
  createSubscriber(data: InsertSubscriber): Promise<Subscriber>;
  
  // Share Analytics
  trackShareClick(articleId: string, platform: string, userId?: string, userAgent?: string): Promise<void>;
  
  // FPL Availability
  getFplAvailabilityByTeam(teamSlug: string, sortBy?: "recent" | "lowest"): Promise<FplPlayerAvailability[]>;
  getAllFplAvailability(): Promise<FplPlayerAvailability[]>;
}

export class DatabaseStorage implements IStorage {
  // Teams
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams).orderBy(teams.name);
  }

  async getTeamBySlug(slug: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.slug, slug));
    return team;
  }

  async getTeamById(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async createTeam(data: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  }

  // Players
  async getAllPlayers(): Promise<Player[]> {
    return db.select().from(players).orderBy(players.name);
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    return db.select().from(players).where(eq(players.teamId, teamId));
  }

  async getPlayerBySlug(slug: string): Promise<(Player & { team?: Team | null }) | undefined> {
    const result = await db
      .select({
        player: players,
        team: teams,
      })
      .from(players)
      .leftJoin(teams, eq(players.teamId, teams.id))
      .where(eq(players.slug, slug))
      .limit(1);

    if (result.length === 0) return undefined;

    return {
      ...result[0].player,
      team: result[0].team,
    };
  }

  async createPlayer(data: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(data).returning();
    return player;
  }

  // Managers
  async getAllManagers(): Promise<Manager[]> {
    return db.select().from(managers).orderBy(managers.name);
  }

  async getManagerBySlug(slug: string): Promise<Manager | undefined> {
    const [manager] = await db.select().from(managers).where(eq(managers.slug, slug));
    return manager;
  }

  async getManagersByTeamId(teamId: string): Promise<Manager[]> {
    return db.select().from(managers).where(eq(managers.currentTeamId, teamId)).orderBy(managers.name);
  }

  async upsertManager(data: {
    id?: string;
    name: string;
    slug: string;
    nationality?: string | null;
    imageUrl?: string | null;
    currentTeamId?: string | null;
    goalserveManagerId?: string | null;
  }): Promise<Manager> {
    const [manager] = await db
      .insert(managers)
      .values(data)
      .onConflictDoUpdate({
        target: managers.slug,
        set: {
          name: data.name,
          nationality: data.nationality,
          currentTeamId: data.currentTeamId,
          goalserveManagerId: data.goalserveManagerId,
        },
      })
      .returning();
    return manager;
  }

  async upsertManagerByGoalserveId(data: {
    name: string;
    slug: string;
    nationality?: string | null;
    imageUrl?: string | null;
    currentTeamId?: string | null;
    goalserveManagerId: string;
  }): Promise<Manager> {
    const existing = await db.select().from(managers).where(eq(managers.goalserveManagerId, data.goalserveManagerId)).limit(1);
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(managers)
        .set({
          name: data.name,
          nationality: data.nationality,
          currentTeamId: data.currentTeamId,
        })
        .where(eq(managers.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [inserted] = await db
      .insert(managers)
      .values(data)
      .onConflictDoNothing()
      .returning();
    
    if (!inserted) {
      const [found] = await db.select().from(managers).where(eq(managers.slug, data.slug)).limit(1);
      if (found) {
        const [updated] = await db
          .update(managers)
          .set({
            currentTeamId: data.currentTeamId,
            goalserveManagerId: data.goalserveManagerId,
          })
          .where(eq(managers.id, found.id))
          .returning();
        return updated;
      }
      throw new Error(`Manager with slug ${data.slug} not found after conflict`);
    }
    return inserted;
  }

  async upsertManagers(managerList: Array<{
    name: string;
    slug: string;
    nationality?: string | null;
    imageUrl?: string | null;
    currentTeamId?: string | null;
    goalserveManagerId: string;
  }>): Promise<Manager[]> {
    if (managerList.length === 0) return [];
    
    const results: Manager[] = [];
    for (const data of managerList) {
      const manager = await this.upsertManagerByGoalserveId(data);
      results.push(manager);
    }
    return results;
  }

  // Articles
  async getArticles(category?: string): Promise<Article[]> {
    if (category && category !== "all") {
      return db.select().from(articles)
        .where(eq(articles.category, category))
        .orderBy(desc(articles.publishedAt));
    }
    return db.select().from(articles).orderBy(desc(articles.publishedAt));
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    return article;
  }

  async getArticleWithEntities(slug: string): Promise<ArticleWithEntities | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    if (!article) return undefined;

    // Fetch linked teams with provenance
    const teamRows = await db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        shortName: teams.shortName,
        primaryColor: teams.primaryColor,
        logoUrl: teams.logoUrl,
        source: articleTeams.source,
        salienceScore: articleTeams.salienceScore,
      })
      .from(articleTeams)
      .innerJoin(teams, eq(articleTeams.teamId, teams.id))
      .where(eq(articleTeams.articleId, article.id))
      .orderBy(desc(articleTeams.salienceScore));

    // Fetch linked players with provenance
    const playerRows = await db
      .select({
        id: players.id,
        name: players.name,
        slug: players.slug,
        source: articlePlayers.source,
        salienceScore: articlePlayers.salienceScore,
      })
      .from(articlePlayers)
      .innerJoin(players, eq(articlePlayers.playerId, players.id))
      .where(eq(articlePlayers.articleId, article.id))
      .orderBy(desc(articlePlayers.salienceScore));

    // Fetch linked managers with provenance
    const managerRows = await db
      .select({
        id: managers.id,
        name: managers.name,
        slug: managers.slug,
        source: articleManagers.source,
        salienceScore: articleManagers.salienceScore,
      })
      .from(articleManagers)
      .innerJoin(managers, eq(articleManagers.managerId, managers.id))
      .where(eq(articleManagers.articleId, article.id))
      .orderBy(desc(articleManagers.salienceScore));

    // Fetch linked competitions with provenance
    const competitionRows = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        slug: competitions.slug,
        source: articleCompetitions.source,
        salienceScore: articleCompetitions.salienceScore,
      })
      .from(articleCompetitions)
      .innerJoin(competitions, eq(articleCompetitions.competitionId, competitions.id))
      .where(eq(articleCompetitions.articleId, article.id))
      .orderBy(desc(articleCompetitions.salienceScore));

    return {
      ...article,
      entityTeams: teamRows,
      entityPlayers: playerRows,
      entityManagers: managerRows,
      entityCompetitions: competitionRows,
    };
  }

  async getArticlesByTeam(teamSlug: string): Promise<Article[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];
    
    const result = await db
      .select({ article: articles })
      .from(articles)
      .innerJoin(articleTeams, eq(articleTeams.articleId, articles.id))
      .where(eq(articleTeams.teamId, team.id))
      .orderBy(desc(articles.publishedAt));
    
    return result.map(r => r.article);
  }

  async createArticle(data: InsertArticle): Promise<Article> {
    const [article] = await db.insert(articles).values(data).returning();
    return article;
  }

  async incrementArticleViews(id: string): Promise<void> {
    await db.update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, id));
  }

  /** Harden list row for /api/news and /api/news/updates so null fields (e.g. PA Media tags) don't break the UI. */
  normalizeArticleListRow<T extends Record<string, unknown>>(row: T): T & { excerpt: string; tags: unknown[]; competition: string | null; contentType: string; coverImage: string | null; authorName: string } {
    return {
      ...row,
      excerpt: row.excerpt ?? "",
      tags: row.tags ?? [],
      competition: row.competition ?? null,
      contentType: row.contentType ?? "story",
      coverImage: row.coverImage ?? null,
      authorName: row.authorName ?? "PA Media",
    };
  }

  async getNewsArticles(params: NewsFilterParams): Promise<NewsFiltersResponse> {
    const { comp, type, teamSlugs, sort, range, breaking, limit: limitParam, cursor } = params;
    const limit = limitParam ?? 15; // Default to 15 (5 rows of 3)
    
    const conditions: any[] = [];
    
    if (comp !== "all") {
      const compConfig = NEWS_COMPETITIONS[comp as keyof typeof NEWS_COMPETITIONS];
      if (compConfig && "dbValue" in compConfig) {
        conditions.push(eq(articles.competition, compConfig.dbValue));
      }
    }
    
    if (type.length > 0) {
      conditions.push(inArray(articles.contentType, type));
    }
    
    if (breaking) {
      conditions.push(eq(articles.isBreaking, true));
    }
    
    if (range !== "all") {
      const rangeConfig = NEWS_TIME_RANGES[range as keyof typeof NEWS_TIME_RANGES];
      if (rangeConfig && rangeConfig.hours) {
        const cutoff = new Date(Date.now() - rangeConfig.hours * 60 * 60 * 1000);
        conditions.push(gte(articles.publishedAt, cutoff));
      }
    }
    
    let teamIds: string[] = [];
    if (teamSlugs.length > 0) {
      const teamResults = await db.select().from(teams).where(inArray(teams.slug, teamSlugs));
      teamIds = teamResults.map(t => t.id);
    }
    
    // Lightweight fields for article list (no content/html)
    const listFields = {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      heroImageCredit: articles.heroImageCredit,
      authorName: articles.authorName,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      sourceUpdatedAt: articles.sourceUpdatedAt,
      sortAt: articles.sortAt, // Indexed column for fast pagination
      competition: articles.competition,
      contentType: articles.contentType,
      tags: articles.tags,
      isFeatured: articles.isFeatured,
      isTrending: articles.isTrending,
      isBreaking: articles.isBreaking,
      viewCount: articles.viewCount,
      commentsCount: articles.commentsCount,
    };
    
    if (teamIds.length > 0) {
      const articleIdsWithTeams = await db
        .selectDistinct({ articleId: articleTeams.articleId })
        .from(articleTeams)
        .where(inArray(articleTeams.teamId, teamIds));
      
      const articleIdList = articleIdsWithTeams.map(a => a.articleId);
      
      if (articleIdList.length > 0) {
        conditions.push(inArray(articles.id, articleIdList));
      } else {
        return {
          articles: [],
          appliedFilters: {
            comp,
            type,
            teams: teamSlugs,
            myTeams: false,
            sort,
            range,
            breaking,
            total: 0,
          },
          nextCursor: null,
          hasMore: false,
        };
      }
    }
    
    // Add cursor condition if provided (for pagination using sortAt|id format)
    if (cursor) {
      const parts = cursor.split("|");
      if (parts.length === 2) {
        const [cursorSortAt, cursorId] = parts;
        const cursorDate = new Date(cursorSortAt);
        // WHERE (sortAt < cursorSortAt) OR (sortAt = cursorSortAt AND id < cursorId)
        conditions.push(
          or(
            lt(articles.sortAt, cursorDate),
            and(eq(articles.sortAt, cursorDate), lt(articles.id, cursorId))
          )
        );
      }
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Order by sortAt DESC, id DESC for stable cursor pagination (uses composite index)
    let orderByClauses;
    switch (sort) {
      case "trending":
        orderByClauses = [desc(articles.viewCount), desc(articles.sortAt), desc(articles.id)];
        break;
      case "discussed":
        orderByClauses = [desc(articles.commentsCount), desc(articles.sortAt), desc(articles.id)];
        break;
      default:
        // Use indexed sortAt column for fast pagination
        orderByClauses = [desc(articles.sortAt), desc(articles.id)];
    }
    
    // Fetch limit + 1 to check if there are more results
    let result;
    if (whereClause) {
      result = await db.select(listFields).from(articles).where(whereClause).orderBy(...orderByClauses).limit(limit + 1);
    } else {
      result = await db.select(listFields).from(articles).orderBy(...orderByClauses).limit(limit + 1);
    }
    
    const hasMore = result.length > limit;
    const rawSlice = hasMore ? result.slice(0, limit) : result;
    const articlesToReturn = rawSlice.map((row) => this.normalizeArticleListRow(row));
    
    // Build nextCursor from last article's sortAt and id (stable cursor)
    let nextCursor: string | null = null;
    if (hasMore && articlesToReturn.length > 0) {
      const lastArticle = articlesToReturn[articlesToReturn.length - 1];
      const sortAtValue = lastArticle.sortAt || lastArticle.sourceUpdatedAt || lastArticle.publishedAt || lastArticle.createdAt;
      if (sortAtValue) {
        nextCursor = `${new Date(sortAtValue).toISOString()}|${lastArticle.id}`;
      }
    }
    
    return {
      articles: articlesToReturn,
      appliedFilters: {
        comp,
        type,
        teams: teamSlugs,
        myTeams: false,
        sort,
        range,
        breaking,
        total: articlesToReturn.length,
      },
      nextCursor,
      hasMore,
    };
  }

  async getNewsUpdates(params: NewsUpdatesParams): Promise<NewsUpdatesResponse> {
    const { since, sinceId, limit } = params;
    const serverTime = new Date().toISOString();
    
    // Lightweight fields for article list (no content/html)
    const listFields = {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      coverImage: articles.coverImage,
      heroImageCredit: articles.heroImageCredit,
      authorName: articles.authorName,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      sourceUpdatedAt: articles.sourceUpdatedAt,
      competition: articles.competition,
      contentType: articles.contentType,
      tags: articles.tags,
      isFeatured: articles.isFeatured,
      isTrending: articles.isTrending,
      isBreaking: articles.isBreaking,
      viewCount: articles.viewCount,
      commentsCount: articles.commentsCount,
    };
    
    // Timestamp expression: use sourceUpdatedAt or publishedAt (NOT updatedAt, to avoid old articles appearing fresh after re-ingest)
    const tsExpr = sql`COALESCE(${articles.sourceUpdatedAt}, ${articles.publishedAt}, ${articles.createdAt})`;
    
    let rows;
    
    if (!since) {
      // FIRST LOAD: get latest N (DESC), then reverse for UI stability (oldest→newest)
      rows = await db
        .select(listFields)
        .from(articles)
        .orderBy(desc(tsExpr), desc(articles.id))
        .limit(limit);
      
      rows = rows.reverse(); // Return ASC for UI stability
    } else {
      // POLLING: only newer than cursor, ordered ASC
      const sinceDate = new Date(since);
      
      if (sinceId) {
        // (ts > since) OR (ts = since AND id > sinceId)
        rows = await db
          .select(listFields)
          .from(articles)
          .where(
            or(
              sql`${tsExpr} > ${sinceDate}`,
              and(
                sql`${tsExpr} = ${sinceDate}`,
                sql`${articles.id} > ${sinceId}`
              )
            )
          )
          .orderBy(tsExpr, articles.id)
          .limit(limit);
      } else {
        rows = await db
          .select(listFields)
          .from(articles)
          .where(sql`${tsExpr} > ${sinceDate}`)
          .orderBy(tsExpr, articles.id)
          .limit(limit);
      }
    }
    
    // Build nextCursor from last article - use sourceUpdatedAt first to detect Ghost edits
    const last = rows[rows.length - 1];
    const nextCursor = last
      ? { 
          since: new Date(last.sourceUpdatedAt || last.publishedAt || last.createdAt!).toISOString(), 
          sinceId: last.id 
        }
      : (since ? { since, sinceId: sinceId || "" } : null);
    
    const normalizedRows = rows.map((row) => this.normalizeArticleListRow(row));
    return {
      articles: normalizedRows,
      nextCursor,
      serverTime,
    };
  }

  // Matches
  async getMatches(): Promise<(Match & { homeTeam?: Team; awayTeam?: Team })[]> {
    const results = await db.select().from(matches).orderBy(matches.kickoffTime);
    const enriched = await Promise.all(results.map(async (match) => {
      const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId));
      const [awayTeam] = await db.select().from(teams).where(eq(teams.id, match.awayTeamId));
      return { ...match, homeTeam, awayTeam };
    }));
    return enriched;
  }

  async getMatchBySlug(slug: string): Promise<(Match & { homeTeam?: Team; awayTeam?: Team }) | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.slug, slug));
    if (!match) return undefined;
    const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId));
    const [awayTeam] = await db.select().from(teams).where(eq(teams.id, match.awayTeamId));
    return { ...match, homeTeam, awayTeam };
  }

  async getMatchesByTeam(teamSlug: string): Promise<(Match & { homeTeam?: Team; awayTeam?: Team })[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];
    
    const results = await db.select().from(matches)
      .where(or(eq(matches.homeTeamId, team.id), eq(matches.awayTeamId, team.id)))
      .orderBy(matches.kickoffTime);
    
    const enriched = await Promise.all(results.map(async (match) => {
      const [homeTeam] = await db.select().from(teams).where(eq(teams.id, match.homeTeamId));
      const [awayTeam] = await db.select().from(teams).where(eq(teams.id, match.awayTeamId));
      return { ...match, homeTeam, awayTeam };
    }));
    return enriched;
  }

  async createMatch(data: InsertMatch): Promise<Match> {
    const [match] = await db.insert(matches).values(data).returning();
    return match;
  }

  // Transfers
  async getTransfers(): Promise<Transfer[]> {
    return db.select().from(transfers).orderBy(desc(transfers.createdAt));
  }

  async getTransfersByTeam(teamSlug: string): Promise<Transfer[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];
    return db.select().from(transfers)
      .where(or(eq(transfers.fromTeamId, team.id), eq(transfers.toTeamId, team.id)))
      .orderBy(desc(transfers.createdAt));
  }

  async createTransfer(data: InsertTransfer): Promise<Transfer> {
    const [transfer] = await db.insert(transfers).values(data).returning();
    return transfer;
  }

  // Injuries
  async getInjuries(): Promise<Injury[]> {
    return db.select().from(injuries).orderBy(desc(injuries.createdAt));
  }

  async getInjuriesByTeam(teamSlug: string): Promise<Injury[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];
    return db.select().from(injuries)
      .where(eq(injuries.teamId, team.id))
      .orderBy(desc(injuries.createdAt));
  }

  async createInjury(data: InsertInjury): Promise<Injury> {
    const [injury] = await db.insert(injuries).values(data).returning();
    return injury;
  }

  // Follows
  async getFollowsByUser(userId: string): Promise<string[]> {
    const result = await db.select({ teamId: follows.teamId })
      .from(follows)
      .where(eq(follows.userId, userId));
    return result.map(r => r.teamId);
  }

  async getFollowedTeams(userId: string): Promise<Team[]> {
    const result = await db
      .select({ team: teams })
      .from(follows)
      .innerJoin(teams, eq(follows.teamId, teams.id))
      .where(eq(follows.userId, userId));
    return result.map(r => r.team);
  }

  async followTeam(userId: string, teamId: string): Promise<Follow> {
    const existing = await db.select().from(follows)
      .where(and(eq(follows.userId, userId), eq(follows.teamId, teamId)));
    if (existing.length > 0) return existing[0];
    
    const [follow] = await db.insert(follows).values({ userId, teamId }).returning();
    return follow;
  }

  async unfollowTeam(userId: string, teamId: string): Promise<void> {
    await db.delete(follows)
      .where(and(eq(follows.userId, userId), eq(follows.teamId, teamId)));
  }

  // Posts
  async getPosts(): Promise<(Post & { team?: Team })[]> {
    const results = await db.select().from(posts).orderBy(desc(posts.createdAt));
    const enriched = await Promise.all(results.map(async (post) => {
      let team: Team | undefined;
      if (post.teamId) {
        [team] = await db.select().from(teams).where(eq(teams.id, post.teamId));
      }
      return { ...post, team };
    }));
    return enriched;
  }

  async getPostsByTeam(teamSlug: string): Promise<(Post & { team?: Team })[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];
    const results = await db.select().from(posts)
      .where(eq(posts.teamId, team.id))
      .orderBy(desc(posts.createdAt));
    return results.map(p => ({ ...p, team }));
  }

  async getPostById(id: string): Promise<Post | undefined> {
    const [post] = await db.select().from(posts).where(eq(posts.id, id));
    return post;
  }

  async createPost(data: InsertPost): Promise<Post> {
    const [post] = await db.insert(posts).values(data).returning();
    return post;
  }

  async likePost(postId: string, userId: string): Promise<void> {
    const existing = await db.select().from(reactions)
      .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)));
    
    if (existing.length > 0) {
      await db.delete(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)));
      await db.update(posts)
        .set({ likesCount: sql`${posts.likesCount} - 1` })
        .where(eq(posts.id, postId));
    } else {
      await db.insert(reactions).values({ postId, userId, type: "like" });
      await db.update(posts)
        .set({ likesCount: sql`${posts.likesCount} + 1` })
        .where(eq(posts.id, postId));
    }
  }

  // Comments
  async getCommentsByPost(postId: string): Promise<Comment[]> {
    return db.select().from(comments)
      .where(eq(comments.postId, postId))
      .orderBy(comments.createdAt);
  }

  async createComment(data: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(data).returning();
    if (data.postId) {
      await db.update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, data.postId));
    }
    return comment;
  }

  // Products
  async getProducts(): Promise<(Product & { team?: Team })[]> {
    const results = await db.select().from(products).orderBy(products.name);
    const enriched = await Promise.all(results.map(async (product) => {
      let team: Team | undefined;
      if (product.teamId) {
        [team] = await db.select().from(teams).where(eq(teams.id, product.teamId));
      }
      return { ...product, team };
    }));
    return enriched;
  }

  async getProductBySlug(slug: string): Promise<(Product & { team?: Team }) | undefined> {
    const [product] = await db.select().from(products).where(eq(products.slug, slug));
    if (!product) return undefined;
    let team: Team | undefined;
    if (product.teamId) {
      [team] = await db.select().from(teams).where(eq(teams.id, product.teamId));
    }
    return { ...product, team };
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  // Orders
  async getOrdersByUser(userId: string): Promise<Order[]> {
    return db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  // Subscribers
  async createSubscriber(data: InsertSubscriber): Promise<Subscriber> {
    const existing = await db.select().from(subscribers).where(eq(subscribers.email, data.email));
    if (existing.length > 0) {
      const [updated] = await db.update(subscribers)
        .set({ tags: sql`array_cat(${subscribers.tags}, ${data.tags || []})` })
        .where(eq(subscribers.email, data.email))
        .returning();
      return updated;
    }
    const [subscriber] = await db.insert(subscribers).values(data).returning();
    return subscriber;
  }

  // Share Analytics
  async trackShareClick(articleId: string, platform: string, userId?: string, userAgent?: string): Promise<void> {
    await db.insert(shareClicks).values({
      articleId,
      platform,
      userId: userId || null,
      userAgent: userAgent || null,
    });
  }

  // FPL Availability
  async getFplAvailabilityByTeam(teamSlug: string, sortBy: "recent" | "lowest" = "recent"): Promise<FplPlayerAvailability[]> {
    const results = await db
      .select()
      .from(fplPlayerAvailability)
      .where(
        and(
          eq(fplPlayerAvailability.teamSlug, teamSlug),
          or(
            sql`${fplPlayerAvailability.news} IS NOT NULL AND ${fplPlayerAvailability.news} != ''`,
            sql`COALESCE(${fplPlayerAvailability.chanceNextRound}, ${fplPlayerAvailability.chanceThisRound}) < 100`,
            sql`${fplPlayerAvailability.chanceNextRound} IS NULL AND ${fplPlayerAvailability.chanceThisRound} IS NULL AND ${fplPlayerAvailability.fplStatus} != 'a'`
          )
        )
      );
    
    if (sortBy === "lowest") {
      return results.sort((a, b) => {
        const aChance = a.chanceNextRound ?? a.chanceThisRound ?? -1;
        const bChance = b.chanceNextRound ?? b.chanceThisRound ?? -1;
        return aChance - bChance;
      });
    }
    
    return results.sort((a, b) => {
      const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
      const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
      return bDate - aDate;
    });
  }

  async getAllFplAvailability(): Promise<FplPlayerAvailability[]> {
    const results = await db
      .select()
      .from(fplPlayerAvailability)
      .where(
        or(
          sql`${fplPlayerAvailability.news} IS NOT NULL AND ${fplPlayerAvailability.news} != ''`,
          sql`COALESCE(${fplPlayerAvailability.chanceNextRound}, ${fplPlayerAvailability.chanceThisRound}) < 100`,
          sql`${fplPlayerAvailability.chanceNextRound} IS NULL AND ${fplPlayerAvailability.chanceThisRound} IS NULL AND ${fplPlayerAvailability.fplStatus} != 'a'`
        )
      );
    
    return results.sort((a, b) => {
      const aDate = a.newsAdded ? new Date(a.newsAdded).getTime() : 0;
      const bDate = b.newsAdded ? new Date(b.newsAdded).getTime() : 0;
      return bDate - aDate;
    });
  }
}

export const storage = new DatabaseStorage();
