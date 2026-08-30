import { sqlClient } from "@/db";
import { seedExpandedLeagueCatalog } from "@/db/expanded-catalog";

const turkeyId = "00000000-0000-4000-8000-000000000001";
const superLigId = "10000000-0000-4000-8000-000000000001";
const currentSeasonId = "20000000-0000-4000-8000-000000000001";

async function main() {
  try {
    await sqlClient.begin(async (sql) => {
      const [country] = await sql<Array<{ id: string }>>`
        insert into countries (id, name, code, flag_url)
        values (${turkeyId}, 'Türkiye', 'TR', 'https://media.api-sports.io/flags/tr.svg')
        on conflict (code) do update set name = excluded.name, flag_url = excluded.flag_url
        returning id
      `;
      if (!country) throw new Error("Could not upsert Türkiye.");

      const [league] = await sql<Array<{ id: string }>>`
        insert into leagues (
          id, provider, provider_external_id, country_id,
          name, slug, short_name, region, logo_url, enabled, priority
        )
        values (
          ${superLigId}, 'api-football', '203', ${country.id},
          'Süper Lig', 'super-lig', 'SÜL', 'Europe',
          'https://media.api-sports.io/football/leagues/203.png', true, 1
        )
        on conflict (slug) do update set
          provider = excluded.provider,
          provider_external_id = excluded.provider_external_id,
          country_id = excluded.country_id,
          name = excluded.name,
          short_name = excluded.short_name,
          region = excluded.region,
          logo_url = excluded.logo_url,
          enabled = excluded.enabled,
          priority = excluded.priority,
          updated_at = now()
        returning id
      `;
      if (!league) throw new Error("Could not upsert Süper Lig.");

      await sql`
        insert into seasons (
          id, league_id, provider_season, name,
          start_date, end_date, is_current
        )
        values (
          ${currentSeasonId}, ${league.id}, '2026', '2026–27',
          '2026-08-14', '2027-05-23', true
        )
        on conflict (league_id, provider_season) do update set
          name = excluded.name,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          is_current = true,
          updated_at = now()
      `;

      await seedExpandedLeagueCatalog(sql);
    });

    console.info("Production league catalog is ready.");
  } finally {
    await sqlClient.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
