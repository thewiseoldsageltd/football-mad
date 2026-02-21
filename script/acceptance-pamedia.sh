#!/usr/bin/env bash
# PA Media ingest acceptance checks. Set PAMEDIA_INGEST_SECRET and (for DB) DATABASE_URL.
# Usage: ./script/acceptance-pamedia.sh [base_url]
# Example: ./script/acceptance-pamedia.sh https://football-mad-staging.onrender.com

set -e
BASE_URL="${1:-https://football-mad-staging.onrender.com}"
SECRET="${PAMEDIA_INGEST_SECRET:?Set PAMEDIA_INGEST_SECRET}"

echo "=== 1) Trigger ingest ==="
RESP=$(curl -sS -X POST "$BASE_URL/api/jobs/ingest-pamedia" -H "x-sync-secret: $SECRET")
echo "$RESP" | head -c 500
echo ""
PROCESSED=$(echo "$RESP" | grep -o '"processed":[0-9]*' | cut -d: -f2)
echo "Processed: $PROCESSED"
if [ -n "$PROCESSED" ] && [ "$PROCESSED" -gt 0 ]; then
  echo "PASS: processed > 0"
else
  echo "CHECK: processed may be 0 or ingest failed"
fi

echo ""
echo "=== 2) DB: article counts by source (run if DATABASE_URL set) ==="
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "select source, count(*) from articles group by source order by count(*) desc;" 2>/dev/null || echo "psql not run (install or set DATABASE_URL)"
else
  echo "Set DATABASE_URL to run: psql \"\$DATABASE_URL\" -c \"select source, count(*) from articles group by source;\""
fi

echo ""
echo "=== 3) DB: latest pa_media cover_image (run if DATABASE_URL set) ==="
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -c "select slug, left(cover_image, 60) as cover_image, hero_image_credit from articles where source='pa_media' order by published_at desc limit 3;" 2>/dev/null || true
else
  echo "Set DATABASE_URL to run: psql ... -c \"select slug, cover_image, hero_image_credit from articles where source='pa_media' order by published_at desc limit 3;\""
fi

echo ""
echo "=== 4) DB: content should contain img.footballmad.co.uk ==="
if [ -n "$DATABASE_URL" ]; then
  psql "$DATABASE_URL" -t -c "select substring(content from 1 for 600) from articles where source='pa_media' order by published_at desc limit 1;" 2>/dev/null | grep -o 'img.footballmad.co.uk' | head -1 && echo "PASS: found our domain in content" || echo "CHECK: no img.footballmad.co.uk in first 600 chars"
else
  echo "Set DATABASE_URL to run substring(content) check"
fi
