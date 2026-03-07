# PA Entity Map Import

This folder contains the database import setup for spreadsheet-derived PA mapping data.

## Tables

- `pa_entity_map_raw`
  - Raw, corrected mapping rows from the source spreadsheet export.
  - Useful for auditing and diffing generated mapping batches.

- `pa_entity_alias_map`
  - Normalized alias lookup table.
  - **Source of truth** for PA tag/alias -> canonical entity resolution.

## Files expected at import time

- `football_mad_mappings_corrected.csv`
- `football_mad_mappings_normalized.csv`

## Run on Render shell

```bash
cd /opt/render/project/src/script/imports
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f football_mad_pa_entity_map.sql
```

The SQL script is idempotent for setup and reload:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `TRUNCATE + \copy` for deterministic data reload
