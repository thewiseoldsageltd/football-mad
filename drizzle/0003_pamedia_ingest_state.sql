-- PA Media ingest cursor for incremental runs
CREATE TABLE IF NOT EXISTS pamedia_ingest_state (
  key text PRIMARY KEY DEFAULT 'default',
  last_issued timestamptz,
  last_uri text,
  updated_at timestamptz DEFAULT now()
);
