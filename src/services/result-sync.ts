import { sqlClient } from "@/db";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import type { FixtureProvider, ProviderFixture } from "@/providers/fixtures";

/**
 * How far back a still-unfinished fixture is worth asking about. A match whose
 * kickoff was days ago and which the provider never marked finished is a
 * schedule problem, not a score problem, and the nightly full sync is what
 * repairs those.
 */
const LOOKBACK_DAYS = 3;

type PendingFixture = {
  id: string;
  provider: string;
  provider_external_id: string;
  home_team_id: string;
  away_team_id: string;
  kickoff_at: Date;
  status: string;
  home_score: number | null;
  away_score: number | null;
  league_slug: string;
  provider_season: string;
};

function isoDate(date: Date | string) { return new Date(date).toISOString().slice(0, 10); }

/** A match is the same match whoever recorded it: these two clubs, on this day. */
function matchKey(homeTeamId: string, awayTeamId: string, kickoff: Date | string) {
  return `${homeTeamId}|${awayTeamId}|${isoDate(kickoff)}`;
}

/**
 * Our team ids for the clubs in a provider's payload, by the provider's own ids.
 */
async function resolveTeamIds(providerName: string, fixtures: readonly ProviderFixture[]) {
  const externalIds = [...new Set(fixtures.flatMap((fixture) => [fixture.home.externalId, fixture.away.externalId]))];
  if (externalIds.length === 0) return new Map<string, string>();

  const rows = await sqlClient<Array<{ provider_external_id: string; team_id: string }>>`
    select provider_external_id, team_id from team_provider_aliases
    where provider = ${providerName} and provider_external_id = any(${externalIds})`;

  return new Map(rows.map((row) => [row.provider_external_id, row.team_id]));
}

/**
 * Scores for matches already on the schedule, and nothing else.
 *
 * The nightly `synchronizeFixtures` exists to build the schedule: it resolves
 * clubs, creates fixtures, and opens matchweeks, which is why it asks every
 * league for a season-wide window whether or not anything has been played.
 * A schedule barely changes; a score changes the moment a match ends. So this
 * job starts from the fixtures already in the database that are still waiting
 * on a result, asks only the leagues those belong to, and only for the days
 * they were played on. Nothing is inserted and no matchweek is touched — an
 * unrecognised match here is simply one this job has no business creating.
 *
 * A stored fixture is matched by the provider's own id where it has one, and
 * otherwise by the two clubs and the day. Several providers have written into
 * this schedule over its life and only ESPN still syncs, so a row another
 * provider recorded would otherwise sit at "scheduled" for ever: never scored,
 * never settled, and invisible on a team page, which shows a past match only
 * once it has finished.
 *
 * With nothing pending it makes no request at all, which is what makes it
 * cheap enough to run every hour.
 */
