import type postgres from "postgres";

import { sqlClient } from "@/db";
import type { FixtureProvider, ProviderFixture } from "@/providers/fixtures";
import { teamNamesMatch } from "@/services/team-names";
import { teamSlug } from "@/lib/team-path";

type LeagueConfig = {
  id: string;
  slug: string;
  provider: string;
  provider_external_id: string;
  country_id: string;
  provider_season: string;
  season_id: string;
  season_start_date: string;
  source_external_id: string;
};

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

export async function synchronizeFixtures(provider: FixtureProvider, now = new Date()) {
  const [run] = await sqlClient<Array<{ id: string }>>`
    insert into api_sync_runs (provider, kind) values (${provider.name}, 'fixtures') returning id`;
  if (!run) throw new Error("Could not start fixture sync run.");

  let requestCount = 0;
  try {
    const availableConfigs = await sqlClient<Omit<LeagueConfig, "source_external_id">[]>`
      select l.id, l.slug, l.provider, l.provider_external_id, l.country_id, s.provider_season, s.id as season_id,
        s.start_date as season_start_date
      from leagues l join seasons s on s.league_id = l.id and s.is_current = true
      where l.enabled = true order by l.priority`;
    const sourceIds = provider.competitions
      ? new Map(provider.competitions.map((competition) => [competition.leagueSlug, competition.externalId]))
      : null;
    const configs: LeagueConfig[] = availableConfigs
      .filter((config) => sourceIds ? sourceIds.has(config.slug) : config.provider === provider.name)
      .map((config) => ({
        ...config,
        source_external_id: sourceIds?.get(config.slug) ?? config.provider_external_id,
      }));
    // Keep completed fixtures from the current season for the read-only matchweek history.
    // The league page still renders only its immediate upcoming matchweek as selectable.
    const to = new Date(now); to.setUTCDate(to.getUTCDate() + 90);

    // Complete external requests concurrently and before opening write transactions.
    const fetched = await Promise.all(configs.map(async (config) => ({
      config,
      batch: await provider.fetchFixtures({
        leagueExternalId: config.source_external_id,
        season: config.provider_season,
        from: config.season_start_date,
        to: isoDate(to),
      }),
    })));
    requestCount = fetched.reduce((total, entry) => total + entry.batch.requestCount, 0);

    for (const { config, batch } of fetched) {
      // Persist completed current-season results and only the immediate next upcoming
      // matchweek. This bounds schedule writes while preserving the result history.
      const nextFixture = batch.fixtures
        .filter((fixture) => fixture.status === "scheduled" && Date.parse(fixture.kickoffAt) >= now.getTime())
        .toSorted((left, right) => Date.parse(left.kickoffAt) - Date.parse(right.kickoffAt))[0];
      const relevantFixtures = batch.fixtures.filter((fixture) =>
        fixture.status !== "scheduled" || fixture.round === nextFixture?.round,
      );
      const rounds = Map.groupBy(relevantFixtures, (fixture) => fixture.round);
      for (const [round, fixtures] of rounds) await synchronizeRound(provider.name, config, round, fixtures);
    }

    await sqlClient`update api_sync_runs set status = 'succeeded', request_count = ${requestCount}, finished_at = now() where id = ${run.id}`;
    return { requestCount };
  } catch (error) {
    await sqlClient`update api_sync_runs set status = 'failed', request_count = ${requestCount}, finished_at = now(), error = ${String(error)} where id = ${run.id}`;
    throw error;
  }
}

