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

-- Recreate import tables so schema exactly matches generated CSV shape.
DROP TABLE IF EXISTS pa_entity_map_raw;
DROP TABLE IF EXISTS pa_entity_alias_map;

CREATE TABLE pa_entity_map_raw (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_slug TEXT,
  public_slug TEXT,
  goalserve_slug TEXT,
  pa_tag_names TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE pa_entity_alias_map (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_slug TEXT,
  public_slug TEXT,
  goalserve_slug TEXT,
  pa_tag_name TEXT NOT NULL,
  pa_tag_name_normalized TEXT NOT NULL DEFAULT '',
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup/perf indexes
CREATE INDEX IF NOT EXISTS pa_entity_map_raw_source_idx
  ON pa_entity_map_raw (source);
CREATE INDEX IF NOT EXISTS pa_entity_map_raw_entity_idx
  ON pa_entity_map_raw (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS pa_entity_map_raw_tag_names_idx
  ON pa_entity_map_raw (pa_tag_names);

CREATE INDEX IF NOT EXISTS pa_entity_alias_map_source_idx
  ON pa_entity_alias_map (source);
CREATE INDEX IF NOT EXISTS pa_entity_alias_map_entity_idx
  ON pa_entity_alias_map (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS pa_entity_alias_map_alias_norm_idx
  ON pa_entity_alias_map (pa_tag_name_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS pa_entity_alias_map_unique_idx
  ON pa_entity_alias_map (source, pa_tag_name_normalized, entity_type, entity_id);

COMMIT;

-- Idempotent reload: replace imported data with latest generated CSVs
TRUNCATE TABLE pa_entity_map_raw RESTART IDENTITY;
TRUNCATE TABLE pa_entity_alias_map RESTART IDENTITY;

\copy pa_entity_map_raw (source, entity_type, entity_id, entity_slug, public_slug, goalserve_slug, pa_tag_names, display_name) FROM 'football_mad_mappings_corrected.csv' WITH (FORMAT csv, HEADER true);
\copy pa_entity_alias_map (source, entity_type, entity_id, entity_slug, public_slug, goalserve_slug, pa_tag_name, display_name) FROM 'football_mad_mappings_normalized.csv' WITH (FORMAT csv, HEADER true);

-- Safety normalization pass (keeps lookup keys consistent)
UPDATE pa_entity_alias_map
SET pa_tag_name_normalized = regexp_replace(replace(lower(trim(pa_tag_name)), '-', ' '), '\s+', ' ', 'g')
WHERE pa_tag_name_normalized IS DISTINCT FROM regexp_replace(replace(lower(trim(pa_tag_name)), '-', ' '), '\s+', ' ', 'g');
