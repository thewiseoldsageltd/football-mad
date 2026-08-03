ALTER TABLE "player_team_memberships" ADD COLUMN IF NOT EXISTS "last_seen_at" timestamp;

CREATE INDEX IF NOT EXISTS "player_memberships_last_seen_at_idx"
  ON "player_team_memberships" ("last_seen_at");
