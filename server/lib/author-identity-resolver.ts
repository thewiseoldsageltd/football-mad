import { eq, inArray, sql } from "drizzle-orm";
import { slugifyAuthorName } from "@shared/author-slug";
import { db } from "../db";
import { articles, authorAliases, authors } from "@shared/schema";

export type ResolvedAuthorIdentity = {
  authorId: string;
  canonicalSlug: string;
  displayName: string;
  kind: "person" | "desk";
  /** Slug values that equal articles.author_name_slug / slugifyAuthorName for this author. */
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

/** Indexed column; expression in DB matches slugifyAuthorName (see migration 0013). */
export function buildAuthorSlugSqlMatch(matchSlugs: string[]) {
  const cleaned = Array.from(new Set(matchSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean)));
  if (cleaned.length === 0) return sql`false`;
  if (cleaned.length === 1) return eq(articles.authorNameSlug, cleaned[0]!);
  return inArray(articles.authorNameSlug, cleaned);
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
