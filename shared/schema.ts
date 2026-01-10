import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, decimal, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Re-export auth models
export * from "./models/auth";

// ============ TEAMS ============
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  shortName: text("short_name"),
  primaryColor: text("primary_color").default("#1a1a2e"),
  secondaryColor: text("secondary_color").default("#ffffff"),
  logoUrl: text("logo_url"),
  stadiumName: text("stadium_name"),
  founded: integer("founded"),
  manager: text("manager"),
  league: text("league").default("Premier League"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  articles: many(articleTeams),
  players: many(players),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
  transfers: many(transfers),
  injuries: many(injuries),
  follows: many(follows),
  products: many(products),
  posts: many(posts),
}));

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// ============ PLAYERS ============
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  teamId: varchar("team_id").references(() => teams.id),
  position: text("position"),
  nationality: text("nationality"),
  number: integer("number"),
  age: integer("age"),
  imageUrl: text("image_url"),
  marketValue: text("market_value"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const playersRelations = relations(players, ({ one, many }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
  injuries: many(injuries),
  transfersOut: many(transfers, { relationName: "playerTransfers" }),
}));

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// ============ ARTICLES ============
export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  coverImage: text("cover_image"),
  authorId: varchar("author_id"),
  authorName: text("author_name").default("Football Mad"),
  category: text("category").default("news"),
  competition: text("competition").default("Premier League"),
  contentType: text("content_type").default("team-news"),
  tags: text("tags").array(),
  isFeatured: boolean("is_featured").default(false),
  isTrending: boolean("is_trending").default(false),
  isBreaking: boolean("is_breaking").default(false),
  isEditorPick: boolean("is_editor_pick").default(false),
  viewCount: integer("view_count").default(0),
  commentsCount: integer("comments_count").default(0),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("articles_published_at_idx").on(table.publishedAt),
  index("articles_category_idx").on(table.category),
  index("articles_competition_idx").on(table.competition),
  index("articles_content_type_idx").on(table.contentType),
]);

export const articlesRelations = relations(articles, ({ many }) => ({
  teams: many(articleTeams),
  comments: many(comments),
}));

export const insertArticleSchema = createInsertSchema(articles).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

// ============ ARTICLE-TEAMS JUNCTION ============
export const articleTeams = pgTable("article_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").references(() => articles.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
});

export const articleTeamsRelations = relations(articleTeams, ({ one }) => ({
  article: one(articles, { fields: [articleTeams.articleId], references: [articles.id] }),
  team: one(teams, { fields: [articleTeams.teamId], references: [teams.id] }),
}));

// ============ MATCHES ============
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  homeTeamId: varchar("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: varchar("away_team_id").references(() => teams.id).notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  competition: text("competition").default("Premier League"),
  venue: text("venue"),
  status: text("status").default("scheduled"),
  kickoffTime: timestamp("kickoff_time").notNull(),
  predictedLineup: jsonb("predicted_lineup"),
  timeline: jsonb("timeline"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("matches_kickoff_time_idx").on(table.kickoffTime),
]);

export const matchesRelations = relations(matches, ({ one, many }) => ({
  homeTeam: one(teams, { fields: [matches.homeTeamId], references: [teams.id], relationName: "homeTeam" }),
  awayTeam: one(teams, { fields: [matches.awayTeamId], references: [teams.id], relationName: "awayTeam" }),
  comments: many(comments),
}));

export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Match = typeof matches.$inferSelect;

// ============ TRANSFERS ============
export const transfers = pgTable("transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerName: text("player_name").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  fromTeamId: varchar("from_team_id").references(() => teams.id),
  toTeamId: varchar("to_team_id").references(() => teams.id),
  fromTeamName: text("from_team_name"),
  toTeamName: text("to_team_name"),
  fee: text("fee"),
  status: text("status").default("rumour"),
  reliabilityTier: text("reliability_tier").default("C"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("transfers_status_idx").on(table.status),
]);

export const transfersRelations = relations(transfers, ({ one }) => ({
  player: one(players, { fields: [transfers.playerId], references: [players.id], relationName: "playerTransfers" }),
  fromTeam: one(teams, { fields: [transfers.fromTeamId], references: [teams.id] }),
  toTeam: one(teams, { fields: [transfers.toTeamId], references: [teams.id] }),
}));

export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;

// ============ INJURIES ============
export const injuries = pgTable("injuries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerName: text("player_name").notNull(),
  playerId: varchar("player_id").references(() => players.id),
  teamId: varchar("team_id").references(() => teams.id),
  teamName: text("team_name"),
  status: text("status").default("OUT"),
  injuryType: text("injury_type"),
  expectedReturn: text("expected_return"),
  confidencePercent: integer("confidence_percent").default(50),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const injuriesRelations = relations(injuries, ({ one }) => ({
  player: one(players, { fields: [injuries.playerId], references: [players.id] }),
  team: one(teams, { fields: [injuries.teamId], references: [teams.id] }),
}));

export const insertInjurySchema = createInsertSchema(injuries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInjury = z.infer<typeof insertInjurySchema>;
export type Injury = typeof injuries.$inferSelect;

// ============ FOLLOWS ============
export const follows = pgTable("follows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("follows_user_id_idx").on(table.userId),
]);

export const followsRelations = relations(follows, ({ one }) => ({
  team: one(teams, { fields: [follows.teamId], references: [teams.id] }),
}));

export const insertFollowSchema = createInsertSchema(follows).omit({ id: true, createdAt: true });
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Follow = typeof follows.$inferSelect;

// ============ POSTS (Community) ============
export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name"),
  userImage: text("user_image"),
  teamId: varchar("team_id").references(() => teams.id),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  likesCount: integer("likes_count").default(0),
  commentsCount: integer("comments_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("posts_team_id_idx").on(table.teamId),
  index("posts_created_at_idx").on(table.createdAt),
]);

