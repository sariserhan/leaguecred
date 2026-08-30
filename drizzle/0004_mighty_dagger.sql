CREATE TABLE "league_team_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"is_complete" boolean DEFAULT false NOT NULL,
	"team_count" integer DEFAULT 0 NOT NULL,
	"note" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_team_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"source_provider" text NOT NULL,
	"source_scope" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "logo_provider" text;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "sports_db_external_id" text;--> statement-breakpoint
ALTER TABLE "league_team_imports" ADD CONSTRAINT "league_team_imports_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_team_imports" ADD CONSTRAINT "league_team_imports_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_team_memberships" ADD CONSTRAINT "league_team_memberships_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_team_memberships" ADD CONSTRAINT "league_team_memberships_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_team_memberships" ADD CONSTRAINT "league_team_memberships_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "league_team_imports_unique" ON "league_team_imports" USING btree ("league_id","season_id","provider");--> statement-breakpoint
CREATE INDEX "league_team_imports_league_season_idx" ON "league_team_imports" USING btree ("league_id","season_id");--> statement-breakpoint
CREATE INDEX "league_team_imports_season_id_idx" ON "league_team_imports" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "league_team_memberships_unique" ON "league_team_memberships" USING btree ("league_id","season_id","team_id");--> statement-breakpoint
CREATE INDEX "league_team_memberships_league_season_idx" ON "league_team_memberships" USING btree ("league_id","season_id");--> statement-breakpoint
CREATE INDEX "league_team_memberships_team_id_idx" ON "league_team_memberships" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "league_team_memberships_season_id_idx" ON "league_team_memberships" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_sports_db_external_unique" ON "teams" USING btree ("sports_db_external_id") WHERE "teams"."sports_db_external_id" is not null;