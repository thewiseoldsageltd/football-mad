import { db } from "../db";
import { entityAliases } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function resolveEntityFromTag(tag: string): Promise<{ entityType: string; entityId: string } | null> {
  const clean = tag.trim().toLowerCase();
  if (!clean) return null;

  const match = await db
    .select({
      entityType: entityAliases.entityType,
      entityId: entityAliases.entityId,
    })
    .from(entityAliases)
    .where(eq(entityAliases.alias, clean))
    .limit(1);

  if (!match.length) return null;

  return {
    entityType: match[0].entityType,
    entityId: match[0].entityId,
  };
}
