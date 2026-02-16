CREATE TABLE IF NOT EXISTS "team_managers" (
	"team_id" varchar PRIMARY KEY NOT NULL,
	"manager_id" varchar NOT NULL,
	"as_of" timestamp NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$
BEGIN
	ALTER TABLE "team_managers" ADD CONSTRAINT "team_managers_manager_id_managers_id_fk" FOREIGN KEY ("manager_id") REFERENCES "managers"("id") ON DELETE CASCADE;
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "team_managers_manager_idx" ON "team_managers"("manager_id");
