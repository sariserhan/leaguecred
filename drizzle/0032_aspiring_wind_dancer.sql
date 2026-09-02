-- Every member gets a handle, and the display name stops having to be unique.
--
-- The handle is what identifies a member from here: it is what a profile is
-- linked, shared and indexed by, and what makes an impersonation impossible to
-- complete. Backfilled from the display name, since that is the name people
-- already know each member by.
--
-- A member whose handle is already taken - two real Mehmet Yılmaz, or two long
-- names that truncate to the same twenty characters - takes a piece of their
-- own id rather than a number. A number reads better but can collide with a
-- handle another member's name produced honestly, and this runs during a
-- deploy: a backfill that can fail here takes the site with it.
WITH slugged AS (
  SELECT id, created_at,
    left(
      regexp_replace(
        regexp_replace(
          lower(translate(name, 'ıİøØåÅłŁđĐ', 'iioo aallddd')),
          '[^a-z0-9]+', '_', 'g'),
        '^_+|_+$', '', 'g'),
      20) AS base
  FROM "user"
  WHERE username IS NULL
),
ranked AS (
  SELECT id,
    CASE WHEN length(base) >= 3 THEN base ELSE left('member_' || base, 20) END AS base,
    row_number() OVER (
      PARTITION BY CASE WHEN length(base) >= 3 THEN base ELSE left('member_' || base, 20) END
      ORDER BY created_at, id) AS position
  FROM slugged
)
UPDATE "user" SET
  username = CASE
    WHEN ranked.position = 1 THEN ranked.base
    ELSE left(ranked.base, 13) || '_' || left(replace("user".id, '-', ''), 6)
  END,
  updated_at = now()
FROM ranked
WHERE "user".id = ranked.id;
--> statement-breakpoint
-- Two members may now be called the same thing, because the handle is what
-- tells them apart. Real names repeat; that is what names do.
DROP INDEX "user_name_unique";