export async function synchronizeMatchResults(
  provider: FixtureProvider = new EspnFixtureProvider(),
  now = new Date(),
  leagueSlug?: string,
  /**
   * Ask the provider about a named league even when nothing is pending, purely
   * to report matches it has that the schedule does not. Off for the hourly
   * cron - a quiet hour should cost nothing - and on when an operator presses
   * the button for one league, since "nothing was waiting" and "the match was
   * never recorded" look identical from the outside and want telling apart.
   */
  probeMissing = false,
) {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Recorded before the work, and recorded even when there is none. A pull that
  // found nothing waiting is the normal answer between matchdays, and it is
  // also what an admin sees when they press the button and nothing visibly
  // happens - so it belongs in the sync-run log rather than nowhere.
  const [run] = await sqlClient<Array<{ id: string }>>`
    insert into api_sync_runs (provider, kind) values (${provider.name}, ${leagueSlug ? `results:${leagueSlug}` : "results"}) returning id`;
  if (!run) throw new Error("Could not start result sync run.");

  const pending = await sqlClient<PendingFixture[]>`
    select f.id, f.provider, f.provider_external_id, f.home_team_id, f.away_team_id, f.kickoff_at,
      f.status, f.home_score, f.away_score, l.slug as league_slug, s.provider_season
    from fixtures f
    join leagues l on l.id = f.league_id
    join seasons s on s.id = f.season_id
    where f.status in ('scheduled', 'live')
      and f.kickoff_at <= ${now.toISOString()}::timestamptz
      and f.kickoff_at >= ${since.toISOString()}::timestamptz
      ${leagueSlug ? sqlClient`and l.slug = ${leagueSlug}` : sqlClient``}
    order by f.kickoff_at`;

  if (pending.length === 0) {
    const probe = probeMissing && leagueSlug
      ? await countMissingFixtures(provider, leagueSlug, since, now)
      : { missing: 0, requestCount: 0, faults: [] as string[] };

    await sqlClient`update api_sync_runs set status = ${probe.faults.length ? "failed" : "succeeded"},
      request_count = ${probe.requestCount}, finished_at = now(),
      error = ${probe.faults.length ? probe.faults.join(" | ") : null} where id = ${run.id}`;

    return {
      pending: 0, leagues: 0, requestCount: probe.requestCount, updated: 0, finished: 0,
      adopted: 0, missing: probe.missing, faults: probe.faults,
    };
  }

  const sourceIds = new Map((provider.competitions ?? []).map((competition) => [competition.leagueSlug, competition.externalId]));
  const byLeague = Map.groupBy(pending, (fixture) => fixture.league_slug);

  let requestCount = 0;
  let updated = 0;
  let finished = 0;
  let adopted = 0;
  let missing = 0;
  const faults: string[] = [];

  try {
    // One league being down must not cost the others their results, so each
    // league is fetched and recorded on its own.
    const batches = await Promise.all([...byLeague].map(async ([slug, fixtures]) => {
      const leagueExternalId = sourceIds.get(slug);
      if (!leagueExternalId) return { slug, fixtures, batch: null, error: `No ${provider.name} competition is mapped to ${slug}.` };

      const kickoffs = fixtures.map((fixture) => new Date(fixture.kickoff_at).getTime());
      // A kickoff is stored in UTC and the provider's day boundary is its own,
      // so the window is padded by a day at each end rather than assuming they
      // agree about which date a late Sunday match belongs to.
      const from = new Date(Math.min(...kickoffs) - 24 * 60 * 60 * 1000);
      const to = new Date(Math.max(...kickoffs) + 24 * 60 * 60 * 1000);

      try {
        return {
          slug,
          fixtures,
          batch: await provider.fetchFixtures({
            leagueExternalId,
            season: fixtures[0].provider_season,
            from: isoDate(from),
            to: isoDate(to),
          }),
          error: null,
        };
      } catch (error) {
        return { slug, fixtures, batch: null, error: `${slug}: ${String(error)}` };
      }
    }));

    for (const { slug, fixtures, batch, error } of batches) {
      if (error) { faults.push(error); continue; }
      requestCount += batch?.requestCount ?? 0;

      const incoming = batch?.fixtures ?? [];
      const byExternalId = new Map(incoming.map((fixture) => [fixture.externalId, fixture]));
      const teamIds = await resolveTeamIds(provider.name, incoming);
      const byMatch = new Map(incoming.flatMap((fixture) => {
        const homeId = teamIds.get(fixture.home.externalId);
        const awayId = teamIds.get(fixture.away.externalId);
        return homeId && awayId ? [[matchKey(homeId, awayId, fixture.kickoffAt), fixture] as const] : [];
      }));

      for (const stored of fixtures) {
        const fresh = stored.provider === provider.name
          ? byExternalId.get(stored.provider_external_id)
          : byMatch.get(matchKey(stored.home_team_id, stored.away_team_id, stored.kickoff_at));
        if (!fresh) continue;
        // Writing an unchanged row would only churn updated_at, and most hourly
        // runs find a match that has not kicked off any further along.
        if (fresh.status === stored.status && fresh.homeScore === stored.home_score && fresh.awayScore === stored.away_score) continue;

        const winnerId = fresh.winnerExternalId === fresh.home.externalId
          ? stored.home_team_id
          : fresh.winnerExternalId === fresh.away.externalId ? stored.away_team_id : null;

        await sqlClient`update fixtures set
          status = ${fresh.status}, home_score = ${fresh.homeScore}, away_score = ${fresh.awayScore},
          winner_team_id = ${winnerId}, last_synced_at = now(), updated_at = now()
          where id = ${stored.id}`;
        updated += 1;
        if (fresh.status === "finished") finished += 1;
        if (stored.provider !== provider.name) adopted += 1;
      }

      missing += await countUnrecorded(slug, incoming, teamIds, provider.name, now);
    }

    await sqlClient`update api_sync_runs set status = ${faults.length ? "failed" : "succeeded"},
      request_count = ${requestCount}, finished_at = now(), error = ${faults.length ? faults.join(" | ") : null}
      where id = ${run.id}`;
  } catch (error) {
    await sqlClient`update api_sync_runs set status = 'failed', request_count = ${requestCount},
      finished_at = now(), error = ${String(error)} where id = ${run.id}`;
    throw error;
  }

  return { pending: pending.length, leagues: byLeague.size, requestCount, updated, finished, adopted, missing, faults };
}

