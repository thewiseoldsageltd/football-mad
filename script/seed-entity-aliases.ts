import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../server/db";
import { entityAliases, teams } from "../shared/schema";

async function upsertAlias(entityType: string, entityId: string, alias: string): Promise<boolean> {
  const normalized = alias.trim().toLowerCase();
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

async function main() {
  const [manUtd] = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(inArray(teams.slug, ["manchester-utd", "manchester-united"]))
    .limit(1);

  if (!manUtd) {
    throw new Error("Team not found for slugs 'manchester-utd' or 'manchester-united'. Seed aborted.");
  }

  const aliases = ["man utd", "manchester united", "man united"];
  let inserted = 0;

  for (const alias of aliases) {
    if (await upsertAlias("team", manUtd.id, alias)) inserted++;
  }

  console.log(`[seed-entity-aliases] Team=${manUtd.name} aliases_inserted=${inserted} total_attempted=${aliases.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[seed-entity-aliases] Failed:", err);
    process.exit(1);
  });
