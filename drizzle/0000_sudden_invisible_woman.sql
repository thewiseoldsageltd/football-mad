CREATE TABLE "article_competitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"competition_id" varchar NOT NULL,
	"source" text DEFAULT 'tag' NOT NULL,
	"source_text" text,
	"salience_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_entity_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"action" text NOT NULL,
	"note" text,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "article_managers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"manager_id" varchar NOT NULL,
	"source" text DEFAULT 'tag' NOT NULL,
	"source_text" text,
	"salience_score" integer DEFAULT 0 NOT NULL,
	"confidence" integer
);
--> statement-breakpoint
CREATE TABLE "article_players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"source" text DEFAULT 'tag' NOT NULL,
	"source_text" text,
	"salience_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "article_teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"source" text DEFAULT 'tag' NOT NULL,
	"source_text" text,
	"salience_score" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image" text,
	"hero_image_credit" text,
	"author_id" varchar,
	"author_name" text DEFAULT 'Football Mad',
	"category" text DEFAULT 'news',
	"competition" text DEFAULT 'Premier League',
	"content_type" text DEFAULT 'team-news',
	"tags" text[],
	"is_featured" boolean DEFAULT false,
	"is_trending" boolean DEFAULT false,
	"is_breaking" boolean DEFAULT false,
	"is_editor_pick" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"published_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"source" text DEFAULT 'editorial',
	"source_id" text,
	"source_version" text,
	"source_published_at" timestamp,
	"source_updated_at" timestamp,
	"sort_at" timestamp DEFAULT now(),
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text,
	"user_image" text,
	"post_id" varchar,
	"article_id" varchar,
	"match_id" varchar,
	"parent_id" varchar,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "competition_seasons" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" varchar NOT NULL,
	"season_key" text NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "competition_team_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"season_key" text NOT NULL,
	"membership_type" text,
	"stage" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"source" text DEFAULT 'goalserve' NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"goalserve_competition_id" text,
	"type" text DEFAULT 'league',
	"country" text,
	"season" text,
	"date_start" text,
	"date_end" text,
	"is_cup" boolean DEFAULT false,
	"is_priority" boolean DEFAULT false,
	"canonical_slug" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "competitions_name_unique" UNIQUE("name"),
	CONSTRAINT "competitions_slug_unique" UNIQUE("slug"),
	CONSTRAINT "competitions_goalserve_competition_id_unique" UNIQUE("goalserve_competition_id")
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"alias" text NOT NULL,
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fpl_player_availability" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fpl_element_id" integer NOT NULL,
	"fpl_team_id" integer NOT NULL,
	"team_slug" text NOT NULL,
	"player_name" text NOT NULL,
	"position" text NOT NULL,
	"chance_this_round" integer,
	"chance_next_round" integer,
	"fpl_status" text,
	"news" text,
	"news_added" timestamp,
	"last_synced_at" timestamp DEFAULT now(),
	CONSTRAINT "fpl_player_availability_fpl_element_id_unique" UNIQUE("fpl_element_id")
);
--> statement-breakpoint
CREATE TABLE "injuries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" text NOT NULL,
	"player_id" varchar,
	"team_id" varchar,
	"team_name" text,
	"status" text DEFAULT 'OUT',
	"injury_type" text,
	"expected_return" text,
	"confidence_percent" integer DEFAULT 50,
	"source_name" text,
	"source_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "managers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"nationality" text,
	"image_url" text,
	"current_team_id" varchar,
	"goalserve_manager_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "managers_slug_unique" UNIQUE("slug"),
	CONSTRAINT "managers_goalserve_manager_id_unique" UNIQUE("goalserve_manager_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"goalserve_match_id" text,
	"goalserve_static_id" text,
	"goalserve_competition_id" text,
	"competition_id" varchar,
	"season_key" text,
	"goalserve_round" text,
	"home_goalserve_team_id" text,
	"away_goalserve_team_id" text,
	"home_team_id" varchar,
	"away_team_id" varchar,
	"home_score" integer,
	"away_score" integer,
	"competition" text,
	"venue" text,
	"status" text DEFAULT 'scheduled',
	"kickoff_time" timestamp NOT NULL,
	"predicted_lineup" jsonb,
	"timeline" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "matches_slug_unique" UNIQUE("slug"),
	CONSTRAINT "matches_goalserve_match_id_unique" UNIQUE("goalserve_match_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_email" text,
	"items" jsonb NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'pending',
	"stripe_session_id" text,
	"stripe_payment_intent_id" text,
	"shipping_address" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_team_memberships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"team_id" varchar NOT NULL,
	"shirt_number" text,
	"position" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_loan" boolean DEFAULT false,
	"source" text DEFAULT 'goalserve',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"team_id" varchar,
	"position" text,
	"nationality" text,
	"number" integer,
	"age" integer,
	"image_url" text,
	"market_value" text,
	"goalserve_player_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "players_slug_unique" UNIQUE("slug"),
	CONSTRAINT "players_goalserve_player_id_unique" UNIQUE("goalserve_player_id")
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text,
	"user_image" text,
	"team_id" varchar,
	"content" text NOT NULL,
	"image_url" text,
	"likes_count" integer DEFAULT 0,
	"comments_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"compare_price" numeric(10, 2),
	"image_url" text,
	"images" text[],
	"category" text DEFAULT 'merchandise',
	"team_id" varchar,
	"variants" jsonb,
	"in_stock" boolean DEFAULT true,
	"featured" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "provider_tag_map" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_tag_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"post_id" varchar,
	"comment_id" varchar,
	"type" text DEFAULT 'like',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "share_clicks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" varchar NOT NULL,
	"platform" text NOT NULL,
	"user_id" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "squads_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" text NOT NULL,
	"as_of" timestamp NOT NULL,
	"payload_hash" text NOT NULL,
	"endpoint_used" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" text NOT NULL,
	"season" text NOT NULL,
	"team_goalserve_id" text NOT NULL,
	"team_id" varchar,
	"team_name" text NOT NULL,
	"position" integer NOT NULL,
	"played" integer NOT NULL,
	"wins" integer NOT NULL,
	"draws" integer NOT NULL,
	"losses" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"goal_diff" integer NOT NULL,
	"points" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"raw" jsonb
);
--> statement-breakpoint
CREATE TABLE "standings_rows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" varchar NOT NULL,
	"team_id" varchar,
	"team_goalserve_id" text NOT NULL,
	"team_name" text,
	"position" integer NOT NULL,
	"points" integer NOT NULL,
	"played" integer NOT NULL,
	"won" integer NOT NULL,
	"drawn" integer NOT NULL,
	"lost" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"goal_difference" integer NOT NULL,
	"recent_form" text,
	"movement_status" text,
	"qualification_note" text,
	"home_played" integer NOT NULL,
	"home_won" integer NOT NULL,
	"home_drawn" integer NOT NULL,
	"home_lost" integer NOT NULL,
	"home_goals_for" integer NOT NULL,
	"home_goals_against" integer NOT NULL,
	"away_played" integer NOT NULL,
	"away_won" integer NOT NULL,
	"away_drawn" integer NOT NULL,
	"away_lost" integer NOT NULL,
	"away_goals_for" integer NOT NULL,
	"away_goals_against" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" text NOT NULL,
	"season" text NOT NULL,
	"stage_id" text,
	"as_of" timestamp NOT NULL,
	"source" text DEFAULT 'goalserve',
	"payload_hash" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"tags" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "team_managers" (
	"team_id" varchar PRIMARY KEY NOT NULL,
	"manager_id" varchar NOT NULL,
	"as_of" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_name" text,
	"primary_color" text DEFAULT '#1a1a2e',
	"secondary_color" text DEFAULT '#ffffff',
	"logo_url" text,
	"stadium_name" text,
	"founded" integer,
	"manager" text,
	"league" text DEFAULT 'Premier League',
	"goalserve_team_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_name_unique" UNIQUE("name"),
	CONSTRAINT "teams_slug_unique" UNIQUE("slug"),
	CONSTRAINT "teams_goalserve_team_id_unique" UNIQUE("goalserve_team_id")
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_name" text NOT NULL,
	"player_id" varchar,
	"from_team_id" varchar,
	"to_team_id" varchar,
	"from_team_name" text,
	"to_team_name" text,
	"fee" text,
	"status" text DEFAULT 'rumour',
	"reliability_tier" text DEFAULT 'C',
	"source_name" text,
	"source_url" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "article_competitions" ADD CONSTRAINT "article_competitions_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_competitions" ADD CONSTRAINT "article_competitions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_entity_overrides" ADD CONSTRAINT "article_entity_overrides_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_managers" ADD CONSTRAINT "article_managers_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_managers" ADD CONSTRAINT "article_managers_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_players" ADD CONSTRAINT "article_players_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_players" ADD CONSTRAINT "article_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_teams" ADD CONSTRAINT "article_teams_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "article_teams" ADD CONSTRAINT "article_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_seasons" ADD CONSTRAINT "competition_seasons_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_team_memberships" ADD CONSTRAINT "competition_team_memberships_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_team_memberships" ADD CONSTRAINT "competition_team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "injuries" ADD CONSTRAINT "injuries_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "managers" ADD CONSTRAINT "managers_current_team_id_teams_id_fk" FOREIGN KEY ("current_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_team_memberships" ADD CONSTRAINT "player_team_memberships_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_team_memberships" ADD CONSTRAINT "player_team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_clicks" ADD CONSTRAINT "share_clicks_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_rows" ADD CONSTRAINT "standings_rows_snapshot_id_standings_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."standings_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings_rows" ADD CONSTRAINT "standings_rows_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."managers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_team_id_teams_id_fk" FOREIGN KEY ("from_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_team_id_teams_id_fk" FOREIGN KEY ("to_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "article_competitions_article_idx" ON "article_competitions" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_competitions_competition_idx" ON "article_competitions" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "article_overrides_article_idx" ON "article_entity_overrides" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_overrides_entity_idx" ON "article_entity_overrides" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "article_managers_article_idx" ON "article_managers" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_managers_manager_idx" ON "article_managers" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "article_players_article_idx" ON "article_players" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_players_player_idx" ON "article_players" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "article_teams_article_idx" ON "article_teams" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "article_teams_team_idx" ON "article_teams" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "articles_competition_idx" ON "articles" USING btree ("competition");--> statement-breakpoint
CREATE INDEX "articles_content_type_idx" ON "articles" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "articles_source_source_id_idx" ON "articles" USING btree ("source","source_id");--> statement-breakpoint
CREATE INDEX "articles_sort_at_id_idx" ON "articles" USING btree ("sort_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "competition_seasons_competition_season_uq" ON "competition_seasons" USING btree ("competition_id","season_key");--> statement-breakpoint
CREATE INDEX "competition_seasons_competition_id_idx" ON "competition_seasons" USING btree ("competition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ctm_unique" ON "competition_team_memberships" USING btree ("competition_id","team_id","season_key");--> statement-breakpoint
CREATE INDEX "ctm_team_idx" ON "competition_team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "ctm_competition_idx" ON "competition_team_memberships" USING btree ("competition_id");--> statement-breakpoint
CREATE INDEX "ctm_season_idx" ON "competition_team_memberships" USING btree ("season_key");--> statement-breakpoint
CREATE INDEX "ctm_current_idx" ON "competition_team_memberships" USING btree ("is_current");--> statement-breakpoint
CREATE INDEX "entity_aliases_entity_idx" ON "entity_aliases" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "entity_aliases_alias_idx" ON "entity_aliases" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "follows_user_id_idx" ON "follows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "fpl_availability_team_slug_idx" ON "fpl_player_availability" USING btree ("team_slug");--> statement-breakpoint
CREATE INDEX "fpl_availability_news_added_idx" ON "fpl_player_availability" USING btree ("news_added");--> statement-breakpoint
CREATE INDEX "managers_current_team_idx" ON "managers" USING btree ("current_team_id");--> statement-breakpoint
CREATE INDEX "matches_kickoff_time_idx" ON "matches" USING btree ("kickoff_time");--> statement-breakpoint
CREATE INDEX "matches_goalserve_match_id_idx" ON "matches" USING btree ("goalserve_match_id");--> statement-breakpoint
CREATE INDEX "matches_goalserve_competition_id_idx" ON "matches" USING btree ("goalserve_competition_id");--> statement-breakpoint
CREATE INDEX "matches_goalserve_round_idx" ON "matches" USING btree ("goalserve_round");--> statement-breakpoint
CREATE INDEX "player_memberships_player_idx" ON "player_team_memberships" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "player_memberships_team_idx" ON "player_team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "player_memberships_end_date_idx" ON "player_team_memberships" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "posts_team_id_idx" ON "posts" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "posts_created_at_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "provider_tag_provider_idx" ON "provider_tag_map" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "provider_tag_provider_tag_idx" ON "provider_tag_map" USING btree ("provider_tag_id");--> statement-breakpoint
CREATE INDEX "provider_tag_entity_idx" ON "provider_tag_map" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "share_clicks_article_idx" ON "share_clicks" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX "share_clicks_platform_idx" ON "share_clicks" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "squads_snapshots_league_idx" ON "squads_snapshots" USING btree ("league_id");--> statement-breakpoint
CREATE UNIQUE INDEX "squads_snapshots_league_hash_idx" ON "squads_snapshots" USING btree ("league_id","payload_hash");--> statement-breakpoint
CREATE INDEX "standings_league_season_idx" ON "standings" USING btree ("league_id","season");--> statement-breakpoint
CREATE INDEX "standings_team_goalserve_id_idx" ON "standings" USING btree ("team_goalserve_id");--> statement-breakpoint
CREATE INDEX "standings_rows_snapshot_position_idx" ON "standings_rows" USING btree ("snapshot_id","position");--> statement-breakpoint
CREATE INDEX "standings_snapshots_league_season_asof_idx" ON "standings_snapshots" USING btree ("league_id","season","as_of");--> statement-breakpoint
CREATE INDEX "team_managers_manager_idx" ON "team_managers" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "transfers_status_idx" ON "transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");