#!/usr/bin/env bash
set -euo pipefail

LOG="squads-leagues.$(date +%Y%m%d-%H%M%S).log"
exec > >(tee -a "$LOG") 2>&1

echo "== Using log: $LOG =="
echo

echo "== Env check =="
node -e 'require("dotenv").config(); console.log({ hasDatabaseUrl: !!process.env.DATABASE_URL, hasGoalserveFeedKey: !!process.env.GOALSERVE_FEED_KEY });'
echo

echo "== League IDs (leagues only) =="
nl -ba config/squads-league-ids.txt
echo

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
done < config/squads-league-ids.txt

echo
echo "== Final counts (global) =="
node -e 'require("dotenv").config(); const {Client}=require("pg"); (async()=>{const c=new Client({connectionString:process.env.DATABASE_URL}); await c.connect(); const q=async(t)=>{const r=await c.query(`select count(*)::int as cnt from ${t}`); console.log(t.padEnd(24), r.rows[0].cnt)}; await q("players"); await q("managers"); await q("player_team_memberships"); await q("team_managers"); await q("squads_snapshots"); await c.end(); })().catch(e=>{console.error(e); process.exit(1);})'

echo
echo "✅ Done. Fails=$FAILS"
