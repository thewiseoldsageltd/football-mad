ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "standings_last_attempted_at" timestamp;

CREATE INDEX IF NOT EXISTS "competitions_standings_last_attempted_at_idx"
  ON "competitions" ("standings_last_attempted_at");
