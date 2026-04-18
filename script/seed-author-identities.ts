/**
 * Idempotent seed for Author Identity Engine (authors + author_aliases).
 * display_name is a clean human label only (no ", PA" suffixes).
 * Run: npm run seed:author-identities  (or DATABASE_URL=... tsx script/seed-author-identities.ts)
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

/** Standard PA-style bylines → one clean display name (no agency suffix in display_name). */
function paJournalist(displayName: string, extraBylines: string[] = []): PilotAuthor {
  const name = displayName.trim();
  const base = new Set<string>([
    name,
    `${name}, Press Association`,
    `${name}, PA`,
    `By ${name}, Press Association`,
    `By ${name}, PA`,
    ...extraBylines,
  ]);
  return {
    slug: slugifyAuthorName(name),
    displayName: name,
    kind: "person",
    bylineVariants: [...base],
  };
}

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
  paJournalist("Rory Dollard", [
    "Rory Dollard, Press Association Sport",
    "By Rory Dollard, Press Association",
  ]),
  paJournalist("Simon Peach", [
    "Simon Peach, Press Association Chief Football Writer, Paris",
    "By Simon Peach, Press Association",
  ]),
  paJournalist("Damian Spellman"),
  paJournalist("Jonathan Veal"),
  paJournalist("George Sessions"),
  paJournalist("Jamie Gardner"),
  paJournalist("Andy Hampson"),
  paJournalist("Ian Parker"),
  paJournalist("Ronnie Esplin"),
  paJournalist("Phil Blanche"),
  paJournalist("Gavin McCafferty"),
  paJournalist("Carl Markham"),
  paJournalist("Eleanor Crooks"),
  paJournalist("David Charlesworth"),
  paJournalist("Mark Walker"),
  paJournalist("Rebecca Johnson"),
  paJournalist("Edward Elliot"),
  paJournalist("James Olley"),
  paJournalist("Charlotte Duncker"),
  paJournalist("Mike McGrath"),
  paJournalist("Rob Harris"),
  paJournalist("Dan Kilpatrick"),
  paJournalist("Nick Ames"),
  paJournalist("Simon Stone"),
  paJournalist("Dominic Booth"),
  paJournalist("Tom Williams"),
  paJournalist("Lucy Thackeray"),
  paJournalist("Matt McGeehan"),
  paJournalist("Dafydd Pritchard"),
  paJournalist("Andy Newport"),
  paJournalist("Kieran Doody"),
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
