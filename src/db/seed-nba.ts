import type postgres from "postgres";

import { sqlClient } from "@/db";
import { EspnTeamProvider } from "@/providers/espn-team-logos";
import { teamSlug } from "@/lib/team-path";

/**
 * The NBA, seeded from ESPN alone.
 *
 * Football needs three sources between them — API-Football for league metadata,
 * TheSportsDB for badges, ESPN for fixtures — because no free one carries the
 * lot. A US league is simpler: ESPN has the teams, the logos and the schedule
 * behind the same host, so this is one request and a handful of rows.
 *
 * Seeded disabled. Nothing syncs and nothing appears until somebody turns it
 * on, which is deliberate: a competition with no fixtures and no members is
 * exactly the empty room the distribution roadmap warns about.
 *
 *   update leagues set enabled = true where slug = 'nba';
 */
const SEASON = { providerSeason: "2027", name: "2026-27", start: "2026-10-01", end: "2027-06-30" };

export async function seedNba(sql: postgres.TransactionSql) {
  const [country] = await sql<Array<{ id: string }>>`
    select id from countries where code = 'US'`;
  if (!country) throw new Error("The United States is missing from countries; run the catalog seed first.");

  const [league] = await sql<Array<{ id: string }>>`
    insert into leagues (provider, provider_external_id, country_id, name, slug, short_name,
      region, sport, logo_url, enabled, priority)
    values ('espn-web', 'nba', ${country.id}, 'NBA', 'nba', 'NBA',
      'North America', 'basketball', 'https://a.espncdn.com/i/teamlogos/leagues/500/nba.png', false, 40)
    on conflict (provider, provider_external_id) do update set
      name = excluded.name, slug = excluded.slug, short_name = excluded.short_name,
      region = excluded.region, sport = excluded.sport, logo_url = excluded.logo_url,
      priority = excluded.priority, updated_at = now()
    returning id`;

  const [season] = await sql<Array<{ id: string }>>`
    insert into seasons (league_id, provider_season, name, start_date, end_date, is_current)
    values (${league.id}, ${SEASON.providerSeason}, ${SEASON.name}, ${SEASON.start}, ${SEASON.end}, true)
    on conflict (league_id, provider_season) do update set
      name = excluded.name, start_date = excluded.start_date,
      end_date = excluded.end_date, is_current = excluded.is_current
    returning id`;

  const teams = await new EspnTeamProvider().fetchTeams("nba");
  if (teams.length < 30) throw new Error(`ESPN returned ${teams.length} NBA teams; expected 30.`);

  let members = 0;
  for (const team of teams) {
    const [row] = await sql<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, short_name, slug, logo_url,
        logo_provider, country_id)
      values ('espn-web', ${`nba:${team.id}`}, ${team.displayName}, ${team.shortDisplayName},
        ${teamSlug(team.displayName)}, ${team.logoUrl}, 'espn-web', ${country.id})
      on conflict (provider, provider_external_id) do update set
        name = excluded.name, short_name = excluded.short_name, logo_url = excluded.logo_url,
        logo_provider = excluded.logo_provider, updated_at = now()
      returning id`;

    await sql`
      insert into league_team_memberships (league_id, season_id, team_id, source_provider, source_scope)
      values (${league.id}, ${season.id}, ${row.id}, 'espn-web', 'complete')
      on conflict (league_id, season_id, team_id) do update set
        source_provider = excluded.source_provider, source_scope = excluded.source_scope,
        updated_at = now()`;
    members += 1;
  }

  return { leagueId: league.id, seasonId: season.id, teams: members };
}

async function main() {
  try {
    const result = await sqlClient.begin((sql) => seedNba(sql));
    console.info(`NBA seeded: ${result.teams} teams. It is disabled; enable it with:`);
    console.info("  update leagues set enabled = true where slug = 'nba';");
  } finally {
    await sqlClient.end();
  }
}

if (process.argv[1]?.endsWith("seed-nba.ts")) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
