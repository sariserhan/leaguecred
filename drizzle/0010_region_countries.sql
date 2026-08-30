-- A continental competition's "country" is a region, not a place a club plays.
-- Teams created while syncing one were stamped with that region, which both
-- invented a bogus country and stopped the club matching its domestic row.
alter table countries add column if not exists is_region boolean default false not null;
--> statement-breakpoint
update countries set is_region = true where name in ('Europe', 'South America');
--> statement-breakpoint
update teams set country_id = null, updated_at = now()
where country_id in (select id from countries where is_region = true);
