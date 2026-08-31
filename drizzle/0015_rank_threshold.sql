-- How many settled independent Weekly Locks a record needs before it is ranked
-- and can be followed. Ten is the standard, but a founding season has nobody who
-- can reach it for ten gameweeks, which leaves half the product inert. Making it
-- a setting lets the first season open at a lower, stated bar and be raised once
-- a cohort has cleared it.
alter table app_settings
  add column if not exists minimum_settled_picks_for_rank integer default 10 not null;
--> statement-breakpoint
alter table app_settings drop constraint if exists app_settings_rank_threshold_check;
--> statement-breakpoint
alter table app_settings add constraint app_settings_rank_threshold_check
  check (minimum_settled_picks_for_rank between 1 and 100);
