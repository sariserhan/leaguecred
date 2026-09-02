import { fixtureWindowStart } from "@/lib/fixture-window";
import type postgres from "postgres";

import { sqlClient } from "@/db";
import type { FixtureProvider, ProviderFixture } from "@/providers/fixtures";
import { teamNamesMatch } from "@/services/team-names";
import { teamSlug } from "@/lib/team-path";

type LeagueConfig = {
  id: string;
  slug: string;
  name: string;
  provider: string;
  provider_external_id: string;
  country_id: string;
  region: string;
  country_is_region: boolean;
  provider_season: string;
  season_id: string;
  season_start_date: string;
  sport: string;
  source_external_id: string;
};

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

export async function synchronizeFixtures(provider: FixtureProvider, now = new Date(), leagueSlug?: string) {
  const [run] = await sqlClient<Array<{ id: string }>>`
    insert into api_sync_runs (provider, kind)
    values (${provider.name}, ${leagueSlug ? `fixtures:${leagueSlug}` : "fixtures"}) returning id`;
  if (!run) throw new Error("Could not start fixture sync run.");

  let requestCount = 0;
  let created = 0;
  let updated = 0;
  let lateAdded = 0;
  let adopted = 0;
  const faults: string[] = [];
  try {
    const availableConfigs = await sqlClient<Omit<LeagueConfig, "source_external_id">[]>`
      select l.id, l.slug, l.name, l.provider, l.provider_external_id, l.country_id, l.region,
        c.is_region as country_is_region, s.provider_season, s.id as season_id,
        s.start_date as season_start_date, l.sport
      from leagues l
      join countries c on c.id = l.country_id
      join seasons s on s.league_id = l.id and s.is_current = true
      where l.enabled = true order by l.priority`;
    const sourceIds = provider.competitions
      ? new Map(provider.competitions.map((competition) => [competition.leagueSlug, competition.externalId]))
      : null;
    const configs: LeagueConfig[] = availableConfigs
      .filter((config) => (sourceIds ? sourceIds.has(config.slug) : config.provider === provider.name) && (!leagueSlug || config.slug === leagueSlug))
      .map((config) => ({
        ...config,
        source_external_id: sourceIds?.get(config.slug) ?? config.provider_external_id,
      }));
    // Keep completed fixtures from the current season for the read-only matchweek history.
    // The league page still renders only its immediate upcoming matchweek as selectable.
    const to = new Date(now); to.setUTCDate(to.getUTCDate() + 90);

    // Complete external requests concurrently and before opening write transactions.
    //
    // One league's request failing must not cost the other twenty-two theirs.
    // These all go to the same provider at the same moment, so a rate limit or
    // a single flaky competition is ordinary rather than exceptional - and
    // rejecting the lot meant a whole-schedule refresh wrote nothing at all and
    // reported only that it could not be done.
    const fetched = await Promise.all(configs.map(async (config) => {
      try {
        return {
          config,
          batch: await provider.fetchFixtures({
            leagueExternalId: config.source_external_id,
            season: config.provider_season,
            from: fixtureWindowStart({
              sport: config.sport,
              seasonStartDate: config.season_start_date,
              now,
            }),
            to: isoDate(to),
          }),
        };
      } catch (error) {
        faults.push(`${config.slug}: ${String(error)}`);
        return { config, batch: null };
      }
    }));
    requestCount = fetched.reduce((total, entry) => total + (entry.batch?.requestCount ?? 0), 0);

    for (const { config, batch } of fetched) {
      if (!batch) continue;
      // Writing is fenced off per league for the same reason fetching is: one
      // competition's data being unwritable - a club colliding with one another
      // league already recorded, say - must not throw away the work of the
      // other twenty-two, which by this point has already been fetched.
      try {
        // Persist completed current-season results and only the immediate next upcoming
        // matchweek. This bounds schedule writes while preserving the result history.
        const nextFixture = batch.fixtures
          .filter((fixture) => fixture.status === "scheduled" && Date.parse(fixture.kickoffAt) >= now.getTime())
          .toSorted((left, right) => Date.parse(left.kickoffAt) - Date.parse(right.kickoffAt))[0];
        const relevantFixtures = batch.fixtures.filter((fixture) =>
          fixture.status !== "scheduled" || fixture.round === nextFixture?.round,
        );
        const rounds = Map.groupBy(relevantFixtures, (fixture) => fixture.round);
        for (const [round, fixtures] of rounds) {
          const counts = await synchronizeRound(provider.name, config, round, fixtures);
          created += counts.created;
          updated += counts.updated;
          lateAdded += counts.lateAdded;
          adopted += counts.adopted;
        }
      } catch (error) {
        faults.push(`${config.slug}: ${String(error)}`);
      }
    }

    const summary = { leagues: configs.length - faults.length, created, updated, lateAdded, adopted };
    await sqlClient`update api_sync_runs set status = ${faults.length ? "failed" : "succeeded"},
      request_count = ${requestCount}, finished_at = now(),
      details = ${JSON.stringify({ ...summary, faulted: faults.length })}::jsonb,
      error = ${faults.length ? faults.join(" | ") : null} where id = ${run.id}`;
    return { requestCount, ...summary, faults };
  } catch (error) {
    await sqlClient`update api_sync_runs set status = 'failed', request_count = ${requestCount}, finished_at = now(), error = ${String(error)} where id = ${run.id}`;
    throw error;
  }
}

