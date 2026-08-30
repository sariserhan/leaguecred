CREATE TYPE "public"."league_preference_kind" AS ENUM('know', 'help');--> statement-breakpoint
CREATE TABLE "user_league_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"league_id" uuid NOT NULL,
	"kind" "league_preference_kind" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_league_preferences" ADD CONSTRAINT "user_league_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_league_preferences" ADD CONSTRAINT "user_league_preferences_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_league_preferences_unique" ON "user_league_preferences" USING btree ("user_id","league_id","kind");--> statement-breakpoint
CREATE INDEX "user_league_preferences_user_kind_idx" ON "user_league_preferences" USING btree ("user_id","kind");--> statement-breakpoint
CREATE INDEX "user_league_preferences_league_idx" ON "user_league_preferences" USING btree ("league_id");