-- A display name only one member can hold.
--
-- Any duplicate already stored is renamed first rather than blocking the
-- migration: the deploy runs this before the site starts, so a constraint that
-- can fail here takes the site with it. The earliest member keeps the name -
-- the record built under it is theirs - and each later one takes a short piece
-- of its own id. Production has no duplicates, so this renames nothing there;
-- it exists for the databases that do, seeded and local ones included.
WITH ranked AS (
  SELECT id, name,
    row_number() OVER (PARTITION BY lower(name) ORDER BY created_at, id) AS position
  FROM "user"
)
UPDATE "user" SET name = ranked.name || ' ' || left(ranked.id, 4), updated_at = now()
FROM ranked
WHERE "user".id = ranked.id AND ranked.position > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX "user_name_unique" ON "user" USING btree (lower("name"));
