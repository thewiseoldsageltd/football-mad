import { and, eq, inArray, sql as drizzleSql } from "drizzle-orm";
import { db } from "../db";
import { competitions, paEntityAliasMap, teams } from "@shared/schema";
import { ARTICLE_SOURCE_PA_MEDIA } from "./sources";

export async function resolveCanonicalTeamPublicSlug(requestSlug: string): Promise<string | null> {
  const [teamByInternalSlug] = await db
    .select({ id: teams.id, slug: teams.slug })
    .from(teams)
    .where(eq(teams.slug, requestSlug))
    .limit(1);

  if (teamByInternalSlug) {
    const [alias] = await db
      .select({ publicSlug: paEntityAliasMap.publicSlug })
      .from(paEntityAliasMap)
      .where(
        and(
          eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
          inArray(paEntityAliasMap.entityType, ["team", "teams"]),
          eq(paEntityAliasMap.entityId, teamByInternalSlug.id),
          drizzleSql`${paEntityAliasMap.publicSlug} IS NOT NULL AND trim(${paEntityAliasMap.publicSlug}) <> ''`,
        ),
      )
      .limit(1);

    const canonicalSlug = alias?.publicSlug ?? teamByInternalSlug.slug;
    return canonicalSlug || null;
  }

  const aliasMatches = await db
    .select({ entityId: paEntityAliasMap.entityId })
    .from(paEntityAliasMap)
    .where(
      and(
        eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
        inArray(paEntityAliasMap.entityType, ["team", "teams"]),
        eq(paEntityAliasMap.publicSlug, requestSlug),
      ),
    )
    .limit(2);

  const uniqueEntityIds = Array.from(new Set(aliasMatches.map((row) => row.entityId)));
  if (uniqueEntityIds.length === 1) return requestSlug;
  return null;
}

export async function resolveCanonicalCompetitionSlug(requestSlug: string): Promise<string | null> {
  const [competitionByCanonicalSlug] = await db
    .select({ canonicalSlug: competitions.canonicalSlug, slug: competitions.slug })
    .from(competitions)
    .where(eq(competitions.canonicalSlug, requestSlug))
    .limit(1);
  if (competitionByCanonicalSlug) {
    return competitionByCanonicalSlug.canonicalSlug || competitionByCanonicalSlug.slug || requestSlug;
  }

  const [competitionByAliasPublicSlug] = await db
    .select({
      canonicalSlug: competitions.canonicalSlug,
      slug: competitions.slug,
    })
    .from(paEntityAliasMap)
    .innerJoin(competitions, eq(paEntityAliasMap.entityId, competitions.id))
    .where(
      and(
        eq(paEntityAliasMap.source, ARTICLE_SOURCE_PA_MEDIA),
        inArray(paEntityAliasMap.entityType, ["competition", "competitions"]),
        eq(paEntityAliasMap.publicSlug, requestSlug),
      ),
    )
    .limit(1);
  if (competitionByAliasPublicSlug) {
    return competitionByAliasPublicSlug.canonicalSlug || requestSlug;
  }

  const [competitionByInternalSlug] = await db
    .select({ canonicalSlug: competitions.canonicalSlug, slug: competitions.slug })
    .from(competitions)
    .where(eq(competitions.slug, requestSlug))
    .limit(1);
  if (competitionByInternalSlug) {
    return competitionByInternalSlug.canonicalSlug || competitionByInternalSlug.slug || requestSlug;
  }

  return null;
}
