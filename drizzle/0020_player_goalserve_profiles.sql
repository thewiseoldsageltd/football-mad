-- Player Hub Phase C: Goalserve soccerstats/player profile enrichment

ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "common_name" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "first_name" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "last_name" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "date_of_birth" timestamp;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birth_place" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "birth_country" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "height_cm" integer;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "weight_kg" integer;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "preferred_foot" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "goalserve_national_team_id" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "goalserve_current_team_id" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "goalserve_current_team_name" text;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "market_value_eur" integer;
ALTER TABLE "players" ADD COLUMN IF NOT EXISTS "profile_synced_at" timestamp;

CREATE TABLE IF NOT EXISTS "player_career_stats" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "category" text NOT NULL,
  "season" text NOT NULL,
  "club_name" text,
  "goalserve_club_id" text,
  "competition_name" text,
  "goalserve_competition_id" text,
  "appearances" integer,
  "starts" integer,
  "substitute_appearances" integer,
  "substituted_off" integer,
  "unused_bench" integer,
  "minutes" integer,
  "captain_appearances" integer,
  "goals" integer,
  "assists" integer,
  "shots" integer,
  "shots_on_target" integer,
  "key_passes" integer,
  "dribbles" integer,
  "successful_dribbles" integer,
  "penalties_won" integer,
  "penalties_scored" integer,
  "penalties_missed" integer,
  "woodwork_hits" integer,
  "passes" integer,
  "passes_accurate" integer,
  "crosses" integer,
  "accurate_crosses" integer,
  "tackles" integer,
  "interceptions" integer,
  "blocks" integer,
  "clearances" integer,
  "duels" integer,
  "duels_won" integer,
  "fouls_won" integer,
  "fouls_committed" integer,
  "dispossessions" integer,
  "penalties_conceded" integer,
  "saves" integer,
  "goals_conceded" integer,
  "penalties_saved" integer,
  "inside_box_saves" integer,
  "yellow_cards" integer,
  "second_yellow" integer,
  "red_cards" integer,
  "rating" real,
  "source" text DEFAULT 'goalserve',
  "updated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "player_career_stats_player_idx"
  ON "player_career_stats" ("player_id");
CREATE INDEX IF NOT EXISTS "player_career_stats_player_category_idx"
  ON "player_career_stats" ("player_id", "category");

CREATE TABLE IF NOT EXISTS "player_career_totals" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "scope" text NOT NULL DEFAULT 'overall_clubs',
  "appearances" integer,
  "starts" integer,
  "substitute_appearances" integer,
  "minutes" integer,
  "captain_appearances" integer,
  "goals" integer,
  "assists" integer,
  "shots" integer,
  "shots_on_target" integer,
  "key_passes" integer,
  "dribbles" integer,
  "successful_dribbles" integer,
  "penalties_won" integer,
  "penalties_scored" integer,
  "penalties_missed" integer,
  "woodwork_hits" integer,
  "passes" integer,
  "passes_accurate" integer,
  "crosses" integer,
  "accurate_crosses" integer,
  "tackles" integer,
  "interceptions" integer,
  "blocks" integer,
  "clearances" integer,
  "duels" integer,
  "duels_won" integer,
  "fouls_won" integer,
  "fouls_committed" integer,
  "dispossessions" integer,
  "penalties_conceded" integer,
  "saves" integer,
  "goals_conceded" integer,
  "penalties_saved" integer,
  "inside_box_saves" integer,
  "yellow_cards" integer,
  "second_yellow" integer,
  "red_cards" integer,
  "rating" real,
  "source" text DEFAULT 'goalserve',
  "updated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "player_career_totals_player_scope_uidx"
  ON "player_career_totals" ("player_id", "scope");

CREATE TABLE IF NOT EXISTS "player_profile_transfers" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "transfer_date" timestamp,
  "transfer_date_raw" text,
  "from_club_name" text,
  "from_goalserve_club_id" text,
  "to_club_name" text,
  "to_goalserve_club_id" text,
  "fee" text,
  "transfer_type" text,
  "sort_index" integer NOT NULL DEFAULT 0,
  "source" text DEFAULT 'goalserve',
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "player_profile_transfers_player_idx"
  ON "player_profile_transfers" ("player_id");

CREATE TABLE IF NOT EXISTS "player_sidelined" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "kind" text,
  "type_label" text NOT NULL,
  "date_start" timestamp,
  "date_end" timestamp,
  "date_start_raw" text,
  "date_end_raw" text,
  "games_missed" integer,
  "sort_index" integer NOT NULL DEFAULT 0,
  "source" text DEFAULT 'goalserve',
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "player_sidelined_player_idx"
  ON "player_sidelined" ("player_id");

CREATE TABLE IF NOT EXISTS "player_honours" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL REFERENCES "players"("id") ON DELETE CASCADE,
  "competition" text NOT NULL,
  "country" text,
  "status" text,
  "count" integer,
  "seasons_raw" text,
  "sort_index" integer NOT NULL DEFAULT 0,
  "source" text DEFAULT 'goalserve',
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "player_honours_player_idx"
  ON "player_honours" ("player_id");
