-- Entity enrichment pipeline: status and index for pending lookups.
-- Existing rows are set to 'done' so we don't backfill on deploy.

ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS entity_enrich_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS entity_enrich_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS entity_enrich_error text;

-- Existing articles: mark as done so they are not queued for enrichment on first deploy.
UPDATE articles
SET entity_enrich_status = 'done';

-- Index for fast "pending" lookups, newest first (for batch processing).
CREATE INDEX IF NOT EXISTS articles_entity_enrich_status_published_idx
  ON articles (entity_enrich_status, published_at DESC);
