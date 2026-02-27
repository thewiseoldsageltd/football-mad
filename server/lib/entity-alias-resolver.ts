import { db } from "../db";
import { entityAliases } from "@shared/schema";
import { eq } from "drizzle-orm";

export function normalizeEntityAlias(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const ENTITY_PRIORITY: Record<string, number> = {
  competition: 0,
  team: 1,
  player: 2,
  manager: 3,
};

export async function resolveEntityFromTag(tag: string): Promise<{ entityType: string; entityId: string } | null> {
  const clean = normalizeEntityAlias(tag);
  if (!clean) return null;

  const matches = await db
    .select({
      entityType: entityAliases.entityType,
      entityId: entityAliases.entityId,
    })
    .from(entityAliases)
    .where(eq(entityAliases.alias, clean))
    .limit(10);

  if (!matches.length) return null;
  matches.sort((a, b) => (ENTITY_PRIORITY[a.entityType] ?? 999) - (ENTITY_PRIORITY[b.entityType] ?? 999));
  const match = matches[0];

  return {
    entityType: match.entityType,
    entityId: match.entityId,
  };
}
