import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { and, eq } from "drizzle-orm";
import { db } from "../server/db";
import { competitions, entityAliases, managers, mvpCompetitions, players, teams } from "../shared/schema";
import { normalizeEntityAlias } from "../server/lib/entity-alias-resolver";

type AliasItem = { slug: string; aliases: string[] };
type AliasConfig = { teams: AliasItem[]; competitions: AliasItem[]; players?: AliasItem[]; managers?: AliasItem[] };

type EntityType = "competition" | "team" | "player" | "manager";

function normalizeAlias(value: string): string {
  return normalizeEntityAlias(value);
}

async function upsertAlias(entityType: EntityType, entityId: string, alias: string): Promise<boolean> {
  const normalized = normalizeAlias(alias);
  if (!normalized) return false;

  const existing = await db
    .select({ id: entityAliases.id })
    .from(entityAliases)
    .where(
      and(
        eq(entityAliases.entityType, entityType),
        eq(entityAliases.entityId, entityId),
        eq(entityAliases.alias, normalized),
      ),
    )
    .limit(1);
  if (existing.length > 0) return false;

  await db.insert(entityAliases).values({
    entityType,
    entityId,
    alias: normalized,
    isPrimary: false,
  });
  return true;
}

async function readConfig(): Promise<AliasConfig> {
  const filePath = path.resolve(process.cwd(), "script/data/entity-aliases-mvp.json");
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as AliasConfig;
}

async function main() {
  const config = await readConfig();

  const insertedByType: Record<EntityType, number> = {
    competition: 0,
    team: 0,
    player: 0,
    manager: 0,
  };
  let skippedMissing = 0;

  const compBySlug = new Map(
    (await db.select({ id: competitions.id, slug: competitions.slug }).from(competitions)).map((c) => [c.slug, c]),
  );
  const teamBySlug = new Map(
    (await db.select({ id: teams.id, slug: teams.slug }).from(teams)).map((t) => [t.slug, t]),
  );
  const playerBySlug = new Map(
    (await db.select({ id: players.id, slug: players.slug }).from(players)).map((p) => [p.slug, p]),
  );
  const managerBySlug = new Map(
    (await db.select({ id: managers.id, slug: managers.slug }).from(managers)).map((m) => [m.slug, m]),
  );

  for (const item of config.competitions ?? []) {
    const comp = compBySlug.get(item.slug);
    if (!comp) {
      console.warn(`[seed-entity-aliases-mvp] competition slug not found: ${item.slug}`);
      skippedMissing += 1;
      continue;
    }
    for (const alias of item.aliases ?? []) {
      if (await upsertAlias("competition", comp.id, alias)) insertedByType.competition += 1;
    }
  }

  for (const item of config.teams ?? []) {
    const team = teamBySlug.get(item.slug);
    if (!team) {
      console.warn(`[seed-entity-aliases-mvp] team slug not found: ${item.slug}`);
      skippedMissing += 1;
      continue;
    }
    for (const alias of item.aliases ?? []) {
      if (await upsertAlias("team", team.id, alias)) insertedByType.team += 1;
    }
  }

  for (const item of config.players ?? []) {
    const player = playerBySlug.get(item.slug);
    if (!player) {
      console.warn(`[seed-entity-aliases-mvp] player slug not found: ${item.slug}`);
      skippedMissing += 1;
      continue;
    }
    for (const alias of item.aliases ?? []) {
      if (await upsertAlias("player", player.id, alias)) insertedByType.player += 1;
    }
  }

  for (const item of config.managers ?? []) {
    const manager = managerBySlug.get(item.slug);
    if (!manager) {
      console.warn(`[seed-entity-aliases-mvp] manager slug not found: ${item.slug}`);
      skippedMissing += 1;
      continue;
    }
    for (const alias of item.aliases ?? []) {
      if (await upsertAlias("manager", manager.id, alias)) insertedByType.manager += 1;
    }
  }

  // Guarantee canonical aliases for all enabled MVP competitions, even if missing in JSON.
  const mvpRows = await db
    .select({
      competitionId: mvpCompetitions.competitionId,
      name: competitions.name,
      slug: competitions.slug,
    })
    .from(mvpCompetitions)
    .innerJoin(competitions, eq(mvpCompetitions.competitionId, competitions.id))
    .where(eq(mvpCompetitions.enabled, true));

  for (const row of mvpRows) {
    const canonicalAliases = [row.name, row.slug.replace(/-/g, " ")];
    for (const alias of canonicalAliases) {
      if (await upsertAlias("competition", row.competitionId, alias)) insertedByType.competition += 1;
    }
  }

  console.log(
    `[seed-entity-aliases-mvp] inserted competition=${insertedByType.competition} team=${insertedByType.team} player=${insertedByType.player} manager=${insertedByType.manager} missingRefs=${skippedMissing}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-entity-aliases-mvp] Failed:", err);
    process.exit(1);
  });