/**
 * Matches the provider played in this window that the schedule has no row for
 * under any provider. Nothing here can fix that - creating fixtures is the
 * schedule sync's job - but naming the number is what tells an operator to
 * press Refresh rather than press Pull results again and read the same
 * "nothing was waiting".
 */
async function countUnrecorded(
  leagueSlug: string,
  incoming: readonly ProviderFixture[],
  teamIds: Map<string, string>,
  providerName: string,
  now: Date,
) {
  const played = incoming.filter((fixture) => Date.parse(fixture.kickoffAt) <= now.getTime());
  if (played.length === 0) return 0;

  const days = [...new Set(played.map((fixture) => isoDate(fixture.kickoffAt)))];
  const recorded = await sqlClient<Array<{
    provider: string; provider_external_id: string; home_team_id: string; away_team_id: string; kickoff_at: Date;
  }>>`
    select f.provider, f.provider_external_id, f.home_team_id, f.away_team_id, f.kickoff_at
    from fixtures f join leagues l on l.id = f.league_id
    where l.slug = ${leagueSlug}
      and (f.kickoff_at at time zone 'UTC')::date::text = any(${days})`;

  const knownIds = new Set(recorded.filter((row) => row.provider === providerName).map((row) => row.provider_external_id));
  const knownMatches = new Set(recorded.map((row) => matchKey(row.home_team_id, row.away_team_id, row.kickoff_at)));

  return played.filter((fixture) => {
    if (knownIds.has(fixture.externalId)) return false;
    const homeId = teamIds.get(fixture.home.externalId);
    const awayId = teamIds.get(fixture.away.externalId);
    // A club this schedule has never heard of cannot have a fixture here, so an
    // unresolvable pair counts as missing rather than as quietly fine.
    if (!homeId || !awayId) return true;
    return !knownMatches.has(matchKey(homeId, awayId, fixture.kickoffAt));
  }).length;
}

async function countMissingFixtures(
  provider: FixtureProvider,
  leagueSlug: string,
  since: Date,
  now: Date,
) {
  const leagueExternalId = (provider.competitions ?? []).find((competition) => competition.leagueSlug === leagueSlug)?.externalId;
  if (!leagueExternalId) return { missing: 0, requestCount: 0, faults: [] as string[] };

  const [league] = await sqlClient<Array<{ provider_season: string }>>`
    select s.provider_season from leagues l
    join seasons s on s.league_id = l.id and s.is_current = true
    where l.slug = ${leagueSlug}`;
  if (!league) return { missing: 0, requestCount: 0, faults: [] as string[] };

  try {
    const batch = await provider.fetchFixtures({
      leagueExternalId,
      season: league.provider_season,
      from: isoDate(new Date(since.getTime() - 24 * 60 * 60 * 1000)),
      to: isoDate(now),
    });
    const teamIds = await resolveTeamIds(provider.name, batch.fixtures);
    return {
      missing: await countUnrecorded(leagueSlug, batch.fixtures, teamIds, provider.name, now),
      requestCount: batch.requestCount,
      faults: [] as string[],
    };
  } catch (error) {
    return { missing: 0, requestCount: 0, faults: [`${leagueSlug}: ${String(error)}`] };
  }
}
