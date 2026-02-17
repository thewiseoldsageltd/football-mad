#!/usr/bin/env bash
set -eo pipefail

LOG="squads-mvp.$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "== Using log: $LOG =="
echo

echo "== 1) Check env =="
node -e 'require("dotenv").config(); console.log({ hasDatabaseUrl: !!process.env.DATABASE_URL, hasGoalserveFeedKey: !!process.env.GOALSERVE_FEED_KEY });'
echo

if [[ ! -f "config/mvp-league-ids.txt" ]]; then
  echo "❌ Missing config/mvp-league-ids.txt"
  exit 1
fi

echo "== 2) MVP league IDs =="
nl -ba config/mvp-league-ids.txt
echo

echo "== 3) Run squads ingest for each MVP leagueId =="
FAILS=0
while IFS= read -r lid; do
  lid="$(echo "$lid" | tr -d '[:space:]')"
  [[ -z "$lid" ]] && continue

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
done < config/mvp-league-ids.txt

echo
echo "== 4) Final counts (global) =="
node -e 'require("dotenv").config(); const {Client}=require("pg"); (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const q=async(t)=>{const r=await c.query(`select count(*)::int as cnt from ${t}`); console.log(t.padEnd(24), r.rows[0].cnt)}; await q("players"); await q("managers"); await q("player_team_memberships"); await q("team_managers"); await q("squads_snapshots"); await c.end(); })().catch(e=>{console.error(e); process.exit(1);})'
echo

echo "== 5) MVP snapshot count =="
node -e 'require("dotenv").config(); const {Client}=require("pg"); const fs=require("fs"); (async()=>{const mvp=fs.readFileSync("config/mvp-league-ids.txt","utf8").split(/\r?\n/).map(s=>s.trim()).filter(Boolean); const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const r=await c.query("select count(*)::int as cnt from squads_snapshots where league_id = any($1::text[])", [mvp]); console.log({ mvp_snapshots: r.rows[0].cnt, mvp_leagues: mvp.length }); await c.end(); })().catch(e=>{console.error(e); process.exit(1);})'
echo

echo "✅ Done. Fails=$FAILS"
