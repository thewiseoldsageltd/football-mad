CREATE TABLE "entity_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar NOT NULL,
	"media_role" text NOT NULL,
	"source_system" text NOT NULL,
	"source_ref" text,
	"source_format" text,
	"source_mime_type" text,
	"original_width" integer,
	"original_height" integer,
	"original_storage_key" text NOT NULL,
	"cdn_original_url" text NOT NULL,
	"is_primary" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"checksum" text,
	"last_ingested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_media_variants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_media_id" varchar NOT NULL,
	"variant_name" text NOT NULL,
	"format" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"fit_mode" text DEFAULT 'contain' NOT NULL,
	"storage_key" text NOT NULL,
	"cdn_url" text NOT NULL,
	"file_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entity_media_variants" ADD CONSTRAINT "entity_media_variants_entity_media_id_entity_media_id_fk" FOREIGN KEY ("entity_media_id") REFERENCES "public"."entity_media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_media_entity_idx" ON "entity_media" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "entity_media_role_idx" ON "entity_media" USING btree ("entity_type","entity_id","media_role");--> statement-breakpoint
CREATE INDEX "entity_media_primary_status_idx" ON "entity_media" USING btree ("entity_type","entity_id","is_primary","status");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_media_primary_active_unique" ON "entity_media" USING btree ("entity_type","entity_id","media_role") WHERE "entity_media"."is_primary" = true and "entity_media"."status" = 'active';--> statement-breakpoint
CREATE INDEX "entity_media_variants_media_idx" ON "entity_media_variants" USING btree ("entity_media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_media_variants_name_unique" ON "entity_media_variants" USING btree ("entity_media_id","variant_name");