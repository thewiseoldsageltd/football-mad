ALTER TABLE "competitions"
  ADD COLUMN IF NOT EXISTS "canonical_name" text;
