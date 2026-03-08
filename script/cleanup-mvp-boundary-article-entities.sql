BEGIN;

-- Canonical MVP team/competition sets.
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
),
deleted_article_teams AS (
  DELETE FROM article_teams at
  WHERE NOT EXISTS (
    SELECT 1
    FROM mvp_teams mt
    WHERE mt.team_id = at.team_id
  )
  RETURNING at.id
),
deleted_article_competitions AS (
  DELETE FROM article_competitions ac
  WHERE NOT EXISTS (
    SELECT 1
    FROM mvp_competitions mc
    WHERE mc.id = ac.competition_id
  )
  RETURNING ac.id
),
deleted_article_managers AS (
  DELETE FROM article_managers am
  USING managers m
  WHERE am.manager_id = m.id
    AND (
      m.current_team_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM mvp_teams mt
        WHERE mt.team_id = m.current_team_id
      )
    )
  RETURNING am.id
),
deleted_article_players AS (
  DELETE FROM article_players ap
  USING player_current_team pct
  WHERE ap.player_id = pct.player_id
    AND (
      pct.team_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM mvp_teams mt
        WHERE mt.team_id = pct.team_id
      )
    )
  RETURNING ap.id
)
SELECT
  (SELECT COUNT(*) FROM deleted_article_teams) AS deleted_article_teams,
  (SELECT COUNT(*) FROM deleted_article_competitions) AS deleted_article_competitions,
  (SELECT COUNT(*) FROM deleted_article_managers) AS deleted_article_managers,
  (SELECT COUNT(*) FROM deleted_article_players) AS deleted_article_players;

COMMIT;
