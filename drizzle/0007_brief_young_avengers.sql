CREATE TABLE "job_http_calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"url" text NOT NULL,
	"method" text DEFAULT 'GET',
	"status_code" integer,
	"duration_ms" integer,
	"bytes_in" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_name" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text NOT NULL,
	"stopped_reason" text,
	"meta" jsonb,
	"counters" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "pamedia_ingest_state" (
	"key" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"last_issued" timestamp with time zone,
	"last_uri" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "entity_enrich_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "entity_enrich_attempted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "articles" ADD COLUMN "entity_enrich_error" text;--> statement-breakpoint
ALTER TABLE "job_http_calls" ADD CONSTRAINT "job_http_calls_run_id_job_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."job_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_http_calls_run_created_idx" ON "job_http_calls" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "job_runs_job_name_started_idx" ON "job_runs" USING btree ("job_name","started_at");--> statement-breakpoint
CREATE INDEX "articles_entity_enrich_status_published_idx" ON "articles" USING btree ("entity_enrich_status","published_at");