ALTER TABLE "competitions" ADD COLUMN IF NOT EXISTS "fixtures_last_attempted_at" timestamp;

CREATE INDEX IF NOT EXISTS "competitions_fixtures_last_attempted_at_idx"
  ON "competitions" ("fixtures_last_attempted_at");
