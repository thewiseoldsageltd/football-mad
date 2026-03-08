-- Manager graph integrity checks (Phase 2).

-- 1) Canonical mapping count.
SELECT COUNT(*) AS team_managers_count
FROM team_managers;

-- 2) Drift: canonical mapping vs mirror column.
SELECT COUNT(*) AS canonical_vs_mirror_mismatches
FROM team_managers tm
JOIN managers m ON m.id = tm.manager_id
WHERE m.current_team_id IS DISTINCT FROM tm.team_id;

-- 3) Orphaned canonical rows (should be zero).
SELECT COUNT(*) AS orphan_team_manager_rows
FROM team_managers tm
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN managers m ON m.id = tm.manager_id
WHERE t.id IS NULL OR m.id IS NULL;

-- 4) Managers mapped to multiple teams in canonical table (review if non-zero).
SELECT tm.manager_id, COUNT(*) AS team_count
FROM team_managers tm
GROUP BY tm.manager_id
HAVING COUNT(*) > 1
ORDER BY team_count DESC;

-- 5) Mirror-only manager rows (fallback reads would be used).
SELECT COUNT(*) AS mirror_only_rows
FROM managers m
LEFT JOIN team_managers tm ON tm.manager_id = m.id
WHERE m.current_team_id IS NOT NULL
  AND tm.manager_id IS NULL;

-- 6) Slug duplication sanity (should be zero).
SELECT slug, COUNT(*) AS count
FROM managers
GROUP BY slug
HAVING COUNT(*) > 1;
