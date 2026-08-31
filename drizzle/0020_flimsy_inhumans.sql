CREATE TABLE IF NOT EXISTS "game_discussions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fixture_id" uuid NOT NULL,
  "user_id" text,
  "guest_name" text,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "game_discussions_author_check" CHECK (("user_id" is not null and "guest_name" is null) or ("user_id" is null and "guest_name" is not null))
);
--> statement-breakpoint
ALTER TABLE "picks" ADD COLUMN IF NOT EXISTS "decision_reason" text;
--> statement-breakpoint
ALTER TABLE "game_discussions" ADD CONSTRAINT "game_discussions_fixture_id_fixtures_id_fk" FOREIGN KEY ("fixture_id") REFERENCES "public"."fixtures"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "game_discussions" ADD CONSTRAINT "game_discussions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "game_discussions_fixture_created_idx" ON "game_discussions" USING btree ("fixture_id","created_at");