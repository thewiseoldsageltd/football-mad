-- Phase 4 historical enrichment verification (MVP corpus: ghost + pa_media).
-- Run before and after backfill and compare outputs.

-- 1) Global row counts in article entity link tables.
SELECT
  (SELECT COUNT(*) FROM article_competitions) AS article_competitions_count,
  (SELECT COUNT(*) FROM article_teams) AS article_teams_count,
  (SELECT COUNT(*) FROM article_players) AS article_players_count,
  (SELECT COUNT(*) FROM article_managers) AS article_managers_count;

-- 2) Distinct article coverage by entity type.
SELECT
  (SELECT COUNT(DISTINCT article_id) FROM article_competitions) AS covered_articles_competitions,
  (SELECT COUNT(DISTINCT article_id) FROM article_teams) AS covered_articles_teams,
  (SELECT COUNT(DISTINCT article_id) FROM article_players) AS covered_articles_players,
  (SELECT COUNT(DISTINCT article_id) FROM article_managers) AS covered_articles_managers;

-- 3) Source breakdown for each entity type.
SELECT a.source, COUNT(DISTINCT ac.article_id) AS covered_articles
FROM article_competitions ac
JOIN articles a ON a.id = ac.article_id
GROUP BY a.source
ORDER BY covered_articles DESC;

SELECT a.source, COUNT(DISTINCT at.article_id) AS covered_articles
FROM article_teams at
JOIN articles a ON a.id = at.article_id
GROUP BY a.source
ORDER BY covered_articles DESC;

SELECT a.source, COUNT(DISTINCT ap.article_id) AS covered_articles
FROM article_players ap
JOIN articles a ON a.id = ap.article_id
GROUP BY a.source
ORDER BY covered_articles DESC;

SELECT a.source, COUNT(DISTINCT am.article_id) AS covered_articles
FROM article_managers am
JOIN articles a ON a.id = am.article_id
GROUP BY a.source
ORDER BY covered_articles DESC;

-- 4) Duplicate link checks (should return zero rows).
SELECT article_id, competition_id, COUNT(*) AS c
FROM article_competitions
GROUP BY article_id, competition_id
HAVING COUNT(*) > 1;

SELECT article_id, team_id, COUNT(*) AS c
FROM article_teams
GROUP BY article_id, team_id
HAVING COUNT(*) > 1;

SELECT article_id, player_id, COUNT(*) AS c
FROM article_players
GROUP BY article_id, player_id
HAVING COUNT(*) > 1;

SELECT article_id, manager_id, COUNT(*) AS c
FROM article_managers
GROUP BY article_id, manager_id
HAVING COUNT(*) > 1;

-- 5) MVP-corpus articles with zero links across all four entity tables, grouped by source.
WITH mvp_articles AS (
  SELECT id, source
  FROM articles
  WHERE source IN ('ghost', 'pa_media')
),
linked AS (
  SELECT article_id FROM article_competitions
  UNION
  SELECT article_id FROM article_teams
  UNION
  SELECT article_id FROM article_players
  UNION
  SELECT article_id FROM article_managers
)
SELECT ma.source, COUNT(*) AS articles_without_any_links
FROM mvp_articles ma
LEFT JOIN linked l ON l.article_id = ma.id
WHERE l.article_id IS NULL
GROUP BY ma.source
ORDER BY articles_without_any_links DESC;

-- 6) MVP boundary safety checks.
WITH mvp_teams AS (
  SELECT DISTINCT ctm.team_id
  FROM competition_team_memberships ctm
  JOIN competitions c ON c.id = ctm.competition_id
  WHERE c.is_priority = true
    AND ctm.is_current = true
),
mvp_competitions AS (
  SELECT id
  FROM competitions
  WHERE is_priority = true
),
latest_active_membership AS (
  SELECT DISTINCT ON (ptm.player_id)
    ptm.player_id,
    ptm.team_id
  FROM player_team_memberships ptm
  WHERE ptm.end_date IS NULL OR ptm.end_date > now()
  ORDER BY ptm.player_id, ptm.start_date DESC NULLS LAST, ptm.created_at DESC, ptm.id DESC
),
player_current_team AS (
  SELECT p.id AS player_id, COALESCE(lam.team_id, p.team_id) AS team_id
  FROM players p
  LEFT JOIN latest_active_membership lam ON lam.player_id = p.id
)
SELECT
  (SELECT COUNT(*)
   FROM article_competitions ac
   WHERE NOT EXISTS (
     SELECT 1 FROM mvp_competitions mc WHERE mc.id = ac.competition_id
   )) AS out_of_mvp_competition_links,
  (SELECT COUNT(*)
   FROM article_teams at
   WHERE NOT EXISTS (
     SELECT 1 FROM mvp_teams mt WHERE mt.team_id = at.team_id
   )) AS out_of_mvp_team_links,
  (SELECT COUNT(*)
   FROM article_managers am
   JOIN managers m ON m.id = am.manager_id
   WHERE m.current_team_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM mvp_teams mt WHERE mt.team_id = m.current_team_id
      )) AS out_of_mvp_manager_links,
  (SELECT COUNT(*)
   FROM article_players ap
   JOIN player_current_team pct ON pct.player_id = ap.player_id
   WHERE pct.team_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM mvp_teams mt WHERE mt.team_id = pct.team_id
      )) AS out_of_mvp_player_links;

-- 7) Progress helper: status distribution for deterministic enrich queue.
SELECT entity_enrich_status, COUNT(*) AS article_count
FROM articles
WHERE source IN ('ghost', 'pa_media')
GROUP BY entity_enrich_status
ORDER BY entity_enrich_status;
