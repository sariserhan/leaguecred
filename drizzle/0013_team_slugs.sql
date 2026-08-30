-- Written to be safe to replay. This migration is re-timed whenever another
-- branch ships one first, which makes it run again on a database that already
-- has the column, so every statement here tolerates that.
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "slug" text;--> statement-breakpoint
WITH base AS (
  SELECT id, coalesce(nullif(trim(both '-' from lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))), ''), 'team') AS base_slug
  FROM "teams" WHERE "slug" IS NULL
), ranked AS (
  SELECT id, base_slug, row_number() over (partition by base_slug order by id) AS suffix
  FROM base
)
UPDATE "teams" SET "slug" = CASE WHEN ranked.suffix = 1 THEN ranked.base_slug ELSE ranked.base_slug || '-' || ranked.suffix END
FROM ranked WHERE "teams".id = ranked.id;--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "slug" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "teams" ADD CONSTRAINT "teams_slug_unique" UNIQUE("slug");
EXCEPTION WHEN duplicate_table THEN NULL; WHEN duplicate_object THEN NULL; END $$;
