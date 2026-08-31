import { sqlClient } from "@/db";
import { EspnFixtureProvider } from "@/providers/espn-fixtures";
import type { FixtureProvider } from "@/providers/fixtures";

/**
 * How far back a still-unfinished fixture is worth asking about. A match whose
 * kickoff was days ago and which the provider never marked finished is a
 * schedule problem, not a score problem, and the nightly full sync is what
 * repairs those.
 */
const LOOKBACK_DAYS = 3;

type PendingFixture = {
  id: string;
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

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }

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
 * With nothing pending it makes no request at all, which is what makes it
 * cheap enough to run every hour.
 */
export async function synchronizeMatchResults(
  provider: FixtureProvider = new EspnFixtureProvider(),
  now = new Date(),
  leagueSlug?: string,
) {
  const since = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const pending = await sqlClient<PendingFixture[]>`
    select f.id, f.provider_external_id, f.home_team_id, f.away_team_id, f.kickoff_at,
      f.status, f.home_score, f.away_score, l.slug as league_slug, s.provider_season
    from fixtures f
    join leagues l on l.id = f.league_id
    join seasons s on s.id = f.season_id
    where f.provider = ${provider.name}
      and f.status in ('scheduled', 'live')
      and f.kickoff_at <= ${now.toISOString()}::timestamptz
      and f.kickoff_at >= ${since.toISOString()}::timestamptz
      ${leagueSlug ? sqlClient`and l.slug = ${leagueSlug}` : sqlClient``}
    order by f.kickoff_at`;

  if (pending.length === 0) {
    return { leagues: 0, requestCount: 0, updated: 0, finished: 0, faults: [] as string[] };
  }

  const sourceIds = new Map((provider.competitions ?? []).map((competition) => [competition.leagueSlug, competition.externalId]));
  const byLeague = Map.groupBy(pending, (fixture) => fixture.league_slug);

  const [run] = await sqlClient<Array<{ id: string }>>`
    insert into api_sync_runs (provider, kind) values (${provider.name}, 'results') returning id`;
  if (!run) throw new Error("Could not start result sync run.");

  let requestCount = 0;
  let updated = 0;
  let finished = 0;
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

    for (const { fixtures, batch, error } of batches) {
      if (error) { faults.push(error); continue; }
      requestCount += batch?.requestCount ?? 0;

      const incoming = new Map((batch?.fixtures ?? []).map((fixture) => [fixture.externalId, fixture]));
      for (const stored of fixtures) {
        const fresh = incoming.get(stored.provider_external_id);
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
      }
    }

    await sqlClient`update api_sync_runs set status = ${faults.length ? "failed" : "succeeded"},
      request_count = ${requestCount}, finished_at = now(), error = ${faults.length ? faults.join(" | ") : null}
      where id = ${run.id}`;
  } catch (error) {
    await sqlClient`update api_sync_runs set status = 'failed', request_count = ${requestCount},
      finished_at = now(), error = ${String(error)} where id = ${run.id}`;
    throw error;
  }

  return { leagues: byLeague.size, requestCount, updated, finished, faults };
}
