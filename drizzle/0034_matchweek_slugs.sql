-- A shareable address for a settled matchweek.
--
-- The page was reached by the row's UUID, which put an internal primary key in
-- a public URL and made the one page most worth sharing — every call of a
-- finished week — the one nobody could paste anywhere.
--
-- The slug is the UTC day the week starts, which is what a supporter would
-- recognise. That is not unique on its own: a league can hold two weeks
-- beginning on the same day, and this catalogue holds three such pairs. The
-- backfill numbers them in the order they start, so the first keeps the bare
-- date and only a real collision carries a suffix.
--
-- Stored rather than derived, so renaming or renumbering a week cannot move the
-- address of a page somebody has already shared.
ALTER TABLE "matchweeks" ADD COLUMN IF NOT EXISTS "slug" text;
--> statement-breakpoint
WITH numbered AS (
  SELECT id,
    to_char("start_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
    row_number() OVER (
      PARTITION BY "league_id", ("start_at" AT TIME ZONE 'UTC')::date
      ORDER BY "start_at", id
    ) AS position
  FROM "matchweeks"
)
UPDATE "matchweeks" SET "slug" = CASE
  WHEN numbered.position = 1 THEN numbered.day
  ELSE numbered.day || '-' || numbered.position
END
FROM numbered WHERE "matchweeks".id = numbered.id AND "matchweeks"."slug" IS NULL;
--> statement-breakpoint
ALTER TABLE "matchweeks" ALTER COLUMN "slug" SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "matchweeks_league_slug_unique" ON "matchweeks" ("league_id", "slug");
