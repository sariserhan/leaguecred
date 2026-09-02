import type postgres from "postgres";

import { sqlClient } from "@/db";
import { EspnTeamProvider } from "@/providers/espn-team-logos";
import { teamSlug } from "@/lib/team-path";

/**
 * The four North American leagues, seeded from ESPN alone.
 *
 * Football needs three sources between them — API-Football for league metadata,
 * TheSportsDB for badges, ESPN for fixtures — because no free one carries the
 * lot. These are simpler: ESPN has the teams, the logos and the schedule behind
 * one host, so each league is one request and a handful of rows.
 *
 * `sport` here is this product's vocabulary, not ESPN's. ESPN files the NFL
 * under "football"; we do not, because that word is already taken by the sport
 * every other league in the catalogue plays. The path segment lives on the
 * competition registry in `espn-fixtures.ts`.
 *
 * Every one seeds disabled. A competition with no fixtures and no members is
 * the empty room the distribution roadmap warns about, and three of these are
 * out of season for part of the year besides.
 */
export type UsLeague = {
  slug: string;
  code: string;
  name: string;
  shortName: string;
  sport: string;
  countryCode: string;
  priority: number;
  season: { providerSeason: string; name: string; start: string; end: string };
};

// Priority is ascending importance: 1 is the Premier League. These sit after
// the football catalogue, which runs to 24, rather than in front of it.
export const US_LEAGUES: UsLeague[] = [
  {
    slug: "nfl", code: "nfl", name: "NFL", shortName: "NFL",
    sport: "american-football", countryCode: "US", priority: 30,
    season: { providerSeason: "2026", name: "2026", start: "2026-09-01", end: "2027-02-28" },
  },
  {
    slug: "nba", code: "nba", name: "NBA", shortName: "NBA",
    // Toronto plays in it, which is the same reason MLS is filed under the
    // combined country rather than the United States alone.
    sport: "basketball", countryCode: "US-CA", priority: 31,
    season: { providerSeason: "2027", name: "2026-27", start: "2026-10-01", end: "2027-06-30" },
  },
  {
    slug: "mlb", code: "mlb", name: "MLB", shortName: "MLB",
    sport: "baseball", countryCode: "US-CA", priority: 32,
    season: { providerSeason: "2026", name: "2026", start: "2026-03-25", end: "2026-11-05" },
  },
  {
    slug: "nhl", code: "nhl", name: "NHL", shortName: "NHL",
    sport: "ice-hockey", countryCode: "US-CA", priority: 33,
    season: { providerSeason: "2027", name: "2026-27", start: "2026-10-01", end: "2027-06-30" },
  },
];

/**
 * A slug nobody else is using. `teams.slug` is unique across the whole
 * catalogue, so a US team that happens to fold to the same slug as a football
 * club would otherwise fail the insert and take the rest of the league with it.
 */
async function freeSlug(sql: postgres.TransactionSql, name: string, code: string, externalId: string) {
  const base = teamSlug(name);
  const [taken] = await sql<Array<{ provider_external_id: string }>>`
    select provider_external_id from teams where slug = ${base}`;
  if (!taken || taken.provider_external_id === externalId) return base;
  return `${base}-${code}`;
}

export async function seedUsLeague(sql: postgres.TransactionSql, league: UsLeague) {
  const [country] = await sql<Array<{ id: string }>>`
    select id from countries where code = ${league.countryCode}`;
  if (!country) throw new Error(`Country ${league.countryCode} is missing; run the catalog seed first.`);

  const [row] = await sql<Array<{ id: string }>>`
    insert into leagues (provider, provider_external_id, country_id, name, slug, short_name,
      region, sport, logo_url, enabled, priority)
    values ('espn-web', ${league.code}, ${country.id}, ${league.name}, ${league.slug}, ${league.shortName},
      'North America', ${league.sport},
      ${`https://a.espncdn.com/i/teamlogos/leagues/500/${league.code}.png`}, false, ${league.priority})
    on conflict (provider, provider_external_id) do update set
      country_id = excluded.country_id, name = excluded.name, slug = excluded.slug,
      short_name = excluded.short_name, region = excluded.region, sport = excluded.sport,
      logo_url = excluded.logo_url, priority = excluded.priority, updated_at = now()
    returning id`;

  const [season] = await sql<Array<{ id: string }>>`
    insert into seasons (league_id, provider_season, name, start_date, end_date, is_current)
    values (${row.id}, ${league.season.providerSeason}, ${league.season.name},
      ${league.season.start}, ${league.season.end}, true)
    on conflict (league_id, provider_season) do update set
      name = excluded.name, start_date = excluded.start_date,
      end_date = excluded.end_date, is_current = excluded.is_current
    returning id`;

  const teams = await new EspnTeamProvider().fetchTeams(league.code);
  if (teams.length < 20) throw new Error(`ESPN returned ${teams.length} ${league.name} teams; that is too few to be right.`);

  for (const team of teams) {
    const externalId = `${league.code}:${team.id}`;
    const [saved] = await sql<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, short_name, slug, logo_url,
        logo_provider, country_id)
      values ('espn-web', ${externalId}, ${team.displayName}, ${team.shortDisplayName},
        ${await freeSlug(sql, team.displayName, league.code, externalId)}, ${team.logoUrl},
        'espn-web', ${country.id})
      on conflict (provider, provider_external_id) do update set
        name = excluded.name, short_name = excluded.short_name, logo_url = excluded.logo_url,
        logo_provider = excluded.logo_provider, updated_at = now()
      returning id`;

    await sql`
      insert into league_team_memberships (league_id, season_id, team_id, source_provider, source_scope)
      values (${row.id}, ${season.id}, ${saved.id}, 'espn-web', 'complete')
      on conflict (league_id, season_id, team_id) do update set
        source_provider = excluded.source_provider, source_scope = excluded.source_scope,
        updated_at = now()`;
  }

  return { league: league.slug, teams: teams.length };
}

async function main() {
  const only = process.argv[2];
  const wanted = only ? US_LEAGUES.filter((league) => league.slug === only) : US_LEAGUES;
  if (!wanted.length) throw new Error(`Unknown league "${only}". Known: ${US_LEAGUES.map((l) => l.slug).join(", ")}`);

  try {
    for (const league of wanted) {
      const result = await sqlClient.begin((sql) => seedUsLeague(sql, league));
      console.info(`${result.league}: ${result.teams} teams`);
    }
    console.info("Seeded disabled. Enable one with:");
    console.info("  update leagues set enabled = true where slug = 'nba';");
  } finally {
    await sqlClient.end();
  }
}

if (process.argv[1]?.endsWith("seed-us-leagues.ts")) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
