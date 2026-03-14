import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { competitions, paEntityAliasMap, teams } from "@shared/schema";
import { ARTICLE_SOURCE_PA_MEDIA } from "./sources";

export type TeamPresentation = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
};

export type CompetitionPresentation = {
  id: string;
  name: string;
  slug: string;
};

export function resolveCompetitionDisplayName(
  canonicalName: string | null | undefined,
  fallbackName: string,
): string {
  const canonical = canonicalName?.trim();
  if (canonical) return canonical;
  return fallbackName;
}

type PresentationSourceContext = {
  source?: string | null;
};

function asUniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && id.length > 0)));
}

export class EntityPresentationResolver {
  private readonly teamCache = new Map<string, TeamPresentation>();
  private readonly competitionCache = new Map<string, CompetitionPresentation>();

  private cacheKey(id: string, source?: string | null): string {
    const isPa = source === ARTICLE_SOURCE_PA_MEDIA;
    return `${isPa ? "pa" : "default"}:${id}`;
  }

  async resolveTeams(
    ids: string[],
    context: PresentationSourceContext = {},
  ): Promise<Map<string, TeamPresentation>> {
    const uniqueIds = asUniqueIds(ids);
    const keyById = new Map<string, string>();
    const missingIds: string[] = [];

    for (const id of uniqueIds) {
      const key = this.cacheKey(id, context.source);
      keyById.set(id, key);
      if (!this.teamCache.has(key)) missingIds.push(id);
    }

    if (missingIds.length > 0) {
      const canonicalRows = await db
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          logoUrl: teams.logoUrl,
        })
        .from(teams)
        .where(inArray(teams.id, missingIds));

      const canonicalMap = new Map(canonicalRows.map((row) => [row.id, row]));
      let overrideMap = new Map<string, { name?: string; slug?: string }>();

      if (context.source === ARTICLE_SOURCE_PA_MEDIA) {
        const overrideRows = await db
          .select({
            entityId: paEntityAliasMap.entityId,
            displayName: paEntityAliasMap.displayName,
            publicSlug: paEntityAliasMap.publicSlug,
          })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["team", "teams"]),
              inArray(paEntityAliasMap.entityId, missingIds),
            ),
          );

        overrideMap = new Map();
        for (const row of overrideRows) {
          if (!overrideMap.has(row.entityId)) {
            overrideMap.set(row.entityId, {
              name: row.displayName ?? undefined,
              slug: row.publicSlug ?? undefined,
            });
          }
        }
      }

      // Team public slugs are canonical for routing wherever available.
      if (overrideMap.size === 0) {
        const overrideRows = await db
          .select({
            entityId: paEntityAliasMap.entityId,
            publicSlug: paEntityAliasMap.publicSlug,
          })
          .from(paEntityAliasMap)
          .where(
            and(
              eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
              inArray(paEntityAliasMap.entityType, ["team", "teams"]),
              inArray(paEntityAliasMap.entityId, missingIds),
              sql`trim(${paEntityAliasMap.publicSlug}) <> ''`,
            ),
          );
        for (const row of overrideRows) {
          if (!row.publicSlug) continue;
          if (!overrideMap.has(row.entityId)) {
            overrideMap.set(row.entityId, { slug: row.publicSlug });
          }
        }
      }

      for (const id of missingIds) {
        const canonical = canonicalMap.get(id);
        if (!canonical) continue;
        const override = overrideMap.get(id);
        const key = this.cacheKey(id, context.source);
        this.teamCache.set(key, {
          id,
          name: override?.name || canonical.name,
          slug: override?.slug || canonical.slug,
          logoUrl: canonical.logoUrl ?? null,
        });
      }
    }

    const result = new Map<string, TeamPresentation>();
    for (const id of uniqueIds) {
      const key = keyById.get(id);
      if (!key) continue;
      const value = this.teamCache.get(key);
      if (value) result.set(id, value);
    }
    return result;
  }

  async resolveCompetitions(
    ids: string[],
    context: PresentationSourceContext = {},
  ): Promise<Map<string, CompetitionPresentation>> {
    const uniqueIds = asUniqueIds(ids);
    const keyById = new Map<string, string>();
    const missingIds: string[] = [];

    for (const id of uniqueIds) {
      const key = this.cacheKey(id, context.source);
      keyById.set(id, key);
      if (!this.competitionCache.has(key)) missingIds.push(id);
    }

    if (missingIds.length > 0) {
      const canonicalRows = await db
        .select({
          id: competitions.id,
          name: competitions.name,
          canonicalName: sql<string | null>`nullif(trim(canonical_name), '')`,
          slug: competitions.slug,
          canonicalSlug: competitions.canonicalSlug,
        })
        .from(competitions)
        .where(inArray(competitions.id, missingIds));

      const canonicalMap = new Map(canonicalRows.map((row) => [row.id, row]));
      for (const id of missingIds) {
        const canonical = canonicalMap.get(id);
        if (!canonical) continue;
        const key = this.cacheKey(id, context.source);
        this.competitionCache.set(key, {
          id,
          name: resolveCompetitionDisplayName(canonical.canonicalName, canonical.name),
          slug: canonical.canonicalSlug || canonical.slug,
        });
      }
    }

    const result = new Map<string, CompetitionPresentation>();
    for (const id of uniqueIds) {
      const key = keyById.get(id);
      if (!key) continue;
      const value = this.competitionCache.get(key);
      if (value) result.set(id, value);
    }
    return result;
  }
}
