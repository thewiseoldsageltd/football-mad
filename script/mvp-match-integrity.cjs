require("dotenv").config();
const fs = require("fs");
const { Client } = require("pg");

(async () => {
  const mvp = fs
    .readFileSync("config/mvp-league-ids.txt", "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!mvp.length) {
    console.error("ERROR: config/mvp-league-ids.txt is empty or missing");
    process.exit(1);
  }

  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log("=== MVP MATCH INTEGRITY ===");
  console.log({ mvp_competitions: mvp.length });

  // 1) Overall MVP match totals + missing links
  const overallSql =
    "select " +
    "  count(*)::int as mvp_matches_total, " +
    "  sum((m.competition_id is null)::int)::int as missing_competition_id, " +
    "  sum((m.home_team_id is null)::int)::int as missing_home_team_id, " +
    "  sum((m.away_team_id is null)::int)::int as missing_away_team_id, " +
    "  sum((m.kickoff_time >= now())::int)::int as future_matches, " +
    "  sum((m.kickoff_time < now())::int)::int as past_matches " +
    "from matches m " +
    "where m.goalserve_competition_id = any($1::text[])";

  const overall = await c.query(overallSql, [mvp]);
  console.log("\n--- OVERALL (MVP only) ---");
  console.log(overall.rows[0]);

  // 2) Backfillability checks (MVP only)
  const backfillSql =
    "select " +
    "  sum((m.competition_id is null and c2.id is not null)::int)::int as comp_backfillable, " +
    "  sum((m.home_team_id is null and th.id is not null)::int)::int as home_team_backfillable, " +
    "  sum((m.away_team_id is null and ta.id is not null)::int)::int as away_team_backfillable " +
    "from matches m " +
    "left join competitions c2 on c2.goalserve_competition_id = m.goalserve_competition_id " +
    "left join teams th on th.goalserve_team_id = m.home_goalserve_team_id " +
    "left join teams ta on ta.goalserve_team_id = m.away_goalserve_team_id " +
    "where m.goalserve_competition_id = any($1::text[])";

  const backfill = await c.query(backfillSql, [mvp]);
  console.log("\n--- BACKFILLABLE COUNTS (MVP only) ---");
  console.log(backfill.rows[0]);

  // 3) Breakdown by competition (MVP only)
  const byCompSql =
    "select " +
    "  m.goalserve_competition_id, " +
    "  max(coalesce(c2.name, m.competition, '(unknown)')) as competition_name, " +
    "  count(*)::int as matches, " +
    "  sum((m.competition_id is null)::int)::int as missing_competition_id, " +
    "  sum((m.home_team_id is null)::int)::int as missing_home_team_id, " +
    "  sum((m.away_team_id is null)::int)::int as missing_away_team_id, " +
    "  min(m.kickoff_time) as first_kickoff, " +
    "  max(m.kickoff_time) as last_kickoff " +
    "from matches m " +
    "left join competitions c2 on c2.goalserve_competition_id = m.goalserve_competition_id " +
    "where m.goalserve_competition_id = any($1::text[]) " +
    "group by m.goalserve_competition_id " +
    "order by matches desc";

  const byComp = await c.query(byCompSql, [mvp]);
  console.log("\n--- BY COMPETITION (MVP only) ---");
  console.table(byComp.rows);

  // 4) Top missing team mappings (MVP only)
  const missingTeamsSql =
    "with missing as ( " +
    "  select m.home_goalserve_team_id as goalserve_team_id " +
    "  from matches m " +
    "  left join teams t on t.goalserve_team_id = m.home_goalserve_team_id " +
    "  where m.goalserve_competition_id = any($1::text[]) " +
    "    and m.home_team_id is null " +
    "    and m.home_goalserve_team_id is not null " +
    "    and t.id is null " +
    "  union all " +
    "  select m.away_goalserve_team_id as goalserve_team_id " +
    "  from matches m " +
    "  left join teams t on t.goalserve_team_id = m.away_goalserve_team_id " +
    "  where m.goalserve_competition_id = any($1::text[]) " +
    "    and m.away_team_id is null " +
    "    and m.away_goalserve_team_id is not null " +
    "    and t.id is null " +
    ") " +
    "select goalserve_team_id, count(*)::int as occurrences " +
    "from missing " +
    "group by goalserve_team_id " +
    "order by occurrences desc, goalserve_team_id asc " +
    "limit 50";

  const missingTeams = await c.query(missingTeamsSql, [mvp]);
  console.log("\n--- TOP MISSING TEAM IDS (MVP only) ---");
  console.table(missingTeams.rows);

  // 5) Any MVP matches where goalserve_competition_id is null (should be zero)
  const nullComp = await c.query(
    "select count(*)::int as null_goalserve_competition_id " +
      "from matches where goalserve_competition_id is null"
  );
  console.log("\n--- SANITY ---");
  console.log(nullComp.rows[0]);

  await c.end();
})().catch((e) => {
  console.error("ERROR", e.message || e);
  process.exit(1);
});
