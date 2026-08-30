import type postgres from "postgres";

import { catalogEntries } from "@/db/catalog-data";

export const disabledLeagueSlugs = new Set([
  "switzerland-super-league",
  "czech-republic-czech-liga",
]);

export async function seedExpandedLeagueCatalog(sql: postgres.TransactionSql) {
  const distinctCountries = [...new Map(catalogEntries.map((entry) => [entry.countryCode, {
    name: entry.country,
    code: entry.countryCode,
    flag_url: entry.flagUrl,
  }])).values()];
  const countryValues = sql(distinctCountries, "name", "code", "flag_url") as postgres.Helper<unknown>;
  const countries = await sql<Array<{ id: string; code: string }>>`
    insert into countries ${countryValues}
    on conflict (code) do update set
      name = excluded.name,
      flag_url = excluded.flag_url
    returning id, code
  `;
  const countryIds = new Map(countries.map((country) => [country.code, country.id]));

  const leagueRows = catalogEntries.map((entry) => {
    const countryId = countryIds.get(entry.countryCode);
    if (!countryId) throw new Error(`Could not resolve ${entry.country}.`);
    return {
      provider: "api-football",
      provider_external_id: entry.externalId,
      country_id: countryId,
      name: entry.name,
      slug: entry.slug,
      short_name: entry.shortName,
      region: entry.region,
      logo_url: entry.logoUrl,
      enabled: !disabledLeagueSlugs.has(entry.slug),
      priority: entry.priority,
    };
  });
  const leagueValues = sql(leagueRows,
    "provider", "provider_external_id", "country_id", "name", "slug",
    "short_name", "region", "logo_url", "enabled", "priority") as postgres.Helper<unknown>;
  const leagues = await sql<Array<{ id: string; provider_external_id: string }>>`
    insert into leagues ${leagueValues}
    on conflict (provider, provider_external_id) do update set
      provider = excluded.provider,
      provider_external_id = excluded.provider_external_id,
      country_id = excluded.country_id,
      name = excluded.name,
      slug = excluded.slug,
      short_name = excluded.short_name,
      region = excluded.region,
      logo_url = excluded.logo_url,
      enabled = excluded.enabled,
      priority = excluded.priority,
      updated_at = now()
    returning id, provider_external_id
  `;
  const leagueIds = new Map(leagues.map((league) => [league.provider_external_id, league.id]));

  const focusedLeagueIds = sql(catalogEntries.map((entry) => entry.externalId)) as postgres.Helper<unknown>;
  await sql`
    update leagues set enabled = false, updated_at = now()
    where provider = 'api-football'
      and provider_external_id not in ${focusedLeagueIds}
      and enabled = true
  `;

  const catalogLeagueIds = sql(leagues.map((league) => league.id)) as postgres.Helper<unknown>;
  await sql`
    update seasons set is_current = false
    where league_id in ${catalogLeagueIds}
      and is_current = true
  `;

  const seasonRows = catalogEntries.map((entry) => {
    const leagueId = leagueIds.get(entry.externalId);
    if (!leagueId) throw new Error(`Could not resolve ${entry.name}.`);
    return {
      league_id: leagueId,
      provider_season: entry.providerSeason,
      name: entry.seasonName,
      start_date: entry.startDate,
      end_date: entry.endDate,
      is_current: true,
    };
  });
  const seasonValues = sql(seasonRows,
    "league_id", "provider_season", "name", "start_date", "end_date", "is_current") as postgres.Helper<unknown>;
  await sql`
    insert into seasons ${seasonValues}
    on conflict (league_id, provider_season) do update set
      name = excluded.name,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      is_current = true,
      updated_at = now()
  `;
}
