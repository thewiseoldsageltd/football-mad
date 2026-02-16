-- Patch drift: some DBs were baselined without running 0000, so columns may be missing.
ALTER TABLE squads_snapshots
  ADD COLUMN IF NOT EXISTS endpoint_used text;

UPDATE squads_snapshots
  SET endpoint_used = COALESCE(endpoint_used, 'soccerleague');

ALTER TABLE squads_snapshots
  ALTER COLUMN endpoint_used SET NOT NULL;

ALTER TABLE player_team_memberships
  ADD COLUMN IF NOT EXISTS shirt_number text;

ALTER TABLE player_team_memberships
  ADD COLUMN IF NOT EXISTS position text;
