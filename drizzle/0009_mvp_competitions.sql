-- Seed MVP competitions (run manually after migration):
--
--   INSERT INTO mvp_competitions (competition_id, sort_order, enabled)
--   SELECT id, row_number() OVER (ORDER BY
--     CASE slug
--       WHEN 'premier-league' THEN 1
--       WHEN 'championship'   THEN 2
--       WHEN 'league-one'     THEN 3
--       WHEN 'league-two'     THEN 4
--       ELSE 99
--     END
--   ), true
--   FROM competitions
--   WHERE slug IN ('premier-league', 'championship', 'league-one', 'league-two')
--   ON CONFLICT (competition_id) DO NOTHING;
--

CREATE TABLE "mvp_competitions" (
	"competition_id" varchar PRIMARY KEY NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mvp_competitions" ADD CONSTRAINT "mvp_competitions_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mvp_competitions_enabled_sort_idx" ON "mvp_competitions" USING btree ("enabled","sort_order");