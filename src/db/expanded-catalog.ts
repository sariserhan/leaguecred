import type postgres from "postgres";

type Region = "Europe" | "Americas";
type CatalogEntry = {
  id: number;
  country: string;
  code: string;
  flagCode: string;
  externalId: string;
  name: string;
  slug: string;
  shortName: string;
  region: Region;
  priority: number;
  seasonName: string;
  startDate: string;
  endDate: string;
};

const entries: CatalogEntry[] = [
  { id: 4, country: "Italy", code: "IT", flagCode: "it", externalId: "135", name: "Serie A", slug: "serie-a", shortName: "SA", region: "Europe", priority: 2, seasonName: "2026–27", startDate: "2026-08-22", endDate: "2027-05-30" },
  { id: 2, country: "England", code: "GB", flagCode: "gb-eng", externalId: "39", name: "Premier League", slug: "premier-league", shortName: "PL", region: "Europe", priority: 3, seasonName: "2026–27", startDate: "2026-08-21", endDate: "2027-05-30" },
  { id: 7, country: "Spain", code: "ES", flagCode: "es", externalId: "140", name: "La Liga", slug: "la-liga", shortName: "LAL", region: "Europe", priority: 4, seasonName: "2026–27", startDate: "2026-08-15", endDate: "2027-05-30" },
  { id: 8, country: "Germany", code: "DE", flagCode: "de", externalId: "78", name: "Bundesliga", slug: "bundesliga", shortName: "BUN", region: "Europe", priority: 5, seasonName: "2026–27", startDate: "2026-08-28", endDate: "2027-05-22" },
  { id: 9, country: "Netherlands", code: "NL", flagCode: "nl", externalId: "88", name: "Eredivisie", slug: "eredivisie", shortName: "ERE", region: "Europe", priority: 6, seasonName: "2026–27", startDate: "2026-08-07", endDate: "2027-05-23" },
  { id: 10, country: "Portugal", code: "PT", flagCode: "pt", externalId: "94", name: "Primeira Liga", slug: "primeira-liga", shortName: "PRI", region: "Europe", priority: 7, seasonName: "2026–27", startDate: "2026-08-07", endDate: "2027-05-16" },
  { id: 11, country: "Greece", code: "GR", flagCode: "gr", externalId: "197", name: "Super League Greece", slug: "super-league-greece", shortName: "SLG", region: "Europe", priority: 8, seasonName: "2026–27", startDate: "2026-08-22", endDate: "2027-03-20" },
  { id: 12, country: "Argentina", code: "AR", flagCode: "ar", externalId: "128", name: "Liga Profesional Argentina", slug: "liga-profesional-argentina", shortName: "LPA", region: "Americas", priority: 9, seasonName: "2026", startDate: "2026-01-22", endDate: "2026-11-08" },
  { id: 13, country: "Brazil", code: "BR", flagCode: "br", externalId: "71", name: "Brasileirão Série A", slug: "brasileirao-serie-a", shortName: "BRA", region: "Americas", priority: 10, seasonName: "2026", startDate: "2026-01-28", endDate: "2026-12-02" },
  { id: 14, country: "United States", code: "US", flagCode: "us", externalId: "253", name: "Major League Soccer", slug: "major-league-soccer", shortName: "MLS", region: "Americas", priority: 11, seasonName: "2026", startDate: "2026-02-21", endDate: "2026-11-08" },
  { id: 3, country: "Canada", code: "CA", flagCode: "ca", externalId: "479", name: "Canadian Premier League", slug: "canadian-premier-league", shortName: "CPL", region: "Americas", priority: 12, seasonName: "2026", startDate: "2026-04-04", endDate: "2026-10-25" },
];

function catalogId(prefix: 0 | 1 | 2, id: number) {
  return `${prefix}0000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
}

export async function seedExpandedLeagueCatalog(sql: postgres.TransactionSql) {
  for (const entry of entries) {
    const seededCountryId = catalogId(0, entry.id);
    const seededLeagueId = catalogId(1, entry.id);
    const seasonId = catalogId(2, entry.id);

    const [country] = await sql<Array<{ id: string }>>`
      insert into countries (id, name, code, flag_url)
      values (${seededCountryId}, ${entry.country}, ${entry.code}, ${`https://media.api-sports.io/flags/${entry.flagCode}.svg`})
      on conflict (code) do update set name = excluded.name, flag_url = excluded.flag_url
      returning id
    `;
    if (!country) throw new Error(`Could not upsert ${entry.country}.`);

    const [league] = await sql<Array<{ id: string }>>`
      insert into leagues (
        id, provider, provider_external_id, country_id, name, slug,
        short_name, region, logo_url, enabled, priority
      )
      values (
        ${seededLeagueId}, 'api-football', ${entry.externalId}, ${country.id},
        ${entry.name}, ${entry.slug}, ${entry.shortName}, ${entry.region},
        ${`https://media.api-sports.io/football/leagues/${entry.externalId}.png`}, true, ${entry.priority}
      )
      on conflict (slug) do update set
        provider = excluded.provider, provider_external_id = excluded.provider_external_id,
        country_id = excluded.country_id, name = excluded.name, short_name = excluded.short_name,
        region = excluded.region, logo_url = excluded.logo_url, enabled = excluded.enabled,
        priority = excluded.priority, updated_at = now()
      returning id
    `;
    if (!league) throw new Error(`Could not upsert ${entry.name}.`);

    await sql`
      update seasons set is_current = false
      where league_id = ${league.id} and provider_season <> '2026' and is_current = true
    `;

    await sql`
      insert into seasons (id, league_id, provider_season, name, start_date, end_date, is_current)
      values (${seasonId}, ${league.id}, '2026', ${entry.seasonName}, ${entry.startDate}, ${entry.endDate}, true)
      on conflict (league_id, provider_season) do update set
        name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date,
        is_current = true, updated_at = now()
    `;
  }
}
