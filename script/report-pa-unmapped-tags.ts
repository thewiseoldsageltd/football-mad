import "dotenv/config";
import { pool } from "../server/db";

type Args = {
  days: number;
  limit: number;
  includeVenues: boolean;
  includeIgnored: boolean;
  includeFixtures: boolean;
};

type TagReportRow = {
  normalized_tag: string;
  article_count: string;
  tag_mentions: string;
  mapped: boolean;
  example_raw_tag: string | null;
};

function parseArgs(argv: string[]): Args {
  let days = 7;
  let limit = 200;
  let includeVenues = false;
  let includeIgnored = false;
  let includeFixtures = false;

  for (const arg of argv) {
    if (arg.startsWith("--days=")) {
      const v = Number(arg.slice("--days=".length));
      if (Number.isFinite(v) && v > 0) days = Math.trunc(v);
    } else if (arg.startsWith("--limit=")) {
      const v = Number(arg.slice("--limit=".length));
      if (Number.isFinite(v) && v > 0) limit = Math.trunc(v);
    } else if (arg === "--include-venues") {
      includeVenues = true;
    } else if (arg === "--include-ignored") {
      includeIgnored = true;
    } else if (arg === "--include-fixtures") {
      includeFixtures = true;
    }
  }

  return { days, limit, includeVenues, includeIgnored, includeFixtures };
}

function printCsvSection(title: string, rows: TagReportRow[]): void {
  console.log(`\n# ${title}`);
  console.log("normalized_tag,article_count,tag_mentions,mapped,example_raw_tag");
  for (const row of rows) {
    const safeRaw = (row.example_raw_tag ?? "").replace(/"/g, '""');
    console.log(
      `"${row.normalized_tag.replace(/"/g, '""')}",${row.article_count},${row.tag_mentions},${row.mapped},"${safeRaw}"`,
    );
  }
}

async function main(): Promise<void> {
  const { days, limit, includeVenues, includeIgnored, includeFixtures } = parseArgs(process.argv.slice(2));
  const daysInterval = `${days} days`;
  const genericIgnoreTags = [
    "football",
    "soccer",
    "sport",
    "sports",
    "competition discipline",
    "discipline",
    "club news",
    "match report",
    "match reports",
    "pa",
    "uk",
    "report",
    "quotes",
    "world",
    "update",
    "correction",
    "briefing",
    "scotland",
  ];
  const exactVenueIgnoreTags = [
    "old trafford",
    "craven cottage",
    "st james' park",
    "st james park",
    "molineux",
    "pittodrie",
  ];

  const query = `
WITH recent_articles AS (
  SELECT id, tags
  FROM articles
  WHERE source = 'pa_media'
    AND published_at >= now() - $1::interval
    AND COALESCE(array_length(tags, 1), 0) > 0
),
expanded_tags AS (
  SELECT
    ra.id AS article_id,
    tag AS raw_tag
  FROM recent_articles ra
  CROSS JOIN LATERAL unnest(ra.tags) AS tag
  WHERE trim(COALESCE(tag, '')) <> ''
),
normalized_tags AS (
  SELECT
    article_id,
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
filtered_tags AS (
  SELECT
    nt.article_id,
    nt.raw_tag,
    nt.normalized_tag
  FROM normalized_tags nt
  WHERE (
      $3::boolean
      OR nt.normalized_tag <> ALL($4::text[])
    )
    AND (
      $5::boolean
      OR (
        nt.normalized_tag NOT LIKE '%stadium%'
        AND nt.normalized_tag NOT LIKE '%arena%'
        AND nt.normalized_tag NOT LIKE '%ground%'
        AND nt.normalized_tag <> ALL($6::text[])
      )
    )
    AND (
      $7::boolean
      OR nt.normalized_tag NOT LIKE '% vs %'
    )
),
tag_status AS (
  SELECT
    ft.article_id,
    ft.raw_tag,
    ft.normalized_tag,
    EXISTS (
      SELECT 1
      FROM pa_entity_alias_map am
      WHERE am.source = 'pa_media'
        AND am.pa_tag_name_normalized = ft.normalized_tag
    ) AS mapped
  FROM filtered_tags ft
)
SELECT
  normalized_tag,
  COUNT(DISTINCT article_id)::text AS article_count,
  COUNT(*)::text AS tag_mentions,
  mapped,
  MIN(raw_tag) AS example_raw_tag
FROM tag_status
GROUP BY normalized_tag, mapped
ORDER BY COUNT(DISTINCT article_id) DESC, COUNT(*) DESC, normalized_tag ASC
LIMIT $2
`;

  const { rows } = await pool.query<TagReportRow>(query, [
    daysInterval,
    limit,
    includeIgnored,
    genericIgnoreTags,
    includeVenues,
    exactVenueIgnoreTags,
    includeFixtures,
  ]);
  const unmapped = rows.filter((row) => !row.mapped);
  const mapped = rows.filter((row) => row.mapped);

  console.log(
    `PA tag mapping report (window=${days}d, limit=${limit}) | total_rows=${rows.length} mapped=${mapped.length} unmapped=${unmapped.length}`,
  );

  printCsvSection(`UNMAPPED PA TAGS (last ${days} days)`, unmapped);
  printCsvSection(`TOP PA TAGS INCLUDING MAPPED (last ${days} days)`, rows);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[report-pa-unmapped-tags] Failed:", err);
    await pool.end();
    process.exit(1);
  });