export const postsRelations = relations(posts, ({ one, many }) => ({
  team: one(teams, { fields: [posts.teamId], references: [teams.id] }),
  comments: many(comments),
  reactions: many(reactions),
}));

export const insertPostSchema = createInsertSchema(posts).omit({ id: true, createdAt: true, likesCount: true, commentsCount: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// ============ COMMENTS ============
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name"),
  userImage: text("user_image"),
  postId: varchar("post_id").references(() => posts.id),
  articleId: varchar("article_id").references(() => articles.id),
  matchId: varchar("match_id").references(() => matches.id),
  parentId: varchar("parent_id"),
  content: text("content").notNull(),
  likesCount: integer("likes_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  article: one(articles, { fields: [comments.articleId], references: [articles.id] }),
  match: one(matches, { fields: [comments.matchId], references: [matches.id] }),
  reactions: many(reactions),
}));

export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, likesCount: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// ============ REACTIONS ============
export const reactions = pgTable("reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  postId: varchar("post_id").references(() => posts.id),
  commentId: varchar("comment_id").references(() => comments.id),
  type: text("type").default("like"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reactionsRelations = relations(reactions, ({ one }) => ({
  post: one(posts, { fields: [reactions.postId], references: [posts.id] }),
  comment: one(comments, { fields: [reactions.commentId], references: [comments.id] }),
}));

export const insertReactionSchema = createInsertSchema(reactions).omit({ id: true, createdAt: true });
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type Reaction = typeof reactions.$inferSelect;

// ============ PRODUCTS ============
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  comparePrice: decimal("compare_price", { precision: 10, scale: 2 }),
  imageUrl: text("image_url"),
  images: text("images").array(),
  category: text("category").default("merchandise"),
  teamId: varchar("team_id").references(() => teams.id),
  variants: jsonb("variants"),
  inStock: boolean("in_stock").default(true),
  featured: boolean("featured").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productsRelations = relations(products, ({ one }) => ({
  team: one(teams, { fields: [products.teamId], references: [teams.id] }),
}));

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// ============ ORDERS ============
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userEmail: text("user_email"),
  items: jsonb("items").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"),
  stripeSessionId: text("stripe_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  shippingAddress: jsonb("shipping_address"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// ============ SUBSCRIBERS ============
export const subscribers = pgTable("subscribers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  tags: text("tags").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSubscriberSchema = createInsertSchema(subscribers).omit({ id: true, createdAt: true });
export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof subscribers.$inferSelect;

// ============ SHARE CLICKS (ANALYTICS) ============
export const shareClicks = pgTable("share_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").references(() => articles.id).notNull(),
  platform: text("platform").notNull(), // whatsapp, twitter, facebook, copy, native
  userId: varchar("user_id"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("share_clicks_article_idx").on(table.articleId),
  index("share_clicks_platform_idx").on(table.platform),
]);

export const insertShareClickSchema = createInsertSchema(shareClicks).omit({ id: true, createdAt: true });
export type InsertShareClick = z.infer<typeof insertShareClickSchema>;
export type ShareClick = typeof shareClicks.$inferSelect;

// ============ NEWS FILTER CONSTANTS & SCHEMAS ============
export const NEWS_COMPETITIONS = {
  all: { value: "all", label: "All", slug: "all" },
  "premier-league": { value: "premier-league", label: "Premier League", slug: "premier-league", dbValue: "Premier League" },
  "championship": { value: "championship", label: "Championship", slug: "championship", dbValue: "Championship" },
  "league-one": { value: "league-one", label: "League One", slug: "league-one", dbValue: "League One" },
  "league-two": { value: "league-two", label: "League Two", slug: "league-two", dbValue: "League Two" },
} as const;

export const NEWS_CONTENT_TYPES = {
  "team-news": { value: "team-news", label: "Team News" },
  "match-preview": { value: "match-preview", label: "Match Preview" },
  "match-report": { value: "match-report", label: "Match Report" },
  "analysis": { value: "analysis", label: "Analysis" },
  "opinion": { value: "opinion", label: "Opinion" },
  "explainer": { value: "explainer", label: "Explainers" },
  "fpl": { value: "fpl", label: "FPL" },
} as const;

export const NEWS_SORT_OPTIONS = {
  "latest": { value: "latest", label: "Latest" },
  "trending": { value: "trending", label: "Trending" },
  "discussed": { value: "discussed", label: "Most Discussed" },
  "for-you": { value: "for-you", label: "For You", requiresAuth: true },
} as const;

export const NEWS_TIME_RANGES = {
  "24h": { value: "24h", label: "24 hours", hours: 24 },
  "7d": { value: "7d", label: "7 days", hours: 168 },
  "30d": { value: "30d", label: "30 days", hours: 720 },
  "all": { value: "all", label: "All time", hours: null },
} as const;

export const newsFiltersSchema = z.object({
  comp: z.enum(["all", "premier-league", "championship", "league-one", "league-two"]).default("all"),
  type: z.string().optional().transform(val => val ? val.split(",").filter(Boolean) : []),
  teams: z.string().optional(),
  sort: z.enum(["latest", "trending", "discussed", "for-you"]).default("latest"),
  range: z.enum(["24h", "7d", "30d", "all"]).default("all"),
  breaking: z.string().optional().transform(val => val === "true"),
});

export type NewsFilters = z.infer<typeof newsFiltersSchema>;

export type NewsFiltersResponse = {
  articles: Article[];
  appliedFilters: {
    comp: string;
    type: string[];
    teams: string[];
    myTeams: boolean;
    sort: string;
    range: string;
    breaking: boolean;
    total: number;
  };
};
