import "dotenv/config";
import { pool } from "../server/db";

type EntityType = "player" | "manager" | "competition";

type Candidate = {
  entityType: EntityType;
  entityId: string;
  entitySlug: string;
  displayName: string;
  paTagName: string;
  paTagNameNormalized: string;
};

type CompetitionAliasSeed = {
  paTagName: string;
  slugCandidates: string[];
};

const SOURCE = "pa_media";
const EXCLUDED_AMBIGUOUS_NORMALIZED = new Set([
  "gonzalo garcia",
  "niko kovac",
  "scott brown",
]);

const COMPETITION_ALIAS_SEEDS: CompetitionAliasSeed[] = [
  { paTagName: "SPFL Premiership", slugCandidates: ["scottish-premiership"] },
  { paTagName: "SPFL Championship", slugCandidates: ["scottish-championship"] },
  { paTagName: "SPFL League One", slugCandidates: ["scottish-league-one"] },
  { paTagName: "SPFL League Two", slugCandidates: ["scottish-league-two"] },
  { paTagName: "Carabao Cup", slugCandidates: ["efl-cup"] },
];

function normalizePaTagName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^tag:\s*/, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

function parseArgs(argv: string[]): { dryRun: boolean } {
  const dryRun = argv.includes("--dry-run");
  return { dryRun };
}

async function fetchMvpPlayerCandidates(): Promise<Candidate[]> {
  const result = await pool.query<{
    id: string;
    name: string;
    slug: string;
  }>(`
    WITH mvp_teams AS (
      SELECT DISTINCT ctm.team_id
      FROM competition_team_memberships ctm
      JOIN competitions c ON c.id = ctm.competition_id
      WHERE c.is_priority = true
        AND ctm.is_current = true
    ),
    latest_player_membership AS (
      SELECT DISTINCT ON (ptm.player_id)
        ptm.player_id,
        ptm.team_id
      FROM player_team_memberships ptm
      WHERE ptm.end_date IS NULL OR ptm.end_date > now()
      ORDER BY ptm.player_id, ptm.start_date DESC NULLS LAST, ptm.created_at DESC, ptm.id DESC
    )
    SELECT
      p.id,
      p.name,
      p.slug
    FROM players p
    LEFT JOIN latest_player_membership lpm ON lpm.player_id = p.id
    WHERE COALESCE(lpm.team_id, p.team_id) IN (SELECT team_id FROM mvp_teams)
      AND p.name IS NOT NULL
      AND trim(p.name) <> ''
      AND p.slug IS NOT NULL
      AND trim(p.slug) <> ''
    ORDER BY p.name ASC
  `);

  const out: Candidate[] = [];
  for (const row of result.rows) {
    const paTagNameNormalized = normalizePaTagName(row.name);
    if (EXCLUDED_AMBIGUOUS_NORMALIZED.has(paTagNameNormalized)) continue;
    out.push({
      entityType: "player",
      entityId: row.id,
      entitySlug: row.slug,
      displayName: row.name,
      paTagName: row.name,
      paTagNameNormalized,
    });
  }
  return out;
}

async function fetchMvpManagerCandidates(): Promise<Candidate[]> {
  const result = await pool.query<{
    id: string;
    name: string;
    slug: string;
  }>(`
    WITH mvp_teams AS (
      SELECT DISTINCT ctm.team_id
      FROM competition_team_memberships ctm
      JOIN competitions c ON c.id = ctm.competition_id
      WHERE c.is_priority = true
        AND ctm.is_current = true
    )
    SELECT DISTINCT
      m.id,
      m.name,
      m.slug
    FROM managers m
    LEFT JOIN team_managers tm ON tm.manager_id = m.id
    WHERE (
      tm.team_id IN (SELECT team_id FROM mvp_teams)
      OR m.current_team_id IN (SELECT team_id FROM mvp_teams)
    )
      AND m.name IS NOT NULL
      AND trim(m.name) <> ''
      AND m.slug IS NOT NULL
      AND trim(m.slug) <> ''
    ORDER BY m.name ASC
  `);

  const out: Candidate[] = [];
  for (const row of result.rows) {
    const paTagNameNormalized = normalizePaTagName(row.name);
    if (EXCLUDED_AMBIGUOUS_NORMALIZED.has(paTagNameNormalized)) continue;
    out.push({
      entityType: "manager",
      entityId: row.id,
      entitySlug: row.slug,
      displayName: row.name,
      paTagName: row.name,
      paTagNameNormalized,
    });
  }
  return out;
}

