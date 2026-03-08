-- Phase 3 archive readiness checks

SELECT
  (SELECT COUNT(*) FROM article_competitions) AS article_competitions_count,
  (SELECT COUNT(*) FROM article_teams) AS article_teams_count,
  (SELECT COUNT(*) FROM article_players) AS article_players_count,
  (SELECT COUNT(*) FROM article_managers) AS article_managers_count;

SELECT c.slug, c.name, COUNT(ac.article_id) AS article_count
FROM competitions c
LEFT JOIN article_competitions ac ON ac.competition_id = c.id
GROUP BY c.id, c.slug, c.name
ORDER BY article_count DESC
LIMIT 20;

SELECT t.slug, t.name, COUNT(at.article_id) AS article_count
FROM teams t
LEFT JOIN article_teams at ON at.team_id = t.id
GROUP BY t.id, t.slug, t.name
ORDER BY article_count DESC
LIMIT 20;

SELECT p.slug, p.name, COUNT(ap.article_id) AS article_count
FROM players p
LEFT JOIN article_players ap ON ap.player_id = p.id
GROUP BY p.id, p.slug, p.name
ORDER BY article_count DESC
LIMIT 20;

SELECT m.slug, m.name, COUNT(am.article_id) AS article_count
FROM managers m
LEFT JOIN article_managers am ON am.manager_id = m.id
GROUP BY m.id, m.slug, m.name
ORDER BY article_count DESC
LIMIT 20;
