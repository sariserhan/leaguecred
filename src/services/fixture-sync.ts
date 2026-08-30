import type postgres from "postgres";

import { sqlClient } from "@/db";
import type { FixtureProvider, ProviderFixture } from "@/providers/fixtures";

type LeagueConfig = { id: string; provider_external_id: string; country_id: string; provider_season: string; season_id: string };

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

export async function synchronizeFixtures(provider: FixtureProvider, now = new Date()) {
  const [run] = await sqlClient<Array<{ id: string }>>`
    insert into api_sync_runs (provider, kind) values (${provider.name}, 'fixtures') returning id`;
  if (!run) throw new Error("Could not start fixture sync run.");

  let requestCount = 0;
  try {
    const configs = await sqlClient<LeagueConfig[]>`
      select l.id, l.provider_external_id, l.country_id, s.provider_season, s.id as season_id
      from leagues l join seasons s on s.league_id = l.id and s.is_current = true
      where l.enabled = true and l.provider = ${provider.name} order by l.priority`;
    const to = new Date(now); to.setUTCDate(to.getUTCDate() + 14);

    for (const config of configs) {
      const batch = await provider.fetchFixtures({ leagueExternalId: config.provider_external_id, season: config.provider_season, from: isoDate(now), to: isoDate(to) });
      requestCount += batch.requestCount;
      const rounds = Map.groupBy(batch.fixtures, (fixture) => fixture.round);
      for (const [round, fixtures] of rounds) await synchronizeRound(config, round, fixtures, now);
    }

    await sqlClient`update api_sync_runs set status = 'succeeded', request_count = ${requestCount}, finished_at = now() where id = ${run.id}`;
    return { requestCount };
  } catch (error) {
    await sqlClient`update api_sync_runs set status = 'failed', request_count = ${requestCount}, finished_at = now(), error = ${String(error)} where id = ${run.id}`;
    throw error;
  }
}

async function synchronizeRound(config: LeagueConfig, round: string, incoming: ProviderFixture[], now: Date) {
  if (incoming.length === 0) return;
  const ordered = incoming.toSorted((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt));
  const startAt = ordered[0].kickoffAt;
  const endAt = new Date(Date.parse(ordered.at(-1)!.kickoffAt) + 3 * 60 * 60 * 1000).toISOString();

  await sqlClient.begin(async (sql) => {
    let [matchweek] = await sql<Array<{ id: string; lock_at: Date; status: string; has_participation: boolean }>>`
      select mw.id, mw.lock_at, mw.status, exists(select 1 from matchweek_participation mp where mp.matchweek_id = mw.id) as has_participation
      from matchweeks mw where mw.league_id = ${config.id} and mw.provider_round_name = ${round} for update`;
    if (!matchweek) {
      [matchweek] = await sql<Array<{ id: string; lock_at: Date; status: string; has_participation: boolean }>>`
        insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at, status)
        values (${config.id}, ${config.season_id}, ${round}, ${round}, ${startAt}, ${startAt}, ${endAt}, 'upcoming')
        returning id, lock_at, status, false as has_participation`;
    }
    if (!matchweek) throw new Error("Could not upsert matchweek.");
    const frozen = matchweek.status !== "upcoming" || matchweek.has_participation || new Date(matchweek.lock_at) <= now;
    if (!frozen) {
      await sql`update matchweeks set start_at = ${startAt}, lock_at = ${startAt}, end_at = ${endAt}, updated_at = now() where id = ${matchweek.id}`;
    }

    for (const fixture of ordered) {
      const homeId = await upsertTeam(sql, fixture.home, config.country_id);
      const awayId = await upsertTeam(sql, fixture.away, config.country_id);
      const winnerId = fixture.winnerExternalId === fixture.home.externalId ? homeId : fixture.winnerExternalId === fixture.away.externalId ? awayId : null;
      if (frozen) {
        await sql`update fixtures set status = ${fixture.status}, home_score = ${fixture.homeScore}, away_score = ${fixture.awayScore}, winner_team_id = ${winnerId}, last_synced_at = now(), updated_at = now()
          where provider = 'api-football' and provider_external_id = ${fixture.externalId} and matchweek_id = ${matchweek.id}`;
      } else {
        await sql`insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, winner_team_id, last_synced_at)
          values ('api-football', ${fixture.externalId}, ${config.id}, ${config.season_id}, ${matchweek.id}, ${homeId}, ${awayId}, ${fixture.kickoffAt}, ${fixture.status}, ${fixture.homeScore}, ${fixture.awayScore}, ${winnerId}, now())
          on conflict (provider, provider_external_id) do update set status = excluded.status, home_score = excluded.home_score, away_score = excluded.away_score, winner_team_id = excluded.winner_team_id, kickoff_at = excluded.kickoff_at, last_synced_at = now(), updated_at = now()`;
      }
    }
  });
}

async function upsertTeam(sql: postgres.TransactionSql, team: ProviderFixture["home"], countryId: string) {
  const [row] = await sql<Array<{ id: string }>>`
    insert into teams (provider, provider_external_id, name, short_name, logo_url, logo_provider, country_id)
    values ('api-football', ${team.externalId}, ${team.name}, ${team.shortName}, ${team.logoUrl}, 'api-football', ${countryId})
    on conflict (provider, provider_external_id) do update set name = excluded.name, short_name = excluded.short_name, logo_url = excluded.logo_url, logo_provider = excluded.logo_provider, updated_at = now()
    returning id`;
  if (!row) throw new Error("Could not upsert team.");
  return row.id;
}