async function synchronizeRound(providerName: string, config: LeagueConfig, round: string, incoming: ProviderFixture[]) {
  if (incoming.length === 0) return;
  const ordered = incoming.toSorted((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt));
  const startAt = ordered[0].kickoffAt;
  const endAt = new Date(Date.parse(ordered.at(-1)!.kickoffAt) + 3 * 60 * 60 * 1000).toISOString();

  await sqlClient.begin(async (sql) => {
    const newFixtures: ProviderFixture[] = [];
    for (const fixture of ordered) {
      const [existing] = await sql<Array<{
        id: string;
        home_team_id: string;
        away_team_id: string;
        matchweek_frozen: boolean;
      }>>`
        select f.id, f.home_team_id, f.away_team_id,
          (mw.status <> 'upcoming' or exists(
            select 1 from matchweek_participation mp where mp.matchweek_id = mw.id
          )) as matchweek_frozen
        from fixtures f join matchweeks mw on mw.id = f.matchweek_id
        where f.provider = ${providerName} and f.provider_external_id = ${fixture.externalId}
        for update of f`;
      if (!existing) {
        newFixtures.push(fixture);
        continue;
      }
      const homeId = existing.matchweek_frozen
        ? existing.home_team_id
        : await resolveTeam(sql, providerName, fixture.home, config);
      const awayId = existing.matchweek_frozen
        ? existing.away_team_id
        : await resolveTeam(sql, providerName, fixture.away, config);
      const winnerId = fixture.winnerExternalId === fixture.home.externalId
        ? homeId
        : fixture.winnerExternalId === fixture.away.externalId ? awayId : null;
      await sql`update fixtures set
        kickoff_at = case when ${existing.matchweek_frozen} then kickoff_at else ${fixture.kickoffAt} end,
        home_team_id = ${homeId}, away_team_id = ${awayId},
        status = ${fixture.status}, home_score = ${fixture.homeScore}, away_score = ${fixture.awayScore},
        winner_team_id = ${winnerId}, last_synced_at = now(), updated_at = now()
        where id = ${existing.id}`;
    }
    if (newFixtures.length === 0) return;

    let [matchweek] = await sql<Array<{ id: string; status: string; has_participation: boolean }>>`
      select mw.id, mw.status, exists(select 1 from matchweek_participation mp where mp.matchweek_id = mw.id) as has_participation
      from matchweeks mw where mw.league_id = ${config.id} and mw.provider_round_name = ${round} for update`;
    if (!matchweek) {
      [matchweek] = await sql<Array<{ id: string; status: string; has_participation: boolean }>>`
        insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at, status)
        values (${config.id}, ${config.season_id}, ${round}, ${round}, ${startAt}, ${startAt}, ${endAt}, 'upcoming')
        returning id, status, false as has_participation`;
    }
    if (!matchweek) throw new Error("Could not upsert matchweek.");
    const frozen = matchweek.status !== "upcoming" || matchweek.has_participation;
    if (frozen) return;
    await sql`update matchweeks set start_at = ${startAt}, lock_at = ${startAt}, end_at = ${endAt}, updated_at = now() where id = ${matchweek.id}`;

    for (const fixture of newFixtures) {
      const homeId = await resolveTeam(sql, providerName, fixture.home, config);
      const awayId = await resolveTeam(sql, providerName, fixture.away, config);
      const winnerId = fixture.winnerExternalId === fixture.home.externalId ? homeId : fixture.winnerExternalId === fixture.away.externalId ? awayId : null;
      await sql`insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, winner_team_id, last_synced_at)
        values (${providerName}, ${fixture.externalId}, ${config.id}, ${config.season_id}, ${matchweek.id}, ${homeId}, ${awayId}, ${fixture.kickoffAt}, ${fixture.status}, ${fixture.homeScore}, ${fixture.awayScore}, ${winnerId}, now())
        on conflict (provider, provider_external_id) do nothing`;
    }
  });
}

async function resolveTeam(
  sql: postgres.TransactionSql,
  providerName: string,
  team: ProviderFixture["home"],
  config: LeagueConfig,
) {
  let [row] = await sql<Array<{ id: string }>>`
    select alias.team_id as id
    from team_provider_aliases alias
    join league_team_memberships membership
      on membership.team_id = alias.team_id
      and membership.league_id = ${config.id}
      and membership.season_id = ${config.season_id}
    where alias.provider = ${providerName}
      and alias.provider_external_id = ${team.externalId}`;

  if (!row) {
    [row] = await sql<Array<{ id: string }>>`
      select t.id from teams t
      join league_team_memberships ltm
        on ltm.team_id = t.id and ltm.league_id = ${config.id} and ltm.season_id = ${config.season_id}
      where lower(t.name) = lower(${team.name})
      order by t.created_at asc
      limit 1`;
  }

  if (!row) {
    const currentTeams = await sql<Array<{ id: string; name: string }>>`
      select t.id, t.name from teams t
      join league_team_memberships ltm
        on ltm.team_id = t.id and ltm.league_id = ${config.id} and ltm.season_id = ${config.season_id}`;
    const matches = currentTeams.filter((candidate) => teamNamesMatch(candidate.name, team.name));
    if (matches.length === 1) row = matches[0];
  }

  if (!row) {
    [row] = await sql<Array<{ id: string }>>`
      select team_id as id from team_provider_aliases
      where provider = ${providerName} and provider_external_id = ${team.externalId}`;
  }

  if (!row) {
    [row] = await sql<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, slug, short_name, logo_url, logo_provider, country_id)
      values (${providerName}, ${team.externalId}, ${team.name}, ${teamSlug(team.name)}, ${team.shortName}, ${team.logoUrl}, ${team.logoUrl ? providerName : null}, ${config.country_id})
      on conflict (provider, provider_external_id) do update
      set name = excluded.name, short_name = excluded.short_name,
          logo_url = coalesce(excluded.logo_url, teams.logo_url),
          logo_provider = coalesce(excluded.logo_provider, teams.logo_provider), updated_at = now()
      returning id`;
  }
  if (!row) throw new Error("Could not resolve team.");

  await sql`insert into team_provider_aliases (provider, provider_external_id, team_id, source_name)
    values (${providerName}, ${team.externalId}, ${row.id}, ${team.name})
    on conflict (provider, provider_external_id) do update
    set team_id = excluded.team_id, source_name = excluded.source_name, updated_at = now()`;
  await sql`insert into league_team_memberships (league_id, season_id, team_id, source_provider, source_scope)
    values (${config.id}, ${config.season_id}, ${row.id}, ${providerName}, 'fixture-feed')
    on conflict (league_id, season_id, team_id) do update
    set source_provider = excluded.source_provider, source_scope = excluded.source_scope, updated_at = now()`;

  return row.id;
}
