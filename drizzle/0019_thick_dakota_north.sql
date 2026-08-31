CREATE TYPE "public"."fixture_vote_choice" AS ENUM('home', 'away');--> statement-breakpoint
CREATE TABLE "fixture_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fixture_id" uuid NOT NULL,
	"voter_id" text NOT NULL,
	"choice" "fixture_vote_choice" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fixture_votes" ADD CONSTRAINT "fixture_votes_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fixture_votes_fixture_voter_unique" ON "fixture_votes" USING btree ("fixture_id","voter_id");--> statement-breakpoint
CREATE INDEX "fixture_votes_fixture_idx" ON "fixture_votes" USING btree ("fixture_id");