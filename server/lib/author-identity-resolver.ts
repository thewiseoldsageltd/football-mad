import { eq, inArray, or, sql } from "drizzle-orm";
import { slugifyAuthorName } from "@shared/author-slug";
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

/**
 * Batch map slugify(author_name) values to canonical `authors.slug` when the raw slug matches
 * `authors.slug` or `author_aliases.match_slug`. Keys and values are lowercase.
 */
export async function batchResolveAuthorProfileSlugLookup(rawSlugs: string[]): Promise<Map<string, string>> {
  const keys = Array.from(new Set(rawSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean)));
  const out = new Map<string, string>();
  if (keys.length === 0) return out;

  const authorHits = await db
    .select({ slug: authors.slug })
    .from(authors)
    .where(inArray(authors.slug, keys));
  for (const r of authorHits) {
    const k = r.slug.trim().toLowerCase();
    out.set(k, k);
  }

  const aliasHits = await db
    .select({ canonical: authors.slug, matchSlug: authorAliases.matchSlug })
    .from(authorAliases)
    .innerJoin(authors, eq(authorAliases.authorId, authors.id))
    .where(inArray(authorAliases.matchSlug, keys));
  for (const r of aliasHits) {
    const m = r.matchSlug.trim().toLowerCase();
    const c = r.canonical.trim().toLowerCase();
    out.set(m, c);
  }

  return out;
}

/** Adds `authorProfileSlug` for outbound `/authors/:slug` links (canonical when known, else raw slugify). */
export async function attachAuthorProfileSlugsToArticleRows<T extends { authorName?: string | null }>(
  rows: T[],
): Promise<Array<T & { authorProfileSlug: string }>> {
  const rawSet = new Set<string>();
  for (const r of rows) {
    const s = slugifyAuthorName(r.authorName);
    if (s) rawSet.add(s);
  }
  const lookup = await batchResolveAuthorProfileSlugLookup(Array.from(rawSet));
  return rows.map((r) => {
    const raw = slugifyAuthorName(r.authorName);
    const authorProfileSlug = raw ? (lookup.get(raw) ?? raw) : "";
    return { ...r, authorProfileSlug };
  });
}