async function fetchCompetitionAliasCandidates(): Promise<Candidate[]> {
  const out: Candidate[] = [];
  for (const seed of COMPETITION_ALIAS_SEEDS) {
    const rowRes = await pool.query<{
      id: string;
      name: string;
      slug: string;
      canonical_slug: string | null;
    }>(
      `
      SELECT id, name, slug, canonical_slug
      FROM competitions
      WHERE slug = ANY($1::text[]) OR canonical_slug = ANY($1::text[])
      ORDER BY
        CASE
          WHEN canonical_slug = ANY($1::text[]) THEN 0
          ELSE 1
        END,
        name ASC
      LIMIT 1
      `,
      [seed.slugCandidates],
    );

    const row = rowRes.rows[0];
    if (!row) {
      throw new Error(
        `Could not resolve competition for seed "${seed.paTagName}" using slugs: ${seed.slugCandidates.join(", ")}`,
      );
    }

    out.push({
      entityType: "competition",
      entityId: row.id,
      entitySlug: row.slug,
      displayName: row.name,
      paTagName: seed.paTagName,
      paTagNameNormalized: normalizePaTagName(seed.paTagName),
    });
  }
  return out;
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const c of candidates) {
    const key = `${c.entityType}|${c.entityId}|${c.paTagNameNormalized}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

async function insertAliasCandidates(candidates: Candidate[], dryRun: boolean): Promise<{
  attempted: number;
  inserted: number;
}> {
  if (candidates.length === 0) return { attempted: 0, inserted: 0 };
  if (dryRun) return { attempted: candidates.length, inserted: 0 };

  const res = await pool.query<{ inserted: string }>(
    `
      WITH input_rows AS (
        SELECT
          x.entity_type::text AS entity_type,
          x.entity_id::text AS entity_id,
          x.entity_slug::text AS entity_slug,
          x.public_slug::text AS public_slug,
          x.goalserve_slug::text AS goalserve_slug,
          x.pa_tag_name::text AS pa_tag_name,
          x.pa_tag_name_normalized::text AS pa_tag_name_normalized,
          x.display_name::text AS display_name
        FROM unnest(
          $1::text[],
          $2::text[],
          $3::text[],
          $4::text[],
          $5::text[],
          $6::text[],
          $7::text[],
          $8::text[]
        ) AS x(
          entity_type,
          entity_id,
          entity_slug,
          public_slug,
          goalserve_slug,
          pa_tag_name,
          pa_tag_name_normalized,
          display_name
        )
      ),
      inserted_rows AS (
        INSERT INTO pa_entity_alias_map (
          source,
          entity_type,
          entity_id,
          entity_slug,
          public_slug,
          goalserve_slug,
          pa_tag_name,
          pa_tag_name_normalized,
          display_name
        )
        SELECT
          $9::text AS source,
          i.entity_type,
          i.entity_id,
          i.entity_slug,
          i.public_slug,
          i.goalserve_slug,
          i.pa_tag_name,
          i.pa_tag_name_normalized,
          i.display_name
        FROM input_rows i
        ON CONFLICT (source, pa_tag_name_normalized, entity_type, entity_id)
        DO NOTHING
        RETURNING 1
      )
      SELECT COUNT(*)::text AS inserted
      FROM inserted_rows
    `,
    [
      candidates.map((c) => c.entityType),
      candidates.map((c) => c.entityId),
      candidates.map((c) => c.entitySlug),
      candidates.map((c) => c.entitySlug),
      candidates.map(() => null),
      candidates.map((c) => c.paTagName),
      candidates.map((c) => c.paTagNameNormalized),
      candidates.map((c) => c.displayName),
      SOURCE,
    ],
  );

  return {
    attempted: candidates.length,
    inserted: Number(res.rows[0]?.inserted ?? "0"),
  };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2));

  const [playerCandidatesRaw, managerCandidatesRaw, competitionCandidatesRaw] = await Promise.all([
    fetchMvpPlayerCandidates(),
    fetchMvpManagerCandidates(),
    fetchCompetitionAliasCandidates(),
  ]);

  const playerCandidates = dedupeCandidates(playerCandidatesRaw);
  const managerCandidates = dedupeCandidates(managerCandidatesRaw);
  const competitionCandidates = dedupeCandidates(competitionCandidatesRaw);

  const [playerInsert, managerInsert, competitionInsert] = await Promise.all([
    insertAliasCandidates(playerCandidates, dryRun),
    insertAliasCandidates(managerCandidates, dryRun),
    insertAliasCandidates(competitionCandidates, dryRun),
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        excludedAmbiguousNormalized: Array.from(EXCLUDED_AMBIGUOUS_NORMALIZED),
        players: {
          attempted: playerInsert.attempted,
          inserted: playerInsert.inserted,
          skippedExistingOrDuplicate: playerInsert.attempted - playerInsert.inserted,
        },
        managers: {
          attempted: managerInsert.attempted,
          inserted: managerInsert.inserted,
          skippedExistingOrDuplicate: managerInsert.attempted - managerInsert.inserted,
        },
        competitions: {
          attempted: competitionInsert.attempted,
          inserted: competitionInsert.inserted,
          skippedExistingOrDuplicate: competitionInsert.attempted - competitionInsert.inserted,
          seeds: COMPETITION_ALIAS_SEEDS.map((s) => s.paTagName),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[generate-mvp-entity-aliases] Failed:", err);
    await pool.end();
    process.exit(1);
  });
