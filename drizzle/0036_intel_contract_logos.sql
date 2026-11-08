-- Read contract 1.1 for Sports Intel: league and club logo URLs, for display on its
-- private dashboard. A column added at the end of a view is a compatible change, so
-- the reader keeps working on 1.0 and picks the logos up from 1.1.
create or replace view intel_contract_v1.meta as
  select '1.1.0'::text as contract_version;
--> statement-breakpoint
create or replace view intel_contract_v1.leagues with (security_barrier) as
  select l.id, l.slug, l.name, l.short_name, l.sport, l.region, c.name as country,
         l.enabled, l.provider as upstream_provider, l.provider_external_id as upstream_id, l.updated_at, l.logo_url
  from public.leagues l join public.countries c on c.id = l.country_id;
--> statement-breakpoint
create or replace view intel_contract_v1.teams with (security_barrier) as
  select t.id, t.slug, t.name, t.short_name, c.name as country,
         t.provider as upstream_provider, t.provider_external_id as upstream_id, t.updated_at, t.logo_url
  from public.teams t left join public.countries c on c.id = t.country_id;
