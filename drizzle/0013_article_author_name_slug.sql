-- Stored slug for indexed author page filters; expression must match slugifyAuthorName / legacy authorNameSlugSql.
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "author_name_slug" text GENERATED ALWAYS AS (
  trim(both '-' from regexp_replace(lower(trim(coalesce("author_name", ''))), '[^a-z0-9]+', '-', 'g'))
) STORED;

CREATE INDEX IF NOT EXISTS "articles_author_name_slug_sort_at_id_idx" ON "articles" ("author_name_slug", "sort_at" DESC, "id" DESC);
