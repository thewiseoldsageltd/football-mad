-- PA Entity Map import (idempotent)
-- Creates:
--   1) pa_entity_map_raw   - raw spreadsheet-derived mapping rows
--   2) pa_entity_alias_map - normalized alias lookup table (source of truth for PA tag -> entity resolution)
--
-- Expected CSV files in the same working directory when running this script:
--   - football_mad_mappings_corrected.csv
--   - football_mad_mappings_normalized.csv
--
-- Usage:
--   cd /opt/render/project/src/script/imports
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f football_mad_pa_entity_map.sql

BEGIN;

CREATE TABLE IF NOT EXISTS pa_entity_map_raw (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  pa_tag TEXT NOT NULL,
  pa_tag_normalized TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  entity_slug TEXT,
  confidence NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pa_entity_alias_map (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  alias TEXT NOT NULL,
  alias_normalized TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  entity_slug TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  confidence NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup/perf indexes
CREATE INDEX IF NOT EXISTS pa_entity_map_raw_source_idx
  ON pa_entity_map_raw (source);
CREATE INDEX IF NOT EXISTS pa_entity_map_raw_entity_idx
  ON pa_entity_map_raw (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS pa_entity_map_raw_tag_norm_idx
  ON pa_entity_map_raw (pa_tag_normalized);

CREATE INDEX IF NOT EXISTS pa_entity_alias_map_source_idx
  ON pa_entity_alias_map (source);
CREATE INDEX IF NOT EXISTS pa_entity_alias_map_entity_idx
  ON pa_entity_alias_map (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS pa_entity_alias_map_alias_norm_idx
  ON pa_entity_alias_map (alias_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS pa_entity_alias_map_unique_idx
  ON pa_entity_alias_map (source, alias_normalized, entity_type, entity_id);

COMMIT;

-- Idempotent reload: replace imported data with latest generated CSVs
TRUNCATE TABLE pa_entity_map_raw RESTART IDENTITY;
TRUNCATE TABLE pa_entity_alias_map RESTART IDENTITY;

\copy pa_entity_map_raw (
  source,
  pa_tag,
  pa_tag_normalized,
  entity_type,
  entity_id,
  entity_name,
  entity_slug,
  confidence,
  notes
) FROM 'football_mad_mappings_corrected.csv' WITH (FORMAT csv, HEADER true);

\copy pa_entity_alias_map (
  source,
  alias,
  alias_normalized,
  entity_type,
  entity_id,
  entity_name,
  entity_slug,
  is_primary,
  confidence,
  notes
) FROM 'football_mad_mappings_normalized.csv' WITH (FORMAT csv, HEADER true);

-- Safety normalization pass (keeps lookup keys consistent)
UPDATE pa_entity_map_raw
SET pa_tag_normalized = lower(trim(pa_tag_normalized))
WHERE pa_tag_normalized <> lower(trim(pa_tag_normalized));

UPDATE pa_entity_alias_map
SET alias_normalized = lower(trim(alias_normalized))
WHERE alias_normalized <> lower(trim(alias_normalized));
