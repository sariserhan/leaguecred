import { sqlClient } from "@/db";

const turkeyId = "00000000-0000-4000-8000-000000000001";
const superLigId = "10000000-0000-4000-8000-000000000001";
const currentSeasonId = "20000000-0000-4000-8000-000000000001";

async function main() {
  try {
    await sqlClient.begin(async (sql) => {
      await sql`
        insert into countries (id, name, code)
        values (${turkeyId}, 'Türkiye', 'TR')
        on conflict (code) do update set name = excluded.name
      `;

      await sql`
        insert into leagues (
          id, provider, provider_external_id, country_id,
          name, slug, short_name, region, enabled, priority
        )
        values (
          ${superLigId}, 'api-football', '203', ${turkeyId},
          'Süper Lig', 'super-lig', 'SÜL', 'Europe', true, 1
        )
        on conflict (slug) do update set
          provider = excluded.provider,
          provider_external_id = excluded.provider_external_id,
          country_id = excluded.country_id,
          name = excluded.name,
          short_name = excluded.short_name,
          region = excluded.region,
          enabled = excluded.enabled,
          priority = excluded.priority,
          updated_at = now()
      `;

      await sql`
        insert into seasons (
          id, league_id, provider_season, name,
          start_date, end_date, is_current
        )
        values (
          ${currentSeasonId}, ${superLigId}, '2026', '2026–27',
          '2026-07-01', '2027-06-30', true
        )
        on conflict (league_id, provider_season) do update set
          name = excluded.name,
          start_date = excluded.start_date,
          end_date = excluded.end_date,
          is_current = true,
          updated_at = now()
      `;
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
