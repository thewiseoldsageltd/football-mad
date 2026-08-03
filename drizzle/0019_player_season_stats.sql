CREATE TABLE IF NOT EXISTS "player_season_stats" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" varchar NOT NULL REFERENCES "players"("id"),
  "team_id" varchar REFERENCES "teams"("id"),
  "competition_id" varchar REFERENCES "competitions"("id"),
  "goalserve_competition_id" text NOT NULL,
  "season" text NOT NULL,
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
  "as_of" timestamp,
  "updated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "player_season_stats_player_comp_season_uidx"
  ON "player_season_stats" ("player_id", "goalserve_competition_id", "season");

CREATE INDEX IF NOT EXISTS "player_season_stats_player_idx"
  ON "player_season_stats" ("player_id");

CREATE INDEX IF NOT EXISTS "player_season_stats_team_idx"
  ON "player_season_stats" ("team_id");

CREATE INDEX IF NOT EXISTS "player_season_stats_competition_idx"
  ON "player_season_stats" ("competition_id");
