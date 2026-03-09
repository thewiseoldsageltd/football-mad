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

type CandidateBuildResult = {
  candidates: Candidate[];
  excludedAmbiguous: number;
  invalidOrMissingTarget: number;
  invalidDetails?: string[];
};

type CandidateClassification = {
  attempted: number;
  wouldInsert: Candidate[];
  alreadyExists: Candidate[];
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

async function fetchMvpPlayerCandidates(): Promise<CandidateBuildResult> {
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
  let excludedAmbiguous = 0;
  for (const row of result.rows) {
    const paTagNameNormalized = normalizePaTagName(row.name);
    if (EXCLUDED_AMBIGUOUS_NORMALIZED.has(paTagNameNormalized)) {
      excludedAmbiguous += 1;
      continue;
    }
    out.push({
      entityType: "player",
      entityId: row.id,
      entitySlug: row.slug,
      displayName: row.name,
      paTagName: row.name,
      paTagNameNormalized,
    });
  }
  return {
    candidates: out,
    excludedAmbiguous,
    invalidOrMissingTarget: 0,
  };
}

async function fetchMvpManagerCandidates(): Promise<CandidateBuildResult> {
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
  let excludedAmbiguous = 0;
  for (const row of result.rows) {
    const paTagNameNormalized = normalizePaTagName(row.name);
    if (EXCLUDED_AMBIGUOUS_NORMALIZED.has(paTagNameNormalized)) {
      excludedAmbiguous += 1;
      continue;
    }
    out.push({
      entityType: "manager",
      entityId: row.id,
      entitySlug: row.slug,
      displayName: row.name,
      paTagName: row.name,
      paTagNameNormalized,
    });
  }
  return {
    candidates: out,
    excludedAmbiguous,
    invalidOrMissingTarget: 0,
  };
}

async function fetchCompetitionAliasCandidates(): Promise<CandidateBuildResult> {
  const out: Candidate[] = [];
  const invalidDetails: string[] = [];
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
      invalidDetails.push(
        `Could not resolve competition for seed "${seed.paTagName}" using slugs: ${seed.slugCandidates.join(", ")}`,
      );
      continue;
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
  return {
    candidates: out,
    excludedAmbiguous: 0,
    invalidOrMissingTarget: invalidDetails.length,
    invalidDetails,
  };
}

function dedupeCandidates(candidates: Candidate[]): {
  deduped: Candidate[];
  droppedDuplicates: number;
} {
  const seen = new Set<string>();
  const deduped: Candidate[] = [];
  let droppedDuplicates = 0;
  for (const c of candidates) {
    const key = `${c.entityType}|${c.entityId}|${c.paTagNameNormalized}`;
    if (seen.has(key)) {
      droppedDuplicates += 1;
      continue;
    }
    seen.add(key);
    deduped.push(c);
  }
  return { deduped, droppedDuplicates };
}

async function classifyCandidatesByExisting(candidates: Candidate[]): Promise<CandidateClassification> {
  if (candidates.length === 0) {
    return { attempted: 0, wouldInsert: [], alreadyExists: [] };
  }

  const res = await pool.query<{ ord: string; already_exists: boolean }>(
    `
      WITH input_rows AS (
        SELECT
          x.entity_type::text AS entity_type,
          x.entity_id::text AS entity_id,
          x.pa_tag_name_normalized::text AS pa_tag_name_normalized,
          x.ord::int AS ord
        FROM unnest(
          $1::text[],
          $2::text[],
          $3::text[]
        ) WITH ORDINALITY AS x(entity_type, entity_id, pa_tag_name_normalized, ord)
      )
      SELECT
        i.ord::text AS ord,
        EXISTS (
          SELECT 1
          FROM pa_entity_alias_map am
          WHERE am.source = $4
            AND am.entity_type = i.entity_type
            AND am.entity_id = i.entity_id
            AND am.pa_tag_name_normalized = i.pa_tag_name_normalized
        ) AS already_exists
      FROM input_rows i
      ORDER BY i.ord ASC
    `,
    [
      candidates.map((c) => c.entityType),
      candidates.map((c) => c.entityId),
      candidates.map((c) => c.paTagNameNormalized),
      SOURCE,
    ],
  );

  const alreadyByOrd = new Map<number, boolean>();
  for (const row of res.rows) {
    alreadyByOrd.set(Number(row.ord), row.already_exists);
  }

  const alreadyExists: Candidate[] = [];
  const wouldInsert: Candidate[] = [];
  for (let i = 0; i < candidates.length; i += 1) {
    const ord = i + 1;
    if (alreadyByOrd.get(ord)) alreadyExists.push(candidates[i]);
    else wouldInsert.push(candidates[i]);
  }

  return {
    attempted: candidates.length,
    wouldInsert,
    alreadyExists,
  };
}

async function insertAliasCandidates(candidates: Candidate[]): Promise<{
  attempted: number;
  inserted: number;
}> {
  if (candidates.length === 0) return { attempted: 0, inserted: 0 };

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

  const [playerBuild, managerBuild, competitionBuild] = await Promise.all([
    fetchMvpPlayerCandidates(),
    fetchMvpManagerCandidates(),
    fetchCompetitionAliasCandidates(),
  ]);

  const playerDeduped = dedupeCandidates(playerBuild.candidates);
  const managerDeduped = dedupeCandidates(managerBuild.candidates);
  const competitionDeduped = dedupeCandidates(competitionBuild.candidates);

  const [playerClassification, managerClassification, competitionClassification] = await Promise.all([
    classifyCandidatesByExisting(playerDeduped.deduped),
    classifyCandidatesByExisting(managerDeduped.deduped),
    classifyCandidatesByExisting(competitionDeduped.deduped),
  ]);

  if (!dryRun && competitionBuild.invalidOrMissingTarget > 0) {
    throw new Error(
      `Competition alias seeds missing targets: ${competitionBuild.invalidDetails?.join(" | ") ?? "(unknown)"}`,
    );
  }

  const [playerInsert, managerInsert, competitionInsert] = dryRun
    ? [
      { attempted: playerClassification.attempted, inserted: 0 },
      { attempted: managerClassification.attempted, inserted: 0 },
      { attempted: competitionClassification.attempted, inserted: 0 },
    ]
    : await Promise.all([
      insertAliasCandidates(playerClassification.wouldInsert),
      insertAliasCandidates(managerClassification.wouldInsert),
      insertAliasCandidates(competitionClassification.wouldInsert),
    ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        excludedAmbiguousNormalized: Array.from(EXCLUDED_AMBIGUOUS_NORMALIZED),
        players: {
          attempted: playerClassification.attempted,
          wouldInsert: playerClassification.wouldInsert.length,
          alreadyExists: playerClassification.alreadyExists.length,
          excludedAmbiguous: playerBuild.excludedAmbiguous,
          invalidOrMissingTarget: playerBuild.invalidOrMissingTarget,
          droppedInBatchDuplicate: playerDeduped.droppedDuplicates,
          inserted: playerInsert.inserted,
        },
        managers: {
          attempted: managerClassification.attempted,
          wouldInsert: managerClassification.wouldInsert.length,
          alreadyExists: managerClassification.alreadyExists.length,
          excludedAmbiguous: managerBuild.excludedAmbiguous,
          invalidOrMissingTarget: managerBuild.invalidOrMissingTarget,
          droppedInBatchDuplicate: managerDeduped.droppedDuplicates,
          inserted: managerInsert.inserted,
        },
        competitions: {
          attempted: competitionClassification.attempted,
          wouldInsert: competitionClassification.wouldInsert.length,
          alreadyExists: competitionClassification.alreadyExists.length,
          excludedAmbiguous: competitionBuild.excludedAmbiguous,
          invalidOrMissingTarget: competitionBuild.invalidOrMissingTarget,
          invalidDetails: competitionBuild.invalidDetails ?? [],
          droppedInBatchDuplicate: competitionDeduped.droppedDuplicates,
          inserted: competitionInsert.inserted,
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
