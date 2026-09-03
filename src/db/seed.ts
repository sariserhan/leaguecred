import { sqlClient } from "@/db";
import { matchweekSlugBase } from "@/lib/matchweek-slug";
import { teamSlug } from "@/lib/team-path";

const ids = {
  turkey: "00000000-0000-4000-8000-000000000001",
  england: "00000000-0000-4000-8000-000000000002",
  canada: "00000000-0000-4000-8000-000000000003",
  italy: "00000000-0000-4000-8000-000000000004",
  mexico: "00000000-0000-4000-8000-000000000005",
  japan: "00000000-0000-4000-8000-000000000006",
  superLig: "10000000-0000-4000-8000-000000000001",
  premierLeague: "10000000-0000-4000-8000-000000000002",
  canadianPremierLeague: "10000000-0000-4000-8000-000000000003",
  serieA: "10000000-0000-4000-8000-000000000004",
  ligaMx: "10000000-0000-4000-8000-000000000005",
  j1League: "10000000-0000-4000-8000-000000000006",
  season: "20000000-0000-4000-8000-000000000001",
  matchweek: "30000000-0000-4000-8000-000000000001",
  galatasaray: "40000000-0000-4000-8000-000000000001",
  kasimpasa: "40000000-0000-4000-8000-000000000002",
  fenerbahce: "40000000-0000-4000-8000-000000000003",
  antalyaspor: "40000000-0000-4000-8000-000000000004",
  besiktas: "40000000-0000-4000-8000-000000000005",
  konyaspor: "40000000-0000-4000-8000-000000000006",
  trabzonspor: "40000000-0000-4000-8000-000000000007",
  rizespor: "40000000-0000-4000-8000-000000000008",
  fixtureOne: "50000000-0000-4000-8000-000000000001",
  fixtureTwo: "50000000-0000-4000-8000-000000000002",
  fixtureThree: "50000000-0000-4000-8000-000000000003",
  fixtureFour: "50000000-0000-4000-8000-000000000004",
} as const;

function nextFridayAt19Utc() {
  const date = new Date();
  const daysUntilFriday = (5 - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilFriday);
  date.setUTCHours(19, 0, 0, 0);
  return date;
}

