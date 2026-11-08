-- The read contract for Sports Intel, the owner's separate research project.
--
-- Views in their own schema run with their owner's rights, so the reader role
-- needs no grant on any base table: member, pick, session, account and
-- settlement tables stay out of reach. The role is created without login; its
-- password is set by hand and never written to a file.
--
-- The views depend on the columns they name, so a later migration that drops or
-- retypes one of them must drop and recreate the affected view in the same file.
-- The source of truth is sports-intel's contract/leaguecred/v1/apply.sql.
create schema if not exists intel_contract_v1;
--> statement-breakpoint
create or replace view intel_contract_v1.meta as
  select '1.0.0'::text as contract_version;
--> statement-breakpoint
create or replace view intel_contract_v1.leagues with (security_barrier) as
  select l.id, l.slug, l.name, l.short_name, l.sport, l.region, c.name as country,
         l.enabled, l.provider as upstream_provider, l.provider_external_id as upstream_id, l.updated_at
  from public.leagues l join public.countries c on c.id = l.country_id;
--> statement-breakpoint
create or replace view intel_contract_v1.seasons with (security_barrier) as
  select id, league_id, provider_season, name, start_date, end_date, is_current, updated_at
  from public.seasons;
--> statement-breakpoint
create or replace view intel_contract_v1.teams with (security_barrier) as
  select t.id, t.slug, t.name, t.short_name, c.name as country,
         t.provider as upstream_provider, t.provider_external_id as upstream_id, t.updated_at
  from public.teams t left join public.countries c on c.id = t.country_id;
--> statement-breakpoint
create or replace view intel_contract_v1.team_aliases with (security_barrier) as
  select provider, provider_external_id, team_id, source_name, updated_at
  from public.team_provider_aliases;
--> statement-breakpoint
create or replace view intel_contract_v1.memberships with (security_barrier) as
  select league_id, season_id, team_id, source_provider, updated_at
  from public.league_team_memberships;
--> statement-breakpoint
create or replace view intel_contract_v1.fixtures with (security_barrier) as
  select id, provider as upstream_provider, provider_external_id as upstream_id,
         league_id, season_id, home_team_id, away_team_id, kickoff_at, status::text as status,
         home_score, away_score, winner_team_id, updated_at
  from public.fixtures;
--> statement-breakpoint
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sports_intel_reader') then
    create role sports_intel_reader nologin noinherit nosuperuser nocreatedb nocreaterole noreplication
      connection limit 2;
  end if;
end $$;
--> statement-breakpoint
alter role sports_intel_reader set default_transaction_read_only = on;
--> statement-breakpoint
alter role sports_intel_reader set statement_timeout = '15s';
--> statement-breakpoint
alter role sports_intel_reader set idle_in_transaction_session_timeout = '30s';
--> statement-breakpoint
grant usage on schema intel_contract_v1 to sports_intel_reader;
--> statement-breakpoint
grant select on all tables in schema intel_contract_v1 to sports_intel_reader;
