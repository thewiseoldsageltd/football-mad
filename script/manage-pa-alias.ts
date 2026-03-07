import "dotenv/config";
import { pool } from "../server/db";

type EntityType = "team" | "competition";
type Command = "add" | "update-entity" | "list-entity" | "validate";

type ArgMap = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command: Command; args: ArgMap } {
  const [commandRaw, ...rest] = argv;
  if (!commandRaw || !["add", "update-entity", "list-entity", "validate"].includes(commandRaw)) {
    throw new Error(
      "Usage: npx tsx script/manage-pa-alias.ts <add|update-entity|list-entity|validate> [--key=value] [--flag]",
    );
  }

  const args: ArgMap = {};
  for (const token of rest) {
    if (!token.startsWith("--")) continue;
    const eqIdx = token.indexOf("=");
    if (eqIdx === -1) {
      args[token.slice(2)] = true;
      continue;
    }
    const key = token.slice(2, eqIdx);
    const value = token.slice(eqIdx + 1);
    args[key] = value;
  }

  return { command: commandRaw as Command, args };
}

function getStringArg(args: ArgMap, key: string): string | undefined {
  const value = args[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requireStringArg(args: ArgMap, key: string): string {
  const value = getStringArg(args, key);
  if (!value) throw new Error(`Missing required --${key}=...`);
  return value;
}

function parseEntityType(raw: string): EntityType {
  const clean = raw.trim().toLowerCase();
  if (clean === "team" || clean === "teams") return "team";
  if (clean === "competition" || clean === "competitions") return "competition";
  throw new Error(`Unsupported --entity-type=${raw}. Supported: team, competition`);
}

function normalizePaTagName(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^tag:\s*/, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

type CanonicalEntity = {
  id: string;
  name: string;
  slug: string;
};

async function resolveCanonicalEntity(
  entityType: EntityType,
  args: ArgMap,
): Promise<CanonicalEntity> {
  const entityId = getStringArg(args, "entity-id");
  const entitySlug = getStringArg(args, "entity-slug");
  if (!entityId && !entitySlug) {
    throw new Error("Provide either --entity-id=... or --entity-slug=...");
  }

  const table = entityType === "team" ? "teams" : "competitions";
  const queryById = `SELECT id, name, slug FROM ${table} WHERE id = $1 LIMIT 1`;
  const queryBySlug = `SELECT id, name, slug FROM ${table} WHERE slug = $1 LIMIT 1`;

  const result = entityId
    ? await pool.query<CanonicalEntity>(queryById, [entityId])
    : await pool.query<CanonicalEntity>(queryBySlug, [entitySlug!]);

  if (result.rows.length === 0) {
    const needle = entityId ? `id=${entityId}` : `slug=${entitySlug}`;
    throw new Error(`No ${entityType} found for ${needle}`);
  }
  return result.rows[0];
}

async function runAdd(args: ArgMap): Promise<void> {
  const source = getStringArg(args, "source") ?? "pa_media";
  const entityType = parseEntityType(requireStringArg(args, "entity-type"));
  const canonical = await resolveCanonicalEntity(entityType, args);
  const paTagName = requireStringArg(args, "pa-tag-name");
  const paTagNameNormalized = normalizePaTagName(paTagName);

  const displayName = getStringArg(args, "display-name") ?? canonical.name;
  const publicSlug = getStringArg(args, "public-slug") ?? canonical.slug;
  const goalserveSlug = getStringArg(args, "goalserve-slug") ?? null;
  const entitySlug = getStringArg(args, "entity-slug-override") ?? canonical.slug;

  await pool.query(
    `
      INSERT INTO pa_entity_alias_map (
        source, entity_type, entity_id, entity_slug, public_slug, goalserve_slug,
        pa_tag_name, pa_tag_name_normalized, display_name
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (source, pa_tag_name_normalized, entity_type, entity_id)
      DO UPDATE SET
        entity_slug = EXCLUDED.entity_slug,
        public_slug = EXCLUDED.public_slug,
        goalserve_slug = EXCLUDED.goalserve_slug,
        pa_tag_name = EXCLUDED.pa_tag_name,
        display_name = EXCLUDED.display_name
    `,
    [
      source,
      entityType,
      canonical.id,
      entitySlug,
      publicSlug,
      goalserveSlug,
      paTagName,
      paTagNameNormalized,
      displayName,
    ],
  );

  await pool.query(
    `
      INSERT INTO pa_entity_map_raw (
        source, entity_type, entity_id, entity_slug, public_slug, goalserve_slug, pa_tag_names, display_name
      )
      SELECT $1,$2,$3,$4,$5,$6,$7,$8
      WHERE NOT EXISTS (
        SELECT 1
        FROM pa_entity_map_raw
        WHERE source = $1
          AND entity_type = $2
          AND entity_id = $3
      )
    `,
    [
      source,
      entityType,
      canonical.id,
      entitySlug,
      publicSlug,
      goalserveSlug,
      paTagName,
      displayName,
    ],
  );

  await pool.query(
    `
      UPDATE pa_entity_map_raw
      SET
        entity_slug = $4,
        public_slug = $5,
        goalserve_slug = COALESCE($6, goalserve_slug),
        display_name = $8,
        pa_tag_names = CASE
          WHEN COALESCE(pa_tag_names, '') = '' THEN $7
          WHEN position(lower($7) in lower(pa_tag_names)) > 0 THEN pa_tag_names
          ELSE pa_tag_names || ', ' || $7
        END
      WHERE source = $1
        AND entity_type = $2
        AND entity_id = $3
    `,
    [
      source,
      entityType,
      canonical.id,
      entitySlug,
      publicSlug,
      goalserveSlug,
      paTagName,
      displayName,
    ],
  );

  console.log(
    `[manage-pa-alias:add] source=${source} entityType=${entityType} entityId=${canonical.id} paTag="${paTagName}" normalized="${paTagNameNormalized}" displayName="${displayName}" publicSlug="${publicSlug}"`,
  );
}

async function runUpdateEntity(args: ArgMap): Promise<void> {
  const source = getStringArg(args, "source") ?? "pa_media";
  const entityType = parseEntityType(requireStringArg(args, "entity-type"));
  const canonical = await resolveCanonicalEntity(entityType, args);
  const displayName = getStringArg(args, "display-name");
  const publicSlug = getStringArg(args, "public-slug");
  const goalserveSlug = getStringArg(args, "goalserve-slug");
  const entitySlug = getStringArg(args, "entity-slug-override") ?? canonical.slug;

  if (!displayName && !publicSlug && !goalserveSlug) {
    throw new Error("Provide at least one of --display-name, --public-slug, --goalserve-slug");
  }

  await pool.query(
    `
      UPDATE pa_entity_alias_map
      SET
        entity_slug = $4,
        public_slug = COALESCE($5, public_slug),
        goalserve_slug = COALESCE($6, goalserve_slug),
        display_name = COALESCE($7, display_name)
      WHERE source = $1
        AND entity_type = $2
        AND entity_id = $3
    `,
    [
      source,
      entityType,
      canonical.id,
      entitySlug,
      publicSlug ?? null,
      goalserveSlug ?? null,
      displayName ?? null,
    ],
  );

  await pool.query(
    `
      UPDATE pa_entity_map_raw
      SET
        entity_slug = $4,
        public_slug = COALESCE($5, public_slug),
        goalserve_slug = COALESCE($6, goalserve_slug),
        display_name = COALESCE($7, display_name)
      WHERE source = $1
        AND entity_type = $2
        AND entity_id = $3
    `,
    [
      source,
      entityType,
      canonical.id,
      entitySlug,
      publicSlug ?? null,
      goalserveSlug ?? null,
      displayName ?? null,
    ],
  );

  console.log(
    `[manage-pa-alias:update-entity] source=${source} entityType=${entityType} entityId=${canonical.id} displayName=${displayName ?? "(unchanged)"} publicSlug=${publicSlug ?? "(unchanged)"} goalserveSlug=${goalserveSlug ?? "(unchanged)"}`,
  );
}

async function runListEntity(args: ArgMap): Promise<void> {
  const source = getStringArg(args, "source") ?? "pa_media";
  const entityType = parseEntityType(requireStringArg(args, "entity-type"));
  const canonical = await resolveCanonicalEntity(entityType, args);

  const aliasRows = await pool.query(
    `
      SELECT
        source, entity_type, entity_id, entity_slug, public_slug, goalserve_slug,
        display_name, pa_tag_name, pa_tag_name_normalized, created_at
      FROM pa_entity_alias_map
      WHERE source = $1 AND entity_type = $2 AND entity_id = $3
      ORDER BY pa_tag_name_normalized ASC
    `,
    [source, entityType, canonical.id],
  );

  console.log(
    `[manage-pa-alias:list-entity] source=${source} entityType=${entityType} entityId=${canonical.id} canonicalName="${canonical.name}" canonicalSlug="${canonical.slug}" aliases=${aliasRows.rows.length}`,
  );
  if (aliasRows.rows.length === 0) return;

  for (const row of aliasRows.rows) {
    console.log(
      `${row.pa_tag_name_normalized} | tag="${row.pa_tag_name}" | display="${row.display_name ?? ""}" | public_slug="${row.public_slug ?? ""}"`,
    );
  }
}

async function runValidate(args: ArgMap): Promise<void> {
  const source = getStringArg(args, "source") ?? "pa_media";
  const entityType = parseEntityType(requireStringArg(args, "entity-type"));
  const canonical = await resolveCanonicalEntity(entityType, args);

  const aliasCountRes = await pool.query<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM pa_entity_alias_map
      WHERE source = $1 AND entity_type = $2 AND entity_id = $3
    `,
    [source, entityType, canonical.id],
  );

  const aliasCount = Number(aliasCountRes.rows[0]?.count ?? "0");
  console.log(
    `[manage-pa-alias:validate] OK entityType=${entityType} entityId=${canonical.id} canonicalName="${canonical.name}" canonicalSlug="${canonical.slug}" aliasRows=${aliasCount}`,
  );
}

async function main(): Promise<void> {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (command === "add") await runAdd(args);
  else if (command === "update-entity") await runUpdateEntity(args);
  else if (command === "list-entity") await runListEntity(args);
  else await runValidate(args);
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("[manage-pa-alias] Failed:", err);
    await pool.end();
    process.exit(1);
  });
