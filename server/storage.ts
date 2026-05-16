import { db } from "./db";
import { eq, and, desc, ilike, sql, or, inArray, gte, gt, isNull, isNotNull, lt } from "drizzle-orm";
import {
  teams, players, articles, articleTeams, matches, transfers, injuries,
  follows, posts, comments, reactions, products, orders, subscribers, shareClicks,
  fplPlayerAvailability, managers, articleManagers, articlePlayers,
  competitions, articleCompetitions, paEntityAliasMap, entityAliases, playerTeamMemberships, teamManagers,
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
  NEWS_TIME_RANGES,
  type NewsFiltersResponse,
} from "@shared/schema";
import { EntityPresentationResolver, resolveCompetitionDisplayName } from "./lib/entity-presentation-resolver";
import { ARTICLE_SOURCE_PA_MEDIA } from "./lib/sources";
import { MvpGraphBoundary } from "./lib/mvp-graph-boundary";
import { linkArticleHtmlFirstMentions, type InlineLinkEntity } from "./lib/inline-entity-linker";
import type { AuthorArticleSummary, AuthorPageApiResponse } from "@shared/author-slug";
import { buildAuthorPageEnrichment } from "./lib/author-enrichment";
import {
  attachAuthorProfileSlugsToArticleRows,
  buildAuthorSlugSqlMatch,
  resolveAuthorIdentityForRequestSlug,
} from "./lib/author-identity-resolver";

/** Tags too generic to use as inferred author primary beat (exact match, case-insensitive). */
const GENERIC_INFERRED_PRIMARY_BEAT_TAGS = new Set([
  "football",
  "sport",
  "soccer",
  "pa",
  "report",
  "update",
  "club news",
  "match reports",
  "competition discipline",
]);

function isExcludedGenericPrimaryBeatTag(tag: string): boolean {
  return GENERIC_INFERRED_PRIMARY_BEAT_TAGS.has(tag.trim().toLowerCase());
}

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
  group: "all" | "leagues" | "cups" | "europe";
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

export interface NewsArchiveParams {
  entityType: "competition" | "team" | "player" | "manager";
  entitySlug: string;
  limit?: number;
  cursor?: string;
}

export interface NewsArchiveResponse {
  articles: any[];
  nextCursor: string | null;
  hasMore: boolean;
  appliedContext: {
    entityType: "competition" | "team" | "player" | "manager";
    entitySlug: string;
    entityId: string | null;
  };
}

type EntityLite = { id: string; name: string; slug: string };
type ArticleWithEntityArrays = {
  entityCompetitions: EntityLite[];
  entityTeams: EntityLite[];
  entityPlayers: EntityLite[];
  entityManagers: EntityLite[];
};

