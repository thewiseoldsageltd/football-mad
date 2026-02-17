#!/usr/bin/env bash
set -eo pipefail

LOG="squads-all.$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "== Using log: $LOG =="
echo

echo "== 1) Check env =="
node -e 'require("dotenv").config(); console.log({ hasDatabaseUrl: !!process.env.DATABASE_URL, hasGoalserveFeedKey: !!process.env.GOALSERVE_FEED_KEY });'
echo

echo "== 2) Discover Goalserve competition id column + league IDs =="
LEAGUE_IDS=$(node - <<'NODE'
require("dotenv").config();
const { Client } = require("pg");

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Detect correct column name
  const probes = [
    { name: "goalserve_competition_id", sql: "select distinct goalserve_competition_id as gid from competitions where goalserve_competition_id is not null and goalserve_competition_id <> '' order by 1" },
    { name: "goalserveCompetitionId", sql: "select distinct \"goalserveCompetitionId\" as gid from competitions where \"goalserveCompetitionId\" is not null and \"goalserveCompetitionId\" <> '' order by 1" },
  ];

  let gids = null;
  let col = null;

  for (const p of probes) {
    try {
      const r = await c.query(p.sql);
      gids = r.rows.map(x => String(x.gid)).filter(Boolean);
      col = p.name;
      break;
    } catch (e) {}
  }

  if (!gids || gids.length === 0) {
    console.log("NO_GIDS");
    await c.end();
    return;
  }

  console.log(`COL=${col}`);
  console.log(`IDS=${gids.join(" ")}`);
  await c.end();
})().catch(e => { console.error(e); process.exit(1); });
NODE
)

echo "$LEAGUE_IDS"
echo

if echo "$LEAGUE_IDS" | grep -q "NO_GIDS"; then
  echo "❌ No league IDs found on competitions table."
  echo "   Run this and paste output:"
  echo "   node -e 'require(\"dotenv\").config(); const {Client}=require(\"pg\"); (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const r=await c.query(\"select column_name from information_schema.columns where table_schema=\\\"puic\\\" and table_name=\\\"competitions\\\" order by ordinal_position\"); console.log(r.rows.map(x=>x.column_name)); await c.end(); })()'"
  exit 1
fi

IDS=$(echo "$LEAGUE_IDS" | sed -n 's/^IDS=//p')
if [[ -z "${IDS:-}" ]]; then
  echo "❌ Could not parse IDS="
  exit 1
fi

echo "== 3) Run squads ingest for each leagueId =="
FAILS=0
for lid in $IDS; do
  echo
  echo "=============================="
  echo "leagueId=$lid"
  echo "=============================="
  if npm run ingest:squads -- --leagueId="$lid"; then
    echo "✅ leagueId=$lid OK"
  else
    echo "⚠️ leagueId=$lid FAILED (continuing)"
    FAILS=$((FAILS+1))
  fi
done

echo
echo "== 4) Final counts =="
node -e 'require("dotenv").config(); const {Client}=require("pg"); (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const q=async(t)=>{const r=await c.query(`select count(*)::int as cnt from ${t}`); console.log(t, r.rows[0].cnt)}; await q("players"); await q("managers"); await q("player_team_membe; await q("team_managers"); await q("squads_snapshots"); await c.end(); })().catch(e=>{console.error(e); process.exit(1);})'

echo
echo "✅ Done. Fails=$FAILS"
