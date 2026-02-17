require("dotenv").config();
const fs = require("fs");
const { Client } = require("pg");

const mvp = fs.readFileSync("config/mvp-league-ids.txt", "utf8")
  .split(/\r?\n/)
  .map(s => s.trim())
  .filter(Boolean);

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const r = await c.query(
    "select league_id from squads_snapshots where league_id = any($1::text[]) group by league_id order by league_id",
    [mvp]
  );

  const have = new Set(r.rows.map(x => x.league_id));
  const missing = mvp.filter(id => !have.has(id));

  console.log("MVP_COVERAGE", { mvp_leagues: mvp.length, have: have.size, missing });

  const totals = await c.query(
    "select " +
      "(select count(*)::int from squads_snapshots where league_id = any($1::text[])) as mvp_snapshots, " +
      "(select count(*)::int from squads_snapshots) as snapshots_total, " +
      "(select count(*)::int from players) as players_total, " +
      "(select count(*)::int from managers) as managers_total, " +
      "(select count(*)::int from player_team_memberships) as memberships_total, " +
      "(select count(*)::int from team_managers) as team_managers_total",
    [mvp]
  );

  console.log("TOTALS", totals.rows[0]);

  const present = await c.query(
    "select league_id, max(as_of) as last_as_of, count(*)::int as snapshots " +
    "from squads_snapshots where league_id = any($1::text[]) " +
    "group by league_id order by league_id",
    [mvp]
  );

  console.log("MVP_SNAPSHOTS_BY_LEAGUE");
  console.table(present.rows);

  await c.end();
})().catch(e => {
  console.error("ERROR", e.message || e);
  process.exit(1);
});
