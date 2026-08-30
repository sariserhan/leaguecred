CREATE TABLE "team_provider_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_external_id" text NOT NULL,
	"team_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_provider_aliases" ADD CONSTRAINT "team_provider_aliases_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "team_provider_aliases_provider_external_unique" ON "team_provider_aliases" USING btree ("provider","provider_external_id");--> statement-breakpoint
CREATE INDEX "team_provider_aliases_team_id_idx" ON "team_provider_aliases" USING btree ("team_id");