export interface IStorage {
  // Teams
  getTeams(): Promise<Team[]>;
  /** Teams listed on /teams (supported leagues + European comps only). */
  getTeamsForTeamsPage(): Promise<Team[]>;
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
  getNewsArchiveByEntity(params: NewsArchiveParams): Promise<NewsArchiveResponse>;
  getAuthorPage(params: { slug: string; limit?: number; cursor?: string | null }): Promise<AuthorPageApiResponse>;
  
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
  private async getInlineAliasCandidateMap(
    entities: Array<{ id: string; type: "team" | "competition" | "player" | "manager"; name: string }>,
  ): Promise<Map<string, string[]>> {
    const map = new Map<string, Set<string>>();
    const byType = {
      team: entities.filter((e) => e.type === "team").map((e) => e.id),
      competition: entities.filter((e) => e.type === "competition").map((e) => e.id),
      player: entities.filter((e) => e.type === "player").map((e) => e.id),
      manager: entities.filter((e) => e.type === "manager").map((e) => e.id),
    };

    const queries: Promise<Array<{ entityId: string; entityType: string; paTagName: string; displayName: string | null; paTagNameNormalized: string }>>[] = [];
    if (byType.team.length > 0) {
      queries.push(
        db
          .select({
            entityId: paEntityAliasMap.entityId,
            entityType: paEntityAliasMap.entityType,
            paTagName: paEntityAliasMap.paTagName,
            displayName: paEntityAliasMap.displayName,
            paTagNameNormalized: paEntityAliasMap.paTagNameNormalized,
          })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["team", "teams"]),
              inArray(paEntityAliasMap.entityId, byType.team),
            ),
          ),
      );
    }
    if (byType.competition.length > 0) {
      queries.push(
        db
          .select({
            entityId: paEntityAliasMap.entityId,
            entityType: paEntityAliasMap.entityType,
            paTagName: paEntityAliasMap.paTagName,
            displayName: paEntityAliasMap.displayName,
            paTagNameNormalized: paEntityAliasMap.paTagNameNormalized,
          })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["competition", "competitions"]),
              inArray(paEntityAliasMap.entityId, byType.competition),
            ),
          ),
      );
    }
    if (byType.player.length > 0) {
      queries.push(
        db
          .select({
            entityId: paEntityAliasMap.entityId,
            entityType: paEntityAliasMap.entityType,
            paTagName: paEntityAliasMap.paTagName,
            displayName: paEntityAliasMap.displayName,
            paTagNameNormalized: paEntityAliasMap.paTagNameNormalized,
          })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["player", "players"]),
              inArray(paEntityAliasMap.entityId, byType.player),
            ),
          ),
      );
    }
    if (byType.manager.length > 0) {
      queries.push(
        db
          .select({
            entityId: paEntityAliasMap.entityId,
            entityType: paEntityAliasMap.entityType,
            paTagName: paEntityAliasMap.paTagName,
            displayName: paEntityAliasMap.displayName,
            paTagNameNormalized: paEntityAliasMap.paTagNameNormalized,
          })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["manager", "managers"]),
              inArray(paEntityAliasMap.entityId, byType.manager),
            ),
          ),
      );
    }

    const rowsByType = await Promise.all(queries);
    for (const rows of rowsByType) {
      for (const row of rows) {
        const normalizedType =
          row.entityType === "teams" ? "team"
          : row.entityType === "competitions" ? "competition"
          : row.entityType === "players" ? "player"
          : row.entityType === "managers" ? "manager"
          : row.entityType;
        const key = `${normalizedType}:${row.entityId}`;
        if (!map.has(key)) map.set(key, new Set<string>());
        const bucket = map.get(key)!;
        if (row.displayName) bucket.add(row.displayName);
        if (row.paTagName) bucket.add(row.paTagName);
        if (row.paTagNameNormalized) bucket.add(row.paTagNameNormalized);
      }
    }

    const aliasQueries: Promise<Array<{ entityId: string; entityType: string; alias: string }>>[] = [];
    if (byType.team.length > 0) {
      aliasQueries.push(
        db
          .select({
            entityId: entityAliases.entityId,
            entityType: entityAliases.entityType,
            alias: entityAliases.alias,
          })
          .from(entityAliases)
          .where(
            and(
              eq(entityAliases.entityType, "team"),
              inArray(entityAliases.entityId, byType.team),
            ),
          ),
      );
    }
    if (byType.competition.length > 0) {
      aliasQueries.push(
        db
          .select({
            entityId: entityAliases.entityId,
            entityType: entityAliases.entityType,
            alias: entityAliases.alias,
          })
          .from(entityAliases)
          .where(
            and(
              eq(entityAliases.entityType, "competition"),
              inArray(entityAliases.entityId, byType.competition),
            ),
          ),
      );
    }
    if (byType.player.length > 0) {
      aliasQueries.push(
        db
          .select({
            entityId: entityAliases.entityId,
            entityType: entityAliases.entityType,
            alias: entityAliases.alias,
          })
          .from(entityAliases)
          .where(
            and(
              eq(entityAliases.entityType, "player"),
              inArray(entityAliases.entityId, byType.player),
            ),
          ),
      );
    }
    if (byType.manager.length > 0) {
      aliasQueries.push(
        db
          .select({
            entityId: entityAliases.entityId,
            entityType: entityAliases.entityType,
            alias: entityAliases.alias,
          })
          .from(entityAliases)
          .where(
            and(
              eq(entityAliases.entityType, "manager"),
              inArray(entityAliases.entityId, byType.manager),
            ),
          ),
      );
    }

    const directAliasesByType = await Promise.all(aliasQueries);
    for (const rows of directAliasesByType) {
      for (const row of rows) {
        const key = `${row.entityType}:${row.entityId}`;
        if (!map.has(key)) map.set(key, new Set<string>());
        const bucket = map.get(key)!;
        if (row.alias) bucket.add(row.alias);
      }
    }

    for (const entity of entities) {
      const key = `${entity.type}:${entity.id}`;
      if (!map.has(key)) map.set(key, new Set<string>());
      map.get(key)!.add(entity.name);
    }

    const out = new Map<string, string[]>();
    for (const [key, set] of Array.from(map.entries())) out.set(key, Array.from(set));
    return out;
  }

  private async getTeamPublicSlugMap(teamIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(teamIds.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map();

    const rows = await db
      .select({
        entityId: paEntityAliasMap.entityId,
        publicSlug: paEntityAliasMap.publicSlug,
        createdAt: paEntityAliasMap.createdAt,
      })
      .from(paEntityAliasMap)
      .where(
        and(
          eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
          inArray(paEntityAliasMap.entityType, ["team", "teams"]),
          inArray(paEntityAliasMap.entityId, uniqueIds),
          isNotNull(paEntityAliasMap.publicSlug),
          sql`trim(${paEntityAliasMap.publicSlug}) <> ''`,
        ),
      )
      .orderBy(desc(paEntityAliasMap.createdAt));

    const map = new Map<string, string>();
    for (const row of rows) {
      if (!row.publicSlug) continue;
      if (!map.has(row.entityId)) map.set(row.entityId, row.publicSlug);
    }
    return map;
  }

  private async resolveTeamIdByPublicSlug(publicSlug: string): Promise<string | undefined> {
    const rows = await db
      .select({ entityId: paEntityAliasMap.entityId })
      .from(paEntityAliasMap)
      .where(
        and(
          eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
          inArray(paEntityAliasMap.entityType, ["team", "teams"]),
          eq(paEntityAliasMap.publicSlug, publicSlug),
        ),
      )
      .limit(2);
    const ids = Array.from(new Set(rows.map((row) => row.entityId)));
    if (ids.length === 1) return ids[0];
    if (ids.length > 1) {
      console.warn(`[team-resolver] ambiguous public slug '${publicSlug}' matched multiple team ids`);
    }
    return undefined;
  }

  private async resolveEntityIdByPublicSlug(
    publicSlug: string,
    entityTypes: string[],
  ): Promise<string | undefined> {
    const rows = await db
      .select({ entityId: paEntityAliasMap.entityId })
      .from(paEntityAliasMap)
      .where(
        and(
          eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
          inArray(paEntityAliasMap.entityType, entityTypes as [string, ...string[]]),
          eq(paEntityAliasMap.publicSlug, publicSlug),
        ),
      )
      .limit(2);
    const ids = Array.from(new Set(rows.map((row) => row.entityId)));
    if (ids.length === 1) return ids[0];
    if (ids.length > 1) {
      console.warn(
        `[entity-resolver] ambiguous public slug '${publicSlug}' matched multiple ids for [${entityTypes.join(", ")}]`,
      );
    }
    return undefined;
  }

  // Teams
  async getTeams(): Promise<Team[]> {
    const boundary = new MvpGraphBoundary();
    const mvpTeamIds = Array.from(await boundary.getMvpTeamIds());
    if (mvpTeamIds.length === 0) return [];

    const rows = await db
      .select()
      .from(teams)
      .where(inArray(teams.id, mvpTeamIds))
      .orderBy(teams.name);
    const slugMap = await this.getTeamPublicSlugMap(rows.map((row) => row.id));
    return rows.map((row) => ({ ...row, slug: slugMap.get(row.id) ?? row.slug }));
  }

  async getTeamsForTeamsPage(): Promise<Team[]> {
    const boundary = new MvpGraphBoundary();
    const mvpTeamIds = Array.from(await boundary.getTeamsPageMvpTeamIds());
    if (mvpTeamIds.length === 0) return [];

    const rows = await db
      .select()
      .from(teams)
      .where(inArray(teams.id, mvpTeamIds))
      .orderBy(teams.name);
    const slugMap = await this.getTeamPublicSlugMap(rows.map((row) => row.id));
    return rows.map((row) => ({ ...row, slug: slugMap.get(row.id) ?? row.slug }));
  }

  async getTeamBySlug(slug: string): Promise<Team | undefined> {
    const teamId = await this.resolveTeamIdByPublicSlug(slug);
    if (teamId) {
      const [teamByPublicSlug] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (!teamByPublicSlug) return undefined;
      const slugMap = await this.getTeamPublicSlugMap([teamByPublicSlug.id]);
      return { ...teamByPublicSlug, slug: slugMap.get(teamByPublicSlug.id) ?? teamByPublicSlug.slug };
    }

    const [teamByInternalSlug] = await db.select().from(teams).where(eq(teams.slug, slug)).limit(1);
    if (!teamByInternalSlug) return undefined;
    const slugMap = await this.getTeamPublicSlugMap([teamByInternalSlug.id]);
    return { ...teamByInternalSlug, slug: slugMap.get(teamByInternalSlug.id) ?? teamByInternalSlug.slug };
  }

  async getTeamById(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    if (!team) return undefined;
    const slugMap = await this.getTeamPublicSlugMap([team.id]);
    return { ...team, slug: slugMap.get(team.id) ?? team.slug };
  }

  async createTeam(data: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(data).returning();
    return team;
  }

  // Players
  async getAllPlayers(): Promise<Player[]> {
    const allPlayers = await db.select().from(players).orderBy(players.name);
    const boundary = new MvpGraphBoundary();
    const allowedPlayerIds = await boundary.filterPlayerIds(allPlayers.map((row) => row.id));
    return allPlayers.filter((row) => allowedPlayerIds.has(row.id));
  }

  async getPlayersByTeam(teamId: string): Promise<Player[]> {
    const boundary = new MvpGraphBoundary();
    const isMvpTeam = await boundary.isMvpTeam(teamId);
    if (!isMvpTeam) return [];

    const now = new Date();
    const activeMemberships = await db
      .select({
        id: playerTeamMemberships.id,
        playerId: playerTeamMemberships.playerId,
        teamId: playerTeamMemberships.teamId,
        shirtNumber: playerTeamMemberships.shirtNumber,
        startDate: playerTeamMemberships.startDate,
        createdAt: playerTeamMemberships.createdAt,
      })
      .from(playerTeamMemberships)
      .where(
        and(
          eq(playerTeamMemberships.teamId, teamId),
          or(isNull(playerTeamMemberships.endDate), gt(playerTeamMemberships.endDate, now)),
        ),
      )
      .orderBy(
        desc(playerTeamMemberships.playerId),
        desc(playerTeamMemberships.startDate),
        desc(playerTeamMemberships.createdAt),
        desc(playerTeamMemberships.id),
      );

    const latestActiveMembershipByPlayer = new Map<string, { teamId: string; shirtNumber: string | null }>();
    for (const row of activeMemberships) {
      if (!latestActiveMembershipByPlayer.has(row.playerId)) {
        latestActiveMembershipByPlayer.set(row.playerId, {
          teamId: row.teamId,
          shirtNumber: row.shirtNumber ?? null,
        });
      }
    }

    const currentPlayerIds = Array.from(latestActiveMembershipByPlayer.keys());

    // Safety fallback for teams where memberships have not been ingested yet.
    if (currentPlayerIds.length === 0) {
      return db
        .select()
        .from(players)
        .where(eq(players.teamId, teamId))
        .orderBy(players.name);
    }

    const currentPlayers = await db
      .select()
      .from(players)
      .where(inArray(players.id, currentPlayerIds))
      .orderBy(players.name);

    return currentPlayers.map((player) => {
      const currentMembership = latestActiveMembershipByPlayer.get(player.id);
      const membershipShirtNumber =
        currentMembership?.shirtNumber != null && String(currentMembership.shirtNumber).trim().length > 0
          ? Number.parseInt(String(currentMembership.shirtNumber), 10)
          : null;
      const resolvedNumber =
        membershipShirtNumber != null && Number.isFinite(membershipShirtNumber)
          ? membershipShirtNumber
          : player.number;
      return {
        ...player,
        number: resolvedNumber,
      };
    });
  }

  async getPlayerBySlug(slug: string): Promise<(Player & { team?: Team | null }) | undefined> {
    let [player] = await db.select().from(players).where(eq(players.slug, slug)).limit(1);
    if (!player) {
      const playerId = await this.resolveEntityIdByPublicSlug(slug, ["player", "players"]);
      if (!playerId) return undefined;
      [player] = await db.select().from(players).where(eq(players.id, playerId)).limit(1);
      if (!player) return undefined;
    }

    const now = new Date();
    const [latestActiveMembership] = await db
      .select({ teamId: playerTeamMemberships.teamId })
      .from(playerTeamMemberships)
      .where(
        and(
          eq(playerTeamMemberships.playerId, player.id),
          or(isNull(playerTeamMemberships.endDate), gt(playerTeamMemberships.endDate, now)),
        ),
      )
      .orderBy(
        desc(playerTeamMemberships.startDate),
        desc(playerTeamMemberships.createdAt),
        desc(playerTeamMemberships.id),
      )
      .limit(1);

    const resolvedTeamId = latestActiveMembership?.teamId ?? player.teamId ?? null;
    const boundary = new MvpGraphBoundary();
    if (!resolvedTeamId || !(await boundary.isMvpTeam(resolvedTeamId))) return undefined;

    const [team] = resolvedTeamId
      ? await db.select().from(teams).where(eq(teams.id, resolvedTeamId)).limit(1)
      : [];

    return {
      ...player,
      team: team ?? null,
    };
  }

  async createPlayer(data: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(data).returning();
    return player;
  }

  // Managers
  async getAllManagers(): Promise<Manager[]> {
    const boundary = new MvpGraphBoundary();
    const mvpTeamIds = await boundary.getMvpTeamIds();
    if (mvpTeamIds.size === 0) return [];

    const canonicalRows = await db
      .select({ manager: managers })
      .from(teamManagers)
      .innerJoin(managers, eq(teamManagers.managerId, managers.id))
      .where(inArray(teamManagers.teamId, Array.from(mvpTeamIds)))
      .orderBy(managers.name);

    const canonicalById = new Map(canonicalRows.map((row) => [row.manager.id, row.manager]));
    const canonicalManagers = Array.from(canonicalById.values());

    const fallbackRows = await db
      .select()
      .from(managers)
      .where(
        and(
          isNotNull(managers.currentTeamId),
          inArray(managers.currentTeamId, Array.from(mvpTeamIds)),
        ),
      )
      .orderBy(managers.name);
    const fallbackManagers = fallbackRows.filter((row) => !canonicalById.has(row.id));

    if (fallbackManagers.length > 0) {
      console.warn(
        `[manager-read-drift] getAllManagers using fallback currentTeamId rows=${fallbackManagers.length}`,
      );
    }

    return [...canonicalManagers, ...fallbackManagers].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getManagerBySlug(slug: string): Promise<(Manager & { team?: Team | null }) | undefined> {
    let [manager] = await db.select().from(managers).where(eq(managers.slug, slug));
    if (!manager) {
      const managerId = await this.resolveEntityIdByPublicSlug(slug, ["manager", "managers"]);
      if (!managerId) return undefined;
      [manager] = await db.select().from(managers).where(eq(managers.id, managerId)).limit(1);
      if (!manager) return undefined;
    }

    const boundary = new MvpGraphBoundary();
    const mvpTeamIds = await boundary.getMvpTeamIds();

    const [canonicalTeamRow] = await db
      .select({
        teamId: teamManagers.teamId,
        team: teams,
      })
      .from(teamManagers)
      .innerJoin(teams, eq(teamManagers.teamId, teams.id))
      .where(eq(teamManagers.managerId, manager.id))
      .limit(1);

    if (canonicalTeamRow?.teamId && mvpTeamIds.has(canonicalTeamRow.teamId)) {
      return { ...manager, currentTeamId: canonicalTeamRow.teamId, team: canonicalTeamRow.team };
    }

    if (manager.currentTeamId && mvpTeamIds.has(manager.currentTeamId)) {
      const [team] = await db.select().from(teams).where(eq(teams.id, manager.currentTeamId)).limit(1);
      console.warn(
        `[manager-read-drift] getManagerBySlug fallback managerId=${manager.id} slug=${slug} currentTeamId=${manager.currentTeamId}`,
      );
      return { ...manager, team: team ?? null };
    }

    return undefined;
  }

  async getManagersByTeamId(teamId: string): Promise<Manager[]> {
    const boundary = new MvpGraphBoundary();
    const isMvpTeam = await boundary.isMvpTeam(teamId);
    if (!isMvpTeam) return [];

    const canonicalRows = await db
      .select({ manager: managers })
      .from(teamManagers)
      .innerJoin(managers, eq(teamManagers.managerId, managers.id))
      .where(eq(teamManagers.teamId, teamId))
      .orderBy(managers.name);
    if (canonicalRows.length > 0) return canonicalRows.map((row) => row.manager);

    const fallbackRows = await db
      .select()
      .from(managers)
      .where(eq(managers.currentTeamId, teamId))
      .orderBy(managers.name);
    if (fallbackRows.length > 0) {
      console.warn(
        `[manager-read-drift] getManagersByTeamId fallback teamId=${teamId} managers=${fallbackRows.length}`,
      );
    }
    return fallbackRows;
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
    const lightweight = {
      id: articles.id, slug: articles.slug, title: articles.title,
      excerpt: articles.excerpt, coverImage: articles.coverImage, heroImageUrl: articles.heroImageUrl,
      publishedAt: articles.publishedAt, authorName: articles.authorName,
      competition: articles.competition, contentType: articles.contentType,
      tags: articles.tags, isBreaking: articles.isBreaking,
      isTrending: articles.isTrending, isFeatured: articles.isFeatured,
      isEditorPick: articles.isEditorPick, viewCount: articles.viewCount,
      commentsCount: articles.commentsCount, category: articles.category,
    };
    if (category && category !== "all") {
      const rows = await db
        .select(lightweight)
        .from(articles)
        .where(eq(articles.category, category))
        .orderBy(desc(articles.publishedAt))
        .limit(50);
      return attachAuthorProfileSlugsToArticleRows(rows) as any;
    }
    const rows = await db
      .select(lightweight)
      .from(articles)
      .orderBy(desc(articles.publishedAt))
      .limit(50);
    return attachAuthorProfileSlugsToArticleRows(rows) as any;
  }

  async getArticleBySlug(slug: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    return article;
  }

  async getArticleWithEntities(slug: string): Promise<ArticleWithEntities | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
    if (!article) return undefined;

    const boundary = new MvpGraphBoundary();

    // Fetch linked teams with provenance
    let teamRows = await db
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
    teamRows = await boundary.filterRowsById(teamRows, "team");

    // Fetch linked players with provenance
    let playerRows = await db
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
    playerRows = await boundary.filterRowsById(playerRows, "player");

    // Fetch linked managers with provenance
    let managerRows = await db
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
    managerRows = await boundary.filterRowsById(managerRows, "manager");

    // Fetch linked competitions with provenance
    let competitionRows = await db
      .select({
        id: competitions.id,
        name: competitions.name,
        canonicalName: sql<string | null>`nullif(trim(canonical_name), '')`,
        slug: competitions.slug,
        source: articleCompetitions.source,
        salienceScore: articleCompetitions.salienceScore,
      })
      .from(articleCompetitions)
      .innerJoin(competitions, eq(articleCompetitions.competitionId, competitions.id))
      .where(eq(articleCompetitions.articleId, article.id))
      .orderBy(desc(articleCompetitions.salienceScore));
    competitionRows = await boundary.filterRowsById(competitionRows, "competition");
    const presenter = new EntityPresentationResolver();
    const [teamPresentationMap, competitionPresentationMap] = await Promise.all([
      presenter.resolveTeams(teamRows.map((row) => row.id), { source: article.source }),
      presenter.resolveCompetitions(competitionRows.map((row) => row.id), { source: article.source }),
    ]);

    const resolvedTeams = teamRows.map((row) => {
      const override = teamPresentationMap.get(row.id);
      return {
        ...row,
        name: override?.name || row.name,
        slug: override?.slug || row.slug,
        logoUrl: override?.logoUrl ?? row.logoUrl,
      };
    });

    const resolvedCompetitions = competitionRows.map((row) => {
      const override = competitionPresentationMap.get(row.id);
      return {
        ...row,
        name: resolveCompetitionDisplayName(row.canonicalName, override?.name ?? row.name),
        slug: override?.slug || row.slug,
      };
    });

    const inlineSourceEntities = [
      ...resolvedCompetitions.map((row) => ({ id: row.id, type: "competition" as const, name: row.name })),
      ...resolvedTeams.map((row) => ({ id: row.id, type: "team" as const, name: row.name })),
      ...playerRows.map((row) => ({ id: row.id, type: "player" as const, name: row.name })),
      ...managerRows.map((row) => ({ id: row.id, type: "manager" as const, name: row.name })),
    ];
    const aliasCandidates = await this.getInlineAliasCandidateMap(inlineSourceEntities);

    const inlineEntities: InlineLinkEntity[] = [
      ...resolvedCompetitions.map((row) => ({
        id: row.id,
        type: "competition" as const,
        name: row.name,
        href: `/competitions/${row.slug}`,
        candidates: aliasCandidates.get(`competition:${row.id}`) ?? [row.name],
      })),
      ...resolvedTeams.map((row) => ({
        id: row.id,
        type: "team" as const,
        name: row.name,
        href: `/teams/${row.slug}`,
        candidates: aliasCandidates.get(`team:${row.id}`) ?? [row.name],
      })),
      ...playerRows.map((row) => ({
        id: row.id,
        type: "player" as const,
        name: row.name,
        href: `/players/${row.slug}`,
        candidates: aliasCandidates.get(`player:${row.id}`) ?? [row.name],
      })),
      ...managerRows.map((row) => ({
        id: row.id,
        type: "manager" as const,
        name: row.name,
        href: `/managers/${row.slug}`,
        candidates: aliasCandidates.get(`manager:${row.id}`) ?? [row.name],
      })),
    ];
    const linkedContent = linkArticleHtmlFirstMentions(article.content, inlineEntities);

    const [withAuthorSlug] = await attachAuthorProfileSlugsToArticleRows([article]);

    return {
      ...withAuthorSlug,
      content: linkedContent,
      entityTeams: resolvedTeams,
      entityPlayers: playerRows,
      entityManagers: managerRows,
      entityCompetitions: resolvedCompetitions,
    };
  }

  async getArticlesByTeam(teamSlug: string): Promise<Article[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];

    const result = await db
      .select({
        id: articles.id, slug: articles.slug, title: articles.title,
        excerpt: articles.excerpt, coverImage: articles.coverImage, heroImageUrl: articles.heroImageUrl,
        publishedAt: articles.publishedAt, authorName: articles.authorName,
        competition: articles.competition, contentType: articles.contentType,
        tags: articles.tags, isBreaking: articles.isBreaking,
        isTrending: articles.isTrending, isFeatured: articles.isFeatured,
        viewCount: articles.viewCount, category: articles.category,
      })
      .from(articles)
      .innerJoin(articleTeams, eq(articleTeams.articleId, articles.id))
      .where(eq(articleTeams.teamId, team.id))
      .orderBy(desc(articles.publishedAt))
      .limit(50);

    return attachAuthorProfileSlugsToArticleRows(result) as any;
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

  async getAuthorPage(params: { slug: string; limit?: number; cursor?: string | null }): Promise<AuthorPageApiResponse> {
    const slug = params.slug.trim().toLowerCase();
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
    const empty = (extra?: Partial<AuthorPageApiResponse>): AuthorPageApiResponse => ({
      found: false,
      slug,
      canonicalAuthorSlug: null,
      displayName: "",
      articleCount: 0,
      firstPublishedAt: null,
      lastPublishedAt: null,
      articles: [],
      nextCursor: null,
      hasMore: false,
      ...extra,
    });
    if (!slug) return empty();

    const resolved = await resolveAuthorIdentityForRequestSlug(slug);
    const canonicalAuthorSlug =
      resolved && resolved.canonicalSlug.trim().toLowerCase() !== slug
        ? resolved.canonicalSlug.trim().toLowerCase()
        : null;
    const matchSlugs = resolved?.matchSlugs?.length ? resolved.matchSlugs : [slug];
    const slugMatchClause = buildAuthorSlugSqlMatch(matchSlugs);

    const [agg] = await db
      .select({
        articleCount: sql<number>`count(*)::int`,
        displayName: sql<string>`max(${articles.authorName})`,
        firstPublishedAt: sql<Date | null>`min(${articles.publishedAt})`,
        lastPublishedAt: sql<Date | null>`max(${articles.publishedAt})`,
      })
      .from(articles)
      .where(slugMatchClause);

    const displayNameForPage =
      resolved?.displayName?.trim() || (agg?.displayName != null ? String(agg.displayName).trim() : "");

    if (!agg || agg.articleCount === 0 || !displayNameForPage) {
      return empty({ canonicalAuthorSlug });
    }

    const listFields = {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      openingText: sql<string>`left(trim(regexp_replace(${articles.content}, '<[^>]+>', ' ', 'g')), 220)`,
      coverImage: articles.coverImage,
      heroImageUrl: articles.heroImageUrl,
      authorName: articles.authorName,
      publishedAt: articles.publishedAt,
      updatedAt: articles.updatedAt,
      sortAt: articles.sortAt,
      competition: articles.competition,
      contentType: articles.contentType,
      tags: articles.tags,
      viewCount: articles.viewCount,
    };

    const conditions = [slugMatchClause];
    const cursor = params.cursor?.trim();
    if (cursor) {
      const parts = cursor.split("|");
      if (parts.length === 2 && parts[0] && parts[1]) {
        const cursorSortAt = parts[0];
        const cursorId = parts[1];
        const cursorDate = new Date(cursorSortAt);
        if (!Number.isNaN(cursorDate.getTime())) {
          conditions.push(
            or(
              lt(articles.sortAt, cursorDate),
              and(eq(articles.sortAt, cursorDate), lt(articles.id, cursorId)),
            )!,
          );
        }
      }
    }

    const rows = await db
      .select(listFields)
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.sortAt), desc(articles.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const last = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && last?.sortAt && last.id
        ? `${(last.sortAt instanceof Date ? last.sortAt : new Date(last.sortAt as string)).toISOString()}|${last.id}`
        : null;

    const normalized: AuthorArticleSummary[] = pageRows.map((row) => {
      const published =
        row.publishedAt instanceof Date ? row.publishedAt : row.publishedAt ? new Date(row.publishedAt) : null;
      const updated =
        row.updatedAt instanceof Date ? row.updatedAt : row.updatedAt ? new Date(row.updatedAt) : null;
      const sortAt =
        row.sortAt instanceof Date ? row.sortAt : row.sortAt ? new Date(row.sortAt) : null;
      const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? null,
        openingText: row.openingText ?? "",
        coverImage: row.coverImage ?? null,
        heroImageUrl: row.heroImageUrl ?? null,
        authorName: row.authorName ?? "PA Media",
        publishedAt: published ? published.toISOString() : null,
        updatedAt: updated ? updated.toISOString() : null,
        sortAt: sortAt ? sortAt.toISOString() : null,
        viewCount: row.viewCount ?? 0,
        tags,
        competition: row.competition ?? null,
        contentType: row.contentType ?? null,
      };
    });

    // All list rows share this page's author filter; when identity resolved, profile slug is always canonical.
    const normalizedWithAuthorSlugs = resolved
      ? normalized.map((row) => ({
          ...row,
          authorProfileSlug: resolved.canonicalSlug.trim().toLowerCase(),
        }))
      : await attachAuthorProfileSlugsToArticleRows(normalized);

    const enrich = buildAuthorPageEnrichment(resolved?.canonicalSlug ?? slug, displayNameForPage);
    const curatedPrimaryBeat = enrich.primaryBeat?.trim() || null;

    let inferredPrimaryBeat: string | null = null;
    if (!curatedPrimaryBeat) {
      const tagRows = await db
        .select({ tags: articles.tags })
        .from(articles)
        .where(slugMatchClause)
        .orderBy(desc(articles.sortAt))
        .limit(50);

      const tagCounts = new Map<string, number>();
      for (const row of tagRows) {
        for (const raw of row.tags ?? []) {
          const t = typeof raw === "string" ? raw.trim() : "";
          if (t.length < 2) continue;
          tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
      }
      const sortedTags = Array.from(tagCounts.entries()).sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      inferredPrimaryBeat =
        sortedTags.find(([t]) => !isExcludedGenericPrimaryBeatTag(t))?.[0] ?? null;
    }

    const primaryBeat = curatedPrimaryBeat || inferredPrimaryBeat;

    return {
      found: true,
      slug,
      canonicalAuthorSlug,
      displayName: displayNameForPage,
      articleCount: agg.articleCount,
      firstPublishedAt: agg.firstPublishedAt
        ? (agg.firstPublishedAt instanceof Date ? agg.firstPublishedAt : new Date(agg.firstPublishedAt)).toISOString()
        : null,
      lastPublishedAt: agg.lastPublishedAt
        ? (agg.lastPublishedAt instanceof Date ? agg.lastPublishedAt : new Date(agg.lastPublishedAt)).toISOString()
        : null,
      articles: normalizedWithAuthorSlugs,
      nextCursor,
      hasMore,
      headshotUrl: enrich.headshotUrl ?? null,
      linkedInUrl: enrich.linkedInUrl ?? null,
      xUrl: enrich.xUrl ?? null,
      websiteUrl: enrich.websiteUrl ?? null,
      showPaDeskAvatar: enrich.showPaDeskAvatar ?? false,
      primaryBeat,
      bio: enrich.bio?.trim() || null,
    };
  }

  /** Harden list row for /api/news and /api/news/updates so null fields (e.g. PA Media tags) don't break the UI. */
  normalizeArticleListRow<T extends Record<string, unknown>>(row: T): T & { excerpt: string; tags: unknown[]; competition: string | null; contentType: string; coverImage: string | null; authorName: string; openingText: string } {
    const excerpt = typeof row.excerpt === "string" ? row.excerpt : "";
    const tags = Array.isArray(row.tags) ? row.tags : [];
    const competition = typeof row.competition === "string" ? row.competition : null;
    const contentType = typeof row.contentType === "string" ? row.contentType : "story";
    const coverImage = typeof row.coverImage === "string" ? row.coverImage : null;
    const authorName = typeof row.authorName === "string" ? row.authorName : "PA Media";
    const rawOpening = (row as { openingText?: unknown }).openingText;
    const openingText = typeof rawOpening === "string" ? rawOpening : "";
    return {
      ...row,
      excerpt,
      tags,
      competition,
      contentType,
      coverImage,
      authorName,
      openingText,
    };
  }

  private async attachEntityArraysToArticles<T extends { id: string }>(
    rows: T[],
  ): Promise<Array<T & ArticleWithEntityArrays>> {
    if (rows.length === 0) return [];

    const articleIds = rows.map((r) => r.id);

    let [competitionRows, teamRows, playerRows, managerRows] = await Promise.all([
      db
        .select({
          articleId: articleCompetitions.articleId,
          id: competitions.id,
          name: competitions.name,
          canonicalName: sql<string | null>`nullif(trim(canonical_name), '')`,
          slug: competitions.slug,
        })
        .from(articleCompetitions)
        .innerJoin(competitions, eq(articleCompetitions.competitionId, competitions.id))
        .where(inArray(articleCompetitions.articleId, articleIds)),
      db
        .select({
          articleId: articleTeams.articleId,
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
        })
        .from(articleTeams)
        .innerJoin(teams, eq(articleTeams.teamId, teams.id))
        .where(inArray(articleTeams.articleId, articleIds)),
      db
        .select({
          articleId: articlePlayers.articleId,
          id: players.id,
          name: players.name,
          slug: players.slug,
        })
        .from(articlePlayers)
        .innerJoin(players, eq(articlePlayers.playerId, players.id))
        .where(inArray(articlePlayers.articleId, articleIds)),
      db
        .select({
          articleId: articleManagers.articleId,
          id: managers.id,
          name: managers.name,
          slug: managers.slug,
        })
        .from(articleManagers)
        .innerJoin(managers, eq(articleManagers.managerId, managers.id))
        .where(inArray(articleManagers.articleId, articleIds)),
    ]);
    const boundary = new MvpGraphBoundary();
    [competitionRows, teamRows, playerRows, managerRows] = await Promise.all([
      boundary.filterRowsById(competitionRows, "competition"),
      boundary.filterRowsById(teamRows, "team"),
      boundary.filterRowsById(playerRows, "player"),
      boundary.filterRowsById(managerRows, "manager"),
    ]);

    const presenter = new EntityPresentationResolver();

    const paArticleRows = await db
      .select({ id: articles.id })
      .from(articles)
      .where(and(inArray(articles.id, articleIds), eq(articles.source, ARTICLE_SOURCE_PA_MEDIA)));
    const paArticleIds = new Set(paArticleRows.map((row) => row.id));

    const paTeamEntityIds = Array.from(
      new Set(
        teamRows
          .filter((row) => paArticleIds.has(row.articleId))
          .map((row) => row.id),
      ),
    );
    const paCompetitionEntityIds = Array.from(
      new Set(
        competitionRows
          .filter((row) => paArticleIds.has(row.articleId))
          .map((row) => row.id),
      ),
    );

    const nonPaTeamEntityIds = Array.from(
      new Set(
        teamRows
          .filter((row) => !paArticleIds.has(row.articleId))
          .map((row) => row.id),
      ),
    );
    const nonPaCompetitionEntityIds = Array.from(
      new Set(
        competitionRows
          .filter((row) => !paArticleIds.has(row.articleId))
          .map((row) => row.id),
      ),
    );

    const [
      paTeamPresentationMap,
      paCompetitionPresentationMap,
      nonPaTeamPresentationMap,
      nonPaCompetitionPresentationMap,
    ] = await Promise.all([
      presenter.resolveTeams(paTeamEntityIds, { source: ARTICLE_SOURCE_PA_MEDIA }),
      presenter.resolveCompetitions(paCompetitionEntityIds, { source: ARTICLE_SOURCE_PA_MEDIA }),
      presenter.resolveTeams(nonPaTeamEntityIds, { source: null }),
      presenter.resolveCompetitions(nonPaCompetitionEntityIds, { source: null }),
    ]);

    const compMap = new Map<string, EntityLite[]>();
    const teamMap = new Map<string, EntityLite[]>();
    const playerMap = new Map<string, EntityLite[]>();
    const managerMap = new Map<string, EntityLite[]>();

    for (const row of competitionRows) {
      if (!compMap.has(row.articleId)) compMap.set(row.articleId, []);
      const presentation = paArticleIds.has(row.articleId)
        ? paCompetitionPresentationMap.get(row.id)
        : nonPaCompetitionPresentationMap.get(row.id);
      compMap.get(row.articleId)!.push({
        id: row.id,
        name: resolveCompetitionDisplayName(row.canonicalName, presentation?.name ?? row.name),
        slug: presentation?.slug || row.slug,
      });
    }
    for (const row of teamRows) {
      if (!teamMap.has(row.articleId)) teamMap.set(row.articleId, []);
      const presentation = paArticleIds.has(row.articleId)
        ? paTeamPresentationMap.get(row.id)
        : nonPaTeamPresentationMap.get(row.id);
      teamMap.get(row.articleId)!.push({
        id: row.id,
        name: presentation?.name || row.name,
        slug: presentation?.slug || row.slug,
      });
    }
    for (const row of playerRows) {
      if (!playerMap.has(row.articleId)) playerMap.set(row.articleId, []);
      playerMap.get(row.articleId)!.push({ id: row.id, name: row.name, slug: row.slug });
    }
    for (const row of managerRows) {
      if (!managerMap.has(row.articleId)) managerMap.set(row.articleId, []);
      managerMap.get(row.articleId)!.push({ id: row.id, name: row.name, slug: row.slug });
    }

    return rows.map((row) => ({
      ...row,
      entityCompetitions: compMap.get(row.id) ?? [],
      entityTeams: teamMap.get(row.id) ?? [],
      entityPlayers: playerMap.get(row.id) ?? [],
      entityManagers: managerMap.get(row.id) ?? [],
    }));
  }

  async getNewsArticles(params: NewsFilterParams): Promise<NewsFiltersResponse> {
    const { group, comp, type, teamSlugs, sort, range, breaking, limit: limitParam, cursor } = params;
    const limit = limitParam ?? 15; // Default to 15 (5 rows of 3)
    
    const conditions: any[] = [];
    
    const cupSlugs = new Set<string>([
      "fa-cup",
      "efl-cup",
      "scottish-cup",
      "scottish-league-cup",
      "copa-del-rey",
      "coppa-italia",
      "dfb-pokal",
      "coupe-de-france",
    ]);
    const europeSlugs = new Set<string>([
      "champions-league",
      "europa-league",
      "conference-league",
      "uefa-champions-league",
      "uefa-europa-league",
      "uefa-conference-league",
    ]);

    if (comp === "all" && group !== "all") {
      const competitionRows = await db
        .select({
          id: competitions.id,
          slug: competitions.slug,
          canonicalSlug: competitions.canonicalSlug,
        })
        .from(competitions);

      const scopedCompetitionIds = competitionRows
        .filter((row) => {
          const value = row.canonicalSlug || row.slug;
          if (group === "cups") return cupSlugs.has(value);
          if (group === "europe") return europeSlugs.has(value);
          return !cupSlugs.has(value) && !europeSlugs.has(value);
        })
        .map((row) => row.id);

      if (scopedCompetitionIds.length === 0) {
        return {
          articles: [],
          appliedFilters: {
            group,
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

      const articleIdsByCompetition = await db
        .selectDistinct({ articleId: articleCompetitions.articleId })
        .from(articleCompetitions)
        .where(inArray(articleCompetitions.competitionId, scopedCompetitionIds));

      const articleIdList = articleIdsByCompetition.map((a) => a.articleId);
      if (articleIdList.length === 0) {
        return {
          articles: [],
          appliedFilters: {
            group,
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

      conditions.push(inArray(articles.id, articleIdList));
    } else if (comp !== "all") {
      const [competitionBySlug] = await db
        .select({ id: competitions.id })
        .from(competitions)
        .where(
          or(
            eq(competitions.slug, comp),
            eq(competitions.canonicalSlug, comp),
          ),
        )
        .limit(1);

      const competitionId = competitionBySlug
        ? competitionBySlug.id
        : (
          await db
            .select({ id: paEntityAliasMap.entityId })
            .from(paEntityAliasMap)
            .where(
              and(
                eq(paEntityAliasMap.source, "pa_media"),
                inArray(paEntityAliasMap.entityType, ["competition", "competitions"]),
                eq(paEntityAliasMap.publicSlug, comp),
              ),
            )
            .limit(1)
        )[0]?.id;

      if (!competitionId) {
        return {
          articles: [],
          appliedFilters: {
            group,
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

      const articleIdsByCompetition = await db
        .selectDistinct({ articleId: articleCompetitions.articleId })
        .from(articleCompetitions)
        .where(eq(articleCompetitions.competitionId, competitionId));

      const articleIdList = articleIdsByCompetition.map((a) => a.articleId);
      if (articleIdList.length === 0) {
        return {
          articles: [],
          appliedFilters: {
            group,
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

      conditions.push(inArray(articles.id, articleIdList));
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
      const [teamResults, aliasTeamResults] = await Promise.all([
        db.select({ id: teams.id }).from(teams).where(inArray(teams.slug, teamSlugs)),
        db
          .select({ id: paEntityAliasMap.entityId })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["team", "teams"]),
              inArray(paEntityAliasMap.publicSlug, teamSlugs),
            ),
          ),
      ]);
      teamIds = Array.from(new Set([
        ...teamResults.map((t) => t.id),
        ...aliasTeamResults.map((t) => t.id),
      ]));
    }
    
    // Lightweight fields for article list (no content/html)
    const listFields = {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      openingText: sql<string>`left(trim(regexp_replace(${articles.content}, '<[^>]+>', ' ', 'g')), 220)`,
      coverImage: articles.coverImage,
      heroImageUrl: articles.heroImageUrl,
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
            group,
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
    const normalizedRows = rawSlice.map((row) => this.normalizeArticleListRow(row));
    const withEntities = await this.attachEntityArraysToArticles(normalizedRows);
    const articlesToReturn = await attachAuthorProfileSlugsToArticleRows(withEntities);
    
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
      articles: articlesToReturn as any,
      appliedFilters: {
          group,
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
      openingText: sql<string>`left(trim(regexp_replace(${articles.content}, '<[^>]+>', ' ', 'g')), 220)`,
      coverImage: articles.coverImage,
      heroImageUrl: articles.heroImageUrl,
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
    const withEntities = await this.attachEntityArraysToArticles(normalizedRows);
    const articlesOut = await attachAuthorProfileSlugsToArticleRows(withEntities);
    return {
      articles: articlesOut,
      nextCursor,
      serverTime,
    };
  }

  async getNewsArchiveByEntity(params: NewsArchiveParams): Promise<NewsArchiveResponse> {
    const { entityType, entitySlug, cursor } = params;
    const limit = Math.min(Math.max(1, params.limit ?? 15), 50);
    let resolvedEntitySlug = entitySlug;

    const listFields = {
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      excerpt: articles.excerpt,
      openingText: sql<string>`left(trim(regexp_replace(${articles.content}, '<[^>]+>', ' ', 'g')), 220)`,
      coverImage: articles.coverImage,
      heroImageUrl: articles.heroImageUrl,
      heroImageCredit: articles.heroImageCredit,
      authorName: articles.authorName,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      sourceUpdatedAt: articles.sourceUpdatedAt,
      sortAt: articles.sortAt,
      competition: articles.competition,
      contentType: articles.contentType,
      tags: articles.tags,
      isFeatured: articles.isFeatured,
      isTrending: articles.isTrending,
      isBreaking: articles.isBreaking,
      viewCount: articles.viewCount,
      commentsCount: articles.commentsCount,
    };

    let entityId: string | null = null;
    if (entityType === "competition") {
      const [competitionByCanonical] = await db
        .select({ id: competitions.id })
        .from(competitions)
        .where(eq(competitions.canonicalSlug, entitySlug))
        .limit(1);
      if (competitionByCanonical) {
        entityId = competitionByCanonical.id;
      } else {
        const [competitionByPublicSlug] = await db
          .select({ id: paEntityAliasMap.entityId })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["competition", "competitions"]),
              eq(paEntityAliasMap.publicSlug, entitySlug),
            ),
          )
          .limit(1);
        if (competitionByPublicSlug) {
          entityId = competitionByPublicSlug.id;
        } else {
          const [competitionByInternalSlug] = await db
            .select({ id: competitions.id })
            .from(competitions)
            .where(eq(competitions.slug, entitySlug))
            .limit(1);
          entityId = competitionByInternalSlug?.id ?? null;
        }
      }
      if (entityId) {
        const [canonicalCompetition] = await db
          .select({ slug: competitions.slug, canonicalSlug: competitions.canonicalSlug })
          .from(competitions)
          .where(eq(competitions.id, entityId))
          .limit(1);
        resolvedEntitySlug =
          canonicalCompetition?.canonicalSlug ||
          canonicalCompetition?.slug ||
          entitySlug;
      }
    } else if (entityType === "team") {
      const [teamByPublicSlug] = await db
        .select({ id: paEntityAliasMap.entityId })
        .from(paEntityAliasMap)
        .where(
          and(
            eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
            inArray(paEntityAliasMap.entityType, ["team", "teams"]),
            eq(paEntityAliasMap.publicSlug, entitySlug),
          ),
        )
        .limit(1);
      if (teamByPublicSlug) {
        entityId = teamByPublicSlug.id;
      } else {
        const [teamByInternalSlug] = await db
          .select({ id: teams.id })
          .from(teams)
          .where(eq(teams.slug, entitySlug))
          .limit(1);
        entityId = teamByInternalSlug?.id ?? null;
      }
      if (entityId) {
        const slugMap = await this.getTeamPublicSlugMap([entityId]);
        const [canonicalTeam] = await db
          .select({ slug: teams.slug })
          .from(teams)
          .where(eq(teams.id, entityId))
          .limit(1);
        resolvedEntitySlug = slugMap.get(entityId) ?? canonicalTeam?.slug ?? entitySlug;
      }
    } else if (entityType === "player") {
      const [player] = await db
        .select({ id: players.id })
        .from(players)
        .where(eq(players.slug, entitySlug))
        .limit(1);
      if (player) {
        entityId = player.id;
        resolvedEntitySlug = entitySlug;
      } else {
        const [playerByPublicSlug] = await db
          .select({ id: paEntityAliasMap.entityId })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["player", "players"]),
              eq(paEntityAliasMap.publicSlug, entitySlug),
            ),
          )
          .limit(1);
        entityId = playerByPublicSlug?.id ?? null;
        if (entityId) {
          const [canonicalPlayer] = await db
            .select({ slug: players.slug })
            .from(players)
            .where(eq(players.id, entityId))
            .limit(1);
          resolvedEntitySlug = canonicalPlayer?.slug ?? entitySlug;
        }
      }
    } else {
      const [manager] = await db
        .select({ id: managers.id })
        .from(managers)
        .where(eq(managers.slug, entitySlug))
        .limit(1);
      if (manager) {
        entityId = manager.id;
        resolvedEntitySlug = entitySlug;
      } else {
        const [managerByPublicSlug] = await db
          .select({ id: paEntityAliasMap.entityId })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["manager", "managers"]),
              eq(paEntityAliasMap.publicSlug, entitySlug),
            ),
          )
          .limit(1);
        entityId = managerByPublicSlug?.id ?? null;
        if (entityId) {
          const [canonicalManager] = await db
            .select({ slug: managers.slug })
            .from(managers)
            .where(eq(managers.id, entityId))
            .limit(1);
          resolvedEntitySlug = canonicalManager?.slug ?? entitySlug;
        }
      }
    }

    if (!entityId) {
      return {
        articles: [],
        nextCursor: null,
        hasMore: false,
        appliedContext: { entityType, entitySlug: resolvedEntitySlug, entityId: null },
      };
    }

    const articleIdsByEntity =
      entityType === "competition"
        ? await db
            .selectDistinct({ articleId: articleCompetitions.articleId })
            .from(articleCompetitions)
            .where(eq(articleCompetitions.competitionId, entityId))
        : entityType === "team"
          ? await db
              .selectDistinct({ articleId: articleTeams.articleId })
              .from(articleTeams)
              .where(eq(articleTeams.teamId, entityId))
          : entityType === "player"
            ? await db
                .selectDistinct({ articleId: articlePlayers.articleId })
                .from(articlePlayers)
                .where(eq(articlePlayers.playerId, entityId))
            : await db
                .selectDistinct({ articleId: articleManagers.articleId })
                .from(articleManagers)
                .where(eq(articleManagers.managerId, entityId));

    const articleIdList = articleIdsByEntity.map((row) => row.articleId);
    if (articleIdList.length === 0) {
      return {
        articles: [],
        nextCursor: null,
        hasMore: false,
        appliedContext: { entityType, entitySlug: resolvedEntitySlug, entityId },
      };
    }

    const conditions: any[] = [inArray(articles.id, articleIdList)];
    if (cursor) {
      const parts = cursor.split("|");
      if (parts.length === 2) {
        const [cursorSortAt, cursorId] = parts;
        const cursorDate = new Date(cursorSortAt);
        conditions.push(
          or(
            lt(articles.sortAt, cursorDate),
            and(eq(articles.sortAt, cursorDate), lt(articles.id, cursorId)),
          ),
        );
      }
    }

    const rows = await db
      .select(listFields)
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.sortAt), desc(articles.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const rawSlice = hasMore ? rows.slice(0, limit) : rows;
    const normalizedRows = rawSlice.map((row) => this.normalizeArticleListRow(row));
    const withEntities = await this.attachEntityArraysToArticles(normalizedRows);
    const articlesToReturn = await attachAuthorProfileSlugsToArticleRows(withEntities);

    let nextCursor: string | null = null;
    if (hasMore && articlesToReturn.length > 0) {
      const lastArticle = articlesToReturn[articlesToReturn.length - 1];
      const sortAtValue = lastArticle.sortAt || lastArticle.sourceUpdatedAt || lastArticle.publishedAt || lastArticle.createdAt;
      if (sortAtValue) nextCursor = `${new Date(sortAtValue).toISOString()}|${lastArticle.id}`;
    }

    return {
      articles: articlesToReturn,
      nextCursor,
      hasMore,
      appliedContext: { entityType, entitySlug: resolvedEntitySlug, entityId },
    };
  }

  // Matches
  private async lookupTeamById(teamId: string | null | undefined): Promise<Team | undefined> {
    if (!teamId) return undefined;
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    return team;
  }

  async getMatches(): Promise<(Match & { homeTeam?: Team; awayTeam?: Team })[]> {
    const results = await db.select().from(matches).orderBy(matches.kickoffTime);
    const enriched = await Promise.all(
      results.map(async (match) => ({
        ...match,
        homeTeam: await this.lookupTeamById(match.homeTeamId),
        awayTeam: await this.lookupTeamById(match.awayTeamId),
      })),
    );
    return enriched;
  }

  async getMatchBySlug(slug: string): Promise<(Match & { homeTeam?: Team; awayTeam?: Team }) | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.slug, slug));
    if (!match) return undefined;
    return {
      ...match,
      homeTeam: await this.lookupTeamById(match.homeTeamId),
      awayTeam: await this.lookupTeamById(match.awayTeamId),
    };
  }

  async getMatchesByTeam(teamSlug: string): Promise<(Match & { homeTeam?: Team; awayTeam?: Team })[]> {
    const team = await this.getTeamBySlug(teamSlug);
    if (!team) return [];

    const results = await db
      .select()
      .from(matches)
      .where(or(eq(matches.homeTeamId, team.id), eq(matches.awayTeamId, team.id)))
      .orderBy(matches.kickoffTime);

    return Promise.all(
      results.map(async (match) => ({
        ...match,
        homeTeam: await this.lookupTeamById(match.homeTeamId),
        awayTeam: await this.lookupTeamById(match.awayTeamId),
      })),
    );
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
