ALTER TABLE "user" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "profile_theme" text DEFAULT 'pitch-dark' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "featured_league_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "pinned_milestone" text;