type RoundCounts = { created: number; updated: number; lateAdded: number; adopted: number };

const NO_CHANGES: RoundCounts = { created: 0, updated: 0, lateAdded: 0, adopted: 0 };

async function synchronizeRound(providerName: string, config: LeagueConfig, round: string, incoming: ProviderFixture[]): Promise<RoundCounts> {
  if (incoming.length === 0) return NO_CHANGES;
  const ordered = incoming.toSorted((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt));
  const startAt = ordered[0].kickoffAt;
  const endAt = new Date(Date.parse(ordered.at(-1)!.kickoffAt) + 3 * 60 * 60 * 1000).toISOString();

  return sqlClient.begin(async (sql): Promise<RoundCounts> => {
    let created = 0;
    let updated = 0;
    let adopted = 0;
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
      updated += 1;
    }
    if (newFixtures.length === 0) return { created, updated, lateAdded: 0, adopted };

    // A fixture is keyed by (provider, provider_external_id), so the lookup
    // above only finds this provider's own rows. Several providers cover most
    // of these leagues, and without this each one records its own copy of every
    // match — counting twice in the standings — and files it under its own
    // matchweek, splitting one real gameweek in two. Whoever recorded the match
    // first keeps it. Resolving this before the matchweek matters: a round that
    // is already fully covered must not leave an empty matchweek behind.
    const creatable: Array<{ fixture: ProviderFixture; homeId: string; awayId: string }> = [];
    for (const fixture of newFixtures) {
      const homeId = await resolveTeam(sql, providerName, fixture.home, config);
      const awayId = await resolveTeam(sql, providerName, fixture.away, config);
      const [alreadyRecorded] = await sql<Array<{ id: string; provider: string; status: string; home_score: number | null; away_score: number | null }>>`
        select id, provider, status, home_score, away_score from fixtures
        where league_id = ${config.id} and season_id = ${config.season_id}
          and home_team_id = ${homeId} and away_team_id = ${awayId}
          and date(kickoff_at) = date(${fixture.kickoffAt}::timestamptz)
        limit 1`;

      if (!alreadyRecorded) {
        creatable.push({ fixture, homeId, awayId });
        continue;
      }

      // Whoever recorded the match keeps it, but the score still has to reach
      // it. Providers have come and gone from this schedule and only one syncs
      // now, so a row another provider wrote was skipped here and updated
      // nowhere else: it sat at "scheduled" for ever, never settling and never
      // appearing on a team page, which shows a past match only once it has
      // finished. The row keeps its own identity and kickoff; only what the
      // match did is taken.
      const changed = alreadyRecorded.status !== fixture.status
        || alreadyRecorded.home_score !== fixture.homeScore
        || alreadyRecorded.away_score !== fixture.awayScore;
      if (!changed) continue;

      const winnerId = fixture.winnerExternalId === fixture.home.externalId
        ? homeId
        : fixture.winnerExternalId === fixture.away.externalId ? awayId : null;
      await sql`update fixtures set
        status = ${fixture.status}, home_score = ${fixture.homeScore}, away_score = ${fixture.awayScore},
        winner_team_id = ${winnerId}, last_synced_at = now(), updated_at = now()
        where id = ${alreadyRecorded.id}`;
      adopted += 1;
    }
    if (creatable.length === 0) return { created, updated, lateAdded: 0, adopted };

    let [matchweek] = await sql<Array<{ id: string; status: string; has_participation: boolean }>>`
      select mw.id, mw.status, exists(select 1 from matchweek_participation mp where mp.matchweek_id = mw.id) as has_participation
      from matchweeks mw where mw.league_id = ${config.id} and mw.provider_round_name = ${round} for update`;

    // Each provider names rounds its own way, so keying a matchweek on that name
    // gave one real gameweek a separate week per provider, each holding part of
    // the fixtures. A Daily Lock belongs to a matchweek, so that let a player
    // lock twice in the same week. A round that lands on an existing week joins
    // it instead; the one it overlaps most, since consecutive weeks share a
    // boundary day when a round runs long.
    if (!matchweek) {
      [matchweek] = await sql<Array<{ id: string; status: string; has_participation: boolean }>>`
        select mw.id, mw.status, exists(select 1 from matchweek_participation mp where mp.matchweek_id = mw.id) as has_participation
        from matchweeks mw
        where mw.league_id = ${config.id} and mw.season_id = ${config.season_id}
          and mw.start_at < ${endAt}::timestamptz and ${startAt}::timestamptz < mw.end_at
          -- Joining widens the week, which makes it a larger target for the next
          -- round, which widens it again. Liga Portugal reached thirteen days and
          -- two gameweeks that way. A week that would end up longer than a
          -- gameweek is not the week this round belongs to.
          and greatest(mw.end_at, ${endAt}::timestamptz)
              - least(mw.start_at, ${startAt}::timestamptz) < interval '10 days'
          -- Only ever join a week another provider opened. This provider's own
          -- consecutive rounds overlap whenever one runs long, and folding those
          -- together would merge two real gameweeks into one.
          and (case when mw.provider_round_name like '%:%'
                then split_part(mw.provider_round_name, ':', 1) else 'default' end)
              <> (case when ${round} like '%:%'
                then split_part(${round}, ':', 1) else 'default' end)
        order by least(mw.end_at, ${endAt}::timestamptz) - greatest(mw.start_at, ${startAt}::timestamptz) desc
        limit 1
        for update`;
    }

    if (!matchweek) {
      const [week] = await sql<Array<{ number: number }>>`
        select count(*)::int + 1 as number from matchweeks
        where league_id = ${config.id} and season_id = ${config.season_id} and start_at < ${startAt}::timestamptz`;
      const displayName = `${config.name} — Week ${week?.number ?? 1}`;
      [matchweek] = await sql<Array<{ id: string; status: string; has_participation: boolean }>>`
        insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at, status)
        values (${config.id}, ${config.season_id}, ${round}, ${displayName}, ${startAt}, ${startAt}, ${endAt}, 'upcoming')
        returning id, status, false as has_participation`;
    }
    if (!matchweek) throw new Error("Could not upsert matchweek.");

    // A week is frozen once it has locked, settled, or taken anyone's pick.
    // These fixtures are still written to it. Dropping them - which is what
    // used to happen here - left the match nowhere at all: not in the schedule,
    // not in the results, and beyond the reach of every later job, so the
    // league looked as though the provider had forgotten a match that was
    // played. A late arrival in a week people are already in is a real cost,
    // but it is a smaller one than losing the match, and it is counted so an
    // operator can see it happen.
    const frozen = matchweek.status !== "upcoming" || matchweek.has_participation;

    // The week's own dates only move while it is still open. Widening a locked
    // week would drag its deadline backwards under players who already picked
    // against it; end_at moves either way, since that is only the window the
    // week is displayed and matched over.
    await sql`update matchweeks set
      start_at = case when ${frozen} then start_at else least(start_at, ${startAt}::timestamptz) end,
      lock_at = case when ${frozen} then lock_at else least(lock_at, ${startAt}::timestamptz) end,
      end_at = greatest(end_at, ${endAt}::timestamptz),
      updated_at = now()
      where id = ${matchweek.id}`;

    for (const { fixture, homeId, awayId } of creatable) {
      const winnerId = fixture.winnerExternalId === fixture.home.externalId ? homeId : fixture.winnerExternalId === fixture.away.externalId ? awayId : null;
      await sql`insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, home_score, away_score, winner_team_id, last_synced_at)
        values (${providerName}, ${fixture.externalId}, ${config.id}, ${config.season_id}, ${matchweek.id}, ${homeId}, ${awayId}, ${fixture.kickoffAt}, ${fixture.status}, ${fixture.homeScore}, ${fixture.awayScore}, ${winnerId}, now())
        on conflict (provider, provider_external_id) do nothing`;
      created += 1;
    }

    return { created, updated, lateAdded: frozen ? creatable.length : 0, adopted };
  });
}

