import { eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import { articles, authorAliases, authors } from "@shared/schema";

export type ResolvedAuthorIdentity = {
  authorId: string;
  canonicalSlug: string;
  displayName: string;
  kind: "person" | "desk";
  /** Slug values that equal SQL slugify(articles.author_name) for rows belonging to this author. */
  matchSlugs: string[];
};

/**
 * Resolve request slug (from /authors/:slug) to a canonical author when the slug matches
 * authors.slug or author_aliases.match_slug. Used read-path only; does not mutate articles.
 */
export async function resolveAuthorIdentityForRequestSlug(requestSlug: string): Promise<ResolvedAuthorIdentity | null> {
  const slug = requestSlug.trim().toLowerCase();
  if (!slug) return null;

  const [byCanonical] = await db.select().from(authors).where(eq(authors.slug, slug)).limit(1);
  let row = byCanonical;

  if (!row) {
    const joined = await db
      .select({ author: authors })
      .from(authorAliases)
      .innerJoin(authors, eq(authorAliases.authorId, authors.id))
      .where(eq(authorAliases.matchSlug, slug))
      .limit(1);
    row = joined[0]?.author;
  }

  if (!row) return null;

  const aliasRows = await db
    .select({ matchSlug: authorAliases.matchSlug })
    .from(authorAliases)
    .where(eq(authorAliases.authorId, row.id));

  const matchSlugs = Array.from(
    new Set([row.slug, ...aliasRows.map((r) => r.matchSlug.trim().toLowerCase())]),
  ).filter(Boolean);

  const kind = row.kind === "desk" ? "desk" : "person";
  return {
    authorId: row.id,
    canonicalSlug: row.slug,
    displayName: row.displayName,
    kind,
    matchSlugs,
  };
}

/** SQL fragment: slug derived from articles.author_name (must match storage getAuthorPage). */
export function authorNameSlugSql() {
  return sql`trim(both '-' from regexp_replace(lower(trim(coalesce(${articles.authorName}, ''))), '[^a-z0-9]+', '-', 'g'))`;
}

export function buildAuthorSlugSqlMatch(matchSlugs: string[]) {
  const authorSlugSql = authorNameSlugSql();
  if (matchSlugs.length === 0) return sql`false`;
  if (matchSlugs.length === 1) return sql`${authorSlugSql} = ${matchSlugs[0]}`;
  return or(...matchSlugs.map((s) => sql`${authorSlugSql} = ${s}`))!;
}
