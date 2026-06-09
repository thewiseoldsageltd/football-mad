-- Link canonical FIFA World Cup (is_priority) to Goalserve league 1056 so /api/matches/day includes WC fixtures.
-- Fixtures were ingested against the auto-synced duplicate row; repoint matches to the canonical competition.

UPDATE matches
SET competition_id = 'ca36e169-09bf-4db0-942c-54ceb529f870'
WHERE competition_id = '56eefccf-ac84-435a-8f8d-0f6baa5ff059';

UPDATE competitions
SET goalserve_competition_id = NULL
WHERE id = '56eefccf-ac84-435a-8f8d-0f6baa5ff059';

UPDATE competitions
SET goalserve_competition_id = '1056'
WHERE id = 'ca36e169-09bf-4db0-942c-54ceb529f870';
