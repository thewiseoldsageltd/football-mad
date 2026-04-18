CREATE TABLE IF NOT EXISTS "authors" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "display_name" text NOT NULL,
  "kind" text DEFAULT 'person' NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "authors_slug_unique" UNIQUE ("slug")
);

CREATE INDEX IF NOT EXISTS "authors_kind_idx" ON "authors" ("kind");

CREATE TABLE IF NOT EXISTS "author_aliases" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author_id" varchar NOT NULL,
  "match_slug" text NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "author_aliases_author_id_authors_id_fk" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "author_aliases_match_slug_unique" UNIQUE ("match_slug")
);

CREATE INDEX IF NOT EXISTS "author_aliases_author_id_idx" ON "author_aliases" ("author_id");
