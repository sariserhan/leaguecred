-- A club's page moves when its name is corrected: /teams/newcastle becomes
-- /teams/newcastle-united. Every link already shared to the old address then
-- answered 404, and a 404 is indistinguishable from the page never existing —
-- to a reader and to a crawler that had already indexed it.
--
-- So an address a club used to answer to is kept, and the page redirects to
-- wherever the club lives now. Rows are only ever added: a slug that once
-- pointed at a club must keep pointing there.
CREATE TABLE "team_slug_history" (
  "slug" text PRIMARY KEY NOT NULL,
  "team_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "team_slug_history" ADD CONSTRAINT "team_slug_history_team_id_teams_id_fk"
  FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade;--> statement-breakpoint
CREATE INDEX "team_slug_history_team_id_idx" ON "team_slug_history" USING btree ("team_id");
