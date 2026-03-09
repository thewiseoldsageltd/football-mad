import "dotenv/config";
import { pool } from "../server/db";

type Args = {
  limit: number;
};

function parseArgs(argv: string[]): Args {
  let limit = 100;
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (Number.isFinite(n) && n > 0) limit = Math.trunc(n);
    }
  }
  return { limit };
}

async function main(): Promise<void> {
  const { limit } = parseArgs(process.argv.slice(2));

  const query = `
WITH source_articles AS (
  SELECT id, source, tags
  FROM articles
  WHERE source IN ('pa_media', 'ghost')
    AND COALESCE(array_length(tags, 1), 0) > 0
),
expanded_tags AS (
  SELECT
    a.id AS article_id,
    a.source,
    t AS raw_tag
  FROM source_articles a
  CROSS JOIN LATERAL unnest(a.tags) AS t
  WHERE trim(COALESCE(t, '')) <> ''
),
normalized_tags AS (
  SELECT
    article_id,
    source,
    raw_tag,
    regexp_replace(
      replace(
        regexp_replace(lower(trim(raw_tag)), '^tag:[[:space:]]*', ''),
        '-',
        ' '
      ),
      '[[:space:]]+',
      ' ',
      'g'
    ) AS normalized_tag
  FROM expanded_tags
),
tag_status AS (
  SELECT
    nt.article_id,
    nt.source,
    nt.raw_tag,
    nt.normalized_tag,
    EXISTS (
      SELECT 1
      FROM pa_entity_alias_map am
      WHERE am.source = 'pa_media'
        AND am.pa_tag_name_normalized = nt.normalized_tag
    ) AS mapped
  FROM normalized_tags nt
),
alias_matches AS (
  SELECT
    ts.normalized_tag,
    lower(am.entity_type) AS entity_type,
    COUNT(*)::int AS mention_hits,
    COUNT(DISTINCT ts.article_id)::int AS article_hits
  FROM tag_status ts
  JOIN pa_entity_alias_map am
    ON am.source = 'pa_media'
   AND am.pa_tag_name_normalized = ts.normalized_tag
  GROUP BY ts.normalized_tag, lower(am.entity_type)
),
rollup AS (
  SELECT
    normalized_tag,
    COUNT(DISTINCT article_id)::int AS article_count,
    COUNT(*)::int AS tag_mentions,
    BOOL_OR(mapped) AS mapped,
    MIN(raw_tag) AS example_raw_tag
  FROM tag_status
  GROUP BY normalized_tag
)
SELECT json_build_object(
  'totals',
  (
    SELECT json_build_object(
      'distinct_normalized_tags', COUNT(*),
      'mapped_distinct_tags', COUNT(*) FILTER (WHERE mapped),
      'unmapped_distinct_tags', COUNT(*) FILTER (WHERE NOT mapped),
      'tag_mentions_total', COALESCE(SUM(tag_mentions), 0),
      'articles_with_tags', (SELECT COUNT(DISTINCT article_id) FROM tag_status)
    )
    FROM rollup
  ),
  'matched_entity_type_split',
  (
    SELECT COALESCE(json_agg(x), '[]'::json)
    FROM (
      SELECT
        entity_type,
        COUNT(DISTINCT normalized_tag)::int AS distinct_tags,
        SUM(article_hits)::int AS article_hits,
        SUM(mention_hits)::int AS mention_hits
      FROM alias_matches
      GROUP BY entity_type
      ORDER BY mention_hits DESC, entity_type ASC
    ) x
  ),
  'top_mapped_tags',
  (
    SELECT COALESCE(json_agg(x), '[]'::json)
    FROM (
      SELECT normalized_tag, article_count, tag_mentions, example_raw_tag
      FROM rollup
      WHERE mapped = true
      ORDER BY article_count DESC, tag_mentions DESC, normalized_tag ASC
      LIMIT $1
    ) x
  ),
  'top_unmapped_tags',
  (
    SELECT COALESCE(json_agg(x), '[]'::json)
    FROM (
      SELECT normalized_tag, article_count, tag_mentions, example_raw_tag
      FROM rollup
      WHERE mapped = false
      ORDER BY article_count DESC, tag_mentions DESC, normalized_tag ASC
      LIMIT $1
    ) x
  )
) AS result
`;

  const res = await pool.query<{ result: unknown }>(query, [limit]);
  console.log(JSON.stringify(res.rows[0]?.result ?? {}, null, 2));
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[report-pa-alias-coverage] Failed:", err);
    await pool.end();
    process.exit(1);
  });