/**
 * A slug no other club has taken.
 *
 * Slugs are unique across every league, and every lookup in resolveTeam is
 * scoped to one league's membership, so a club genuinely new to us can still
 * want a name another league's club already holds - Liverpool of Montevideo
 * beside Liverpool of England. That collision aborted the whole sync with a
 * constraint violation and wrote nothing anywhere. The newcomer takes a
 * qualified slug instead: its country first, since that is the distinction a
 * reader would draw themselves, and a number only if that is taken too.
 */
async function freeTeamSlug(sql: postgres.TransactionSql, name: string, config: LeagueConfig) {
  const base = teamSlug(name);
  const taken = new Set((await sql<Array<{ slug: string }>>`
    select slug from teams where slug = ${base} or slug like ${`${base}-%`}`).map((row) => row.slug));
  if (!taken.has(base)) return base;

  const [country] = config.country_is_region
    ? []
    : await sql<Array<{ code: string }>>`select code from countries where id = ${config.country_id}`;

  const candidate = [
    ...(country ? [`${base}-${country.code.toLowerCase()}`] : []),
    ...Array.from({ length: 50 }, (_, index) => `${base}-${index + 2}`),
  ].find((option) => !taken.has(option));
  if (!candidate) throw new Error(`Could not find a free slug for ${name}.`);

  return candidate;
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

  // Every lookup above is scoped to this league's own membership. A continental
  // competition has no membership yet on the first sync, so its clubs — which
  // already exist under their domestic league — matched nothing and were
  // inserted a second time, stamped with the competition's region as a country.
  // Match across the domestic leagues of the same region instead. Holding it to
  // one region is what keeps unrelated clubs that share a name apart: Liverpool
  // of Montevideo plays the Libertadores, not the Champions League.
  if (!row && config.country_is_region) {
    const regionTeams = await sql<Array<{ id: string; name: string }>>`
      select distinct t.id, t.name from teams t
      join league_team_memberships ltm on ltm.team_id = t.id
      join leagues l on l.id = ltm.league_id and l.enabled = true and l.region = ${config.region}
      join countries c on c.id = l.country_id and c.is_region = false`;
    const matches = regionTeams.filter((candidate) => teamNamesMatch(candidate.name, team.name));
    // Anything but a single club is ambiguous, and guessing would merge two.
    if (new Set(matches.map((match) => match.id)).size === 1) row = matches[0];
  }

  if (!row) {
    [row] = await sql<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, slug, short_name, logo_url, logo_provider, country_id)
      values (${providerName}, ${team.externalId}, ${team.name}, ${await freeTeamSlug(sql, team.name, config)}, ${team.shortName}, ${team.logoUrl}, ${team.logoUrl ? providerName : null}, ${config.country_is_region ? null : config.country_id})
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