const lockAt = nextFridayAt19Utc().toISOString();
const kickoff = (days: number, hour: number) => {
  const date = new Date(lockAt);
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

async function main() {
 try {
  await sqlClient.begin(async (sql) => {
    await sql`insert into countries (id, name, code) values
      (${ids.turkey}, 'Türkiye', 'TR'), (${ids.england}, 'England', 'GB'),
      (${ids.canada}, 'Canada', 'CA'), (${ids.italy}, 'Italy', 'IT'),
      (${ids.mexico}, 'Mexico', 'MX'), (${ids.japan}, 'Japan', 'JP')
      on conflict (code) do update set name = excluded.name`;

    await sql`insert into leagues (id, provider, provider_external_id, country_id, name, slug, short_name, region, enabled, priority) values
      (${ids.superLig}, 'api-football', '203', ${ids.turkey}, 'Süper Lig', 'super-lig', 'SÜL', 'Europe', true, 1),
      (${ids.premierLeague}, 'seed', 'premier-league', ${ids.england}, 'Premier League', 'premier-league', 'PL', 'Europe', true, 2),
      (${ids.canadianPremierLeague}, 'seed', 'canadian-premier-league', ${ids.canada}, 'Canadian Premier League', 'canadian-premier-league', 'CPL', 'Americas', true, 3),
      (${ids.serieA}, 'seed', 'serie-a', ${ids.italy}, 'Serie A', 'serie-a', 'SA', 'Europe', true, 4),
      (${ids.ligaMx}, 'seed', 'liga-mx', ${ids.mexico}, 'Liga MX', 'liga-mx', 'LMX', 'Americas', true, 5),
      (${ids.j1League}, 'seed', 'j1-league', ${ids.japan}, 'J1 League', 'j1-league', 'J1', 'Asia', true, 6)
      on conflict (slug) do update set name = excluded.name, enabled = excluded.enabled, priority = excluded.priority`;

    await sql`insert into seasons (id, league_id, provider_season, name, start_date, end_date, is_current)
      values (${ids.season}, ${ids.superLig}, '2026', '2026–27', '2026-07-01', '2027-06-30', true)
      on conflict (league_id, provider_season) do update set is_current = true, name = excluded.name`;

    const teamRows = [
      [ids.galatasaray, "645", "Galatasaray", "GS"], [ids.kasimpasa, "1004", "Kasımpaşa", "KAS"],
      [ids.fenerbahce, "611", "Fenerbahçe", "FB"], [ids.antalyaspor, "1005", "Antalyaspor", "ANT"],
      [ids.besiktas, "549", "Beşiktaş", "BJK"], [ids.konyaspor, "607", "Konyaspor", "KON"],
      [ids.trabzonspor, "998", "Trabzonspor", "TS"], [ids.rizespor, "1007", "Rizespor", "RIZ"],
    ] as const;
    for (const [id, externalId, name, shortName] of teamRows) {
      await sql`insert into teams (id, provider, provider_external_id, name, slug, short_name, country_id)
        values (${id}, 'api-football', ${externalId}, ${name}, ${teamSlug(name)}, ${shortName}, ${ids.turkey})
        on conflict (provider, provider_external_id) do update set name = excluded.name, short_name = excluded.short_name`;
    }

    await sql`insert into matchweeks (id, league_id, season_id, provider_round_name, display_name, slug, start_at, lock_at, end_at, status)
      values (${ids.matchweek}, ${ids.superLig}, ${ids.season}, 'Regular Season - 8', 'Matchweek 8', ${matchweekSlugBase(lockAt)}, ${lockAt}, ${lockAt}, ${kickoff(3, 22)}, 'upcoming')
      on conflict (league_id, provider_round_name) do update set start_at = excluded.start_at, lock_at = excluded.lock_at, end_at = excluded.end_at, status = 'upcoming'`;

    const fixtureRows = [
      [ids.fixtureOne, "seed-gal-kas", ids.galatasaray, ids.kasimpasa, kickoff(1, 14)],
      [ids.fixtureTwo, "seed-fen-ant", ids.fenerbahce, ids.antalyaspor, kickoff(1, 17)],
      [ids.fixtureThree, "seed-bes-kon", ids.besiktas, ids.konyaspor, kickoff(2, 16)],
      [ids.fixtureFour, "seed-tra-riz", ids.trabzonspor, ids.rizespor, kickoff(2, 19)],
    ] as const;
    for (const [id, externalId, homeTeamId, awayTeamId, kickoffAt] of fixtureRows) {
      await sql`insert into fixtures (id, provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, last_synced_at)
        values (${id}, 'seed', ${externalId}, ${ids.superLig}, ${ids.season}, ${ids.matchweek}, ${homeTeamId}, ${awayTeamId}, ${kickoffAt}, 'scheduled', now())
        on conflict (provider, provider_external_id) do update set kickoff_at = excluded.kickoff_at, status = excluded.status, last_synced_at = now()`;
    }

    await sql`insert into "user" (id, name, email, email_verified) values
      ('seed-aylin', 'Aylin', 'aylin@seed.leaguecred.local', true),
      ('seed-serhan', 'Serhan', 'serhan@seed.leaguecred.local', true),
      ('seed-efe', 'Efe', 'efe@seed.leaguecred.local', true)
      on conflict (id) do update set name = excluded.name`;

    const specialists = [
      ["seed-aylin", ids.galatasaray, ids.fixtureOne, 48, 9, "0.773873"],
      ["seed-serhan", ids.fenerbahce, ids.fixtureTwo, 40, 9, "0.733187"],
      ["seed-efe", ids.galatasaray, ids.fixtureOne, 27, 7, "0.701330"],
    ] as const;
    for (const [userId, teamId, fixtureId, wins, losses, score] of specialists) {
      await sql`insert into user_league_records (user_id, league_id, wins, losses, settled_picks, tier, confidence_adjusted_accuracy)
        values (${userId}, ${ids.superLig}, ${wins}, ${losses}, ${wins + losses}, 'Expert', ${score})
        on conflict (user_id, league_id) do update set wins = excluded.wins, losses = excluded.losses, settled_picks = excluded.settled_picks, tier = excluded.tier, confidence_adjusted_accuracy = excluded.confidence_adjusted_accuracy`;
      await sql`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
        values (${userId}, ${ids.superLig}, ${ids.matchweek}, 'independent') on conflict do nothing`;
      await sql`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id)
        select ${userId}, ${ids.superLig}, ${ids.season}, ${ids.matchweek}, ${fixtureId}, ${teamId}
        where not exists (
          select 1 from picks where user_id = ${userId} and league_id = ${ids.superLig} and matchweek_id = ${ids.matchweek}
        )`;
    }
  });

  console.info("LeagueCred seed data is ready.");
} finally {
  await sqlClient.end();
 }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
