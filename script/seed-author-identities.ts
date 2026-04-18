/**
 * Idempotent pilot seed for Author Identity Engine (authors + author_aliases).
 * Run: DATABASE_URL=... tsx script/seed-author-identities.ts
 */
import { db } from "../server/db";
import { authorAliases, authors } from "../shared/schema";
import { slugifyAuthorName } from "../shared/author-slug";

function uniqueSlugs(...rawNames: (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const raw of rawNames) {
    const s = slugifyAuthorName(raw);
    if (s) out.add(s);
  }
  return [...out];
}

type PilotAuthor = {
  slug: string;
  displayName: string;
  kind: "person" | "desk";
  /** Raw byline variants whose slugify(author_name) should map to this author. */
  bylineVariants: string[];
};

const PILOT: PilotAuthor[] = [
  {
    slug: "pa-sport-staff",
    displayName: "PA Sport Staff",
    kind: "desk",
    bylineVariants: [
      "PA Sport Staff",
      "Press Association Sport Staff",
      "Press Association sport staff",
      "By Press Association Sport Staff",
    ],
  },
  {
    slug: "pa-sport-reporters",
    displayName: "PA Sport Reporters",
    kind: "desk",
    bylineVariants: [
      "PA Sport Reporters",
      "Press Association Sport Reporters",
      "Press Association sport reporters",
      "By Press Association Sport Reporters",
    ],
  },
  {
    slug: "rory-dollard",
    displayName: "Rory Dollard",
    kind: "person",
    bylineVariants: [
      "Rory Dollard",
      "Rory Dollard, Press Association",
      "Rory Dollard, PA",
      "Rory Dollard, Press Association Sport",
      "By Rory Dollard, Press Association",
    ],
  },
  {
    slug: "simon-peach",
    displayName: "Simon Peach",
    kind: "person",
    bylineVariants: [
      "Simon Peach",
      "Simon Peach, Press Association",
      "Simon Peach, PA",
      "Simon Peach, Press Association Chief Football Writer, Paris",
      "By Simon Peach, Press Association",
    ],
  },
  {
    slug: "damian-spellman",
    displayName: "Damian Spellman",
    kind: "person",
    bylineVariants: ["Damian Spellman", "Damian Spellman, Press Association", "Damian Spellman, PA"],
  },
  {
    slug: "jonathan-veal",
    displayName: "Jonathan Veal",
    kind: "person",
    bylineVariants: ["Jonathan Veal", "Jonathan Veal, Press Association", "Jonathan Veal, PA"],
  },
  {
    slug: "george-sessions",
    displayName: "George Sessions",
    kind: "person",
    bylineVariants: ["George Sessions", "George Sessions, Press Association", "George Sessions, PA"],
  },
  {
    slug: "jamie-gardner",
    displayName: "Jamie Gardner",
    kind: "person",
    bylineVariants: ["Jamie Gardner", "Jamie Gardner, Press Association", "Jamie Gardner, PA"],
  },
  {
    slug: "andy-hampson",
    displayName: "Andy Hampson",
    kind: "person",
    bylineVariants: ["Andy Hampson", "Andy Hampson, Press Association", "Andy Hampson, PA"],
  },
  {
    slug: "ian-parker",
    displayName: "Ian Parker",
    kind: "person",
    bylineVariants: ["Ian Parker", "Ian Parker, Press Association", "Ian Parker, PA"],
  },
  {
    slug: "ronnie-esplin",
    displayName: "Ronnie Esplin",
    kind: "person",
    bylineVariants: ["Ronnie Esplin", "Ronnie Esplin, Press Association", "Ronnie Esplin, PA"],
  },
  {
    slug: "phil-blanche",
    displayName: "Phil Blanche",
    kind: "person",
    bylineVariants: ["Phil Blanche", "Phil Blanche, Press Association", "Phil Blanche, PA"],
  },
  {
    slug: "gavin-mccafferty",
    displayName: "Gavin McCafferty",
    kind: "person",
    bylineVariants: ["Gavin McCafferty", "Gavin McCafferty, Press Association", "Gavin McCafferty, PA"],
  },
  {
    slug: "carl-markham",
    displayName: "Carl Markham",
    kind: "person",
    bylineVariants: ["Carl Markham", "Carl Markham, Press Association", "Carl Markham, PA"],
  },
  {
    slug: "eleanor-crooks",
    displayName: "Eleanor Crooks",
    kind: "person",
    bylineVariants: ["Eleanor Crooks", "Eleanor Crooks, Press Association", "Eleanor Crooks, PA"],
  },
  {
    slug: "david-charlesworth",
    displayName: "David Charlesworth",
    kind: "person",
    bylineVariants: ["David Charlesworth", "David Charlesworth, Press Association", "David Charlesworth, PA"],
  },
];

async function main() {
  for (const p of PILOT) {
    const [row] = await db
      .insert(authors)
      .values({
        slug: p.slug,
        displayName: p.displayName,
        kind: p.kind,
      })
      .onConflictDoUpdate({
        target: authors.slug,
        set: { displayName: p.displayName, kind: p.kind, updatedAt: new Date() },
      })
      .returning({ id: authors.id });
    const authorId = row?.id;
    if (!authorId) continue;

    const matchSlugs = uniqueSlugs(p.displayName, ...p.bylineVariants, p.slug);
    for (const matchSlug of matchSlugs) {
      await db.insert(authorAliases).values({ authorId, matchSlug }).onConflictDoNothing();
    }
  }
  console.log(`[seed-author-identities] upserted ${PILOT.length} canonical authors + aliases`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
