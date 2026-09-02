-- Which sport a league belongs to.
--
-- Everything downstream already keys off the league: a fixture has two teams,
-- a score and a winner, settlement asks only whether the winner is the team
-- that was picked, and a "matchweek" is the calendar week a game falls in
-- rather than any competition round. None of that is football, so a sport is
-- the one fact the schema was missing.
--
-- Existing rows are football because every league in the catalogue was.
ALTER TABLE "leagues" ADD COLUMN IF NOT EXISTS "sport" text DEFAULT 'football' NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "leagues_sport_idx" ON "leagues" ("sport");
