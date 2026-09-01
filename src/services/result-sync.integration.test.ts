import { describe, expect, it, vi } from "vitest";

import { sqlClient } from "@/db";
import type { FixtureProvider, ProviderFixture } from "@/providers/fixtures";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { synchronizeMatchResults } from "@/services/result-sync";

const superLigExternalId = "203";

function team(id: string, name: string): ProviderFixture["home"] {
  return { externalId: id, name, shortName: name.slice(0, 3).toUpperCase(), logoUrl: null };
}

function scheduled(externalId: string, round: string, kickoffAt: string): ProviderFixture {
  return {
    externalId,
    round,
    kickoffAt,
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    winnerExternalId: null,
    home: team(`${externalId}-home`, `Home ${externalId}`),
    away: team(`${externalId}-away`, `Away ${externalId}`),
  };
}

function fakeProvider(name: string, fetchFixtures: FixtureProvider["fetchFixtures"]): FixtureProvider {
  return { name, competitions: [{ leagueSlug: "super-lig", externalId: superLigExternalId }], fetchFixtures };
}

// Each test needs its own future day, so a matchweek left by an earlier run
// never overlaps this run's window. Salted from the test's own suffix.
function kickoffFor(base: number, suffix: string) {
  const days = base + (parseInt(suffix.slice(0, 4), 16) % 300);
  return new Date(Date.now() + days * 24 * 3_600_000).toISOString();
}

async function storedFixture(provider: string, externalId: string) {
  const [row] = await sqlClient<Array<{
    status: string; home_score: number | null; away_score: number | null;
    winner_team_id: string | null; home_team_id: string; away_team_id: string;
  }>>`
    select status, home_score, away_score, winner_team_id, home_team_id, away_team_id
    from fixtures where provider = ${provider} and provider_external_id = ${externalId}`;
  return row;
}

/** The alias rows a provider's own sync would have written for these clubs. */
async function aliasTeams(provider: string, entries: Array<{ externalId: string; teamId: string }>) {
  for (const entry of entries) {
    await sqlClient`insert into team_provider_aliases (provider, provider_external_id, team_id, source_name)
      values (${provider}, ${entry.externalId}, ${entry.teamId}, ${entry.externalId})
      on conflict (provider, provider_external_id) do nothing`;
  }
}

// Far enough back that no other test's fixture sits in the three-day window the
// pull looks at, now that it no longer filters by which provider wrote a row.
const QUIET_PAST = new Date("2019-06-01T12:00:00.000Z");

describe("synchronizeMatchResults", () => {
  it("writes the score onto a fixture the schedule already holds", async () => {
    const suffix = crypto.randomUUID();
    const provider = `test-results-${suffix}`;
    const externalId = `test-result-${suffix}`;
    const kickoffAt = kickoffFor(900, suffix);
    const match = scheduled(externalId, `${provider}:Round ${suffix}`, kickoffAt);

    await synchronizeFixtures(fakeProvider(provider, async () => ({ requestCount: 1, fixtures: [match] })));

    const played: ProviderFixture = {
      ...match,
      status: "finished",
      homeScore: 2,
      awayScore: 1,
      winnerExternalId: match.home.externalId,
    };
    const result = await synchronizeMatchResults(
      fakeProvider(provider, async () => ({ requestCount: 1, fixtures: [played] })),
      new Date(Date.parse(kickoffAt) + 3 * 3_600_000),
    );

    expect(result).toMatchObject({ leagues: 1, requestCount: 1, updated: 1, finished: 1, faults: [] });

    // The counts outlive the press: the panel that reported them is a browser
    // tab, and the question "what did that run do" is usually asked later.
    const [logged] = await sqlClient<Array<{ kind: string; details: Record<string, number> | null }>>`
      select kind, details from api_sync_runs where provider = ${provider} order by started_at desc limit 1`;
    expect(logged?.kind).toBe("results");
    expect(logged?.details).toMatchObject({ pending: 1, updated: 1, finished: 1 });

    const stored = await storedFixture(provider, externalId);
    expect(stored).toMatchObject({ status: "finished", home_score: 2, away_score: 1 });
    expect(stored?.winner_team_id).toBe(stored?.home_team_id);
  });

  it("ignores a match it has no row for rather than creating one", async () => {
    const suffix = crypto.randomUUID();
    const provider = `test-results-unknown-${suffix}`;
    const externalId = `test-known-${suffix}`;
    const kickoffAt = kickoffFor(1300, suffix);
    const match = scheduled(externalId, `${provider}:Round ${suffix}`, kickoffAt);

    await synchronizeFixtures(fakeProvider(provider, async () => ({ requestCount: 1, fixtures: [match] })));

    const stranger = scheduled(`test-stranger-${suffix}`, `${provider}:Round ${suffix}`, kickoffAt);
    await synchronizeMatchResults(
      fakeProvider(provider, async () => ({
        requestCount: 1,
        fixtures: [{ ...match, status: "finished", homeScore: 0, awayScore: 0 }, stranger],
      })),
      new Date(Date.parse(kickoffAt) + 3 * 3_600_000),
    );

    expect(await storedFixture(provider, stranger.externalId)).toBeUndefined();
    expect(await storedFixture(provider, externalId)).toMatchObject({ status: "finished" });
  });

  it("leaves other leagues alone when one league is named", async () => {
    const suffix = crypto.randomUUID();
    const provider = `test-results-scoped-${suffix}`;
    const externalId = `test-scoped-${suffix}`;
    const kickoffAt = kickoffFor(1700, suffix);
    const match = scheduled(externalId, `${provider}:Round ${suffix}`, kickoffAt);

    await synchronizeFixtures(fakeProvider(provider, async () => ({ requestCount: 1, fixtures: [match] })));

    const fetchFixtures = vi.fn();
    const result = await synchronizeMatchResults(
      fakeProvider(provider, fetchFixtures),
      new Date(Date.parse(kickoffAt) + 3 * 3_600_000),
      "premier-league",
    );

    expect(fetchFixtures).not.toHaveBeenCalled();
    expect(result).toMatchObject({ leagues: 0, updated: 0 });
    expect(await storedFixture(provider, externalId)).toMatchObject({ status: "scheduled" });
  });

  // The Beşiktaş case: a row written by a provider that no longer syncs. Only
  // ESPN runs now, and it matched rows by its own id alone, so such a row was
  // never scored, never settled, and never displayed - a team page shows a past
  // match only once it has finished.
  it("scores a fixture another provider recorded, matched by the clubs and the day", async () => {
    const suffix = crypto.randomUUID();
    const oldProvider = `test-retired-${suffix}`;
    const espn = `test-current-${suffix}`;
    const externalId = `test-retired-fixture-${suffix}`;
    const kickoffAt = kickoffFor(2100, suffix);
    const match = scheduled(externalId, `${oldProvider}:Round ${suffix}`, kickoffAt);

    // The retired provider recorded the match, clubs and all.
    await synchronizeFixtures(fakeProvider(oldProvider, async () => ({ requestCount: 1, fixtures: [match] })));

    const recorded = await storedFixture(oldProvider, externalId);
    const espnHome = team(`espn-home-${suffix}`, `Home ${suffix}`);
    const espnAway = team(`espn-away-${suffix}`, `Away ${suffix}`);
    await aliasTeams(espn, [
      { externalId: espnHome.externalId, teamId: recorded!.home_team_id },
      { externalId: espnAway.externalId, teamId: recorded!.away_team_id },
    ]);

    // ESPN knows the same match under its own ids, and has the score.
    const espnView: ProviderFixture = {
      ...match,
      externalId: `espn-${suffix}`,
      home: espnHome,
      away: espnAway,
      status: "finished",
      homeScore: 6,
      awayScore: 2,
      winnerExternalId: espnHome.externalId,
    };
    const result = await synchronizeMatchResults(
      fakeProvider(espn, async () => ({ requestCount: 1, fixtures: [espnView] })),
      new Date(Date.parse(kickoffAt) + 3 * 3_600_000),
    );

    expect(result).toMatchObject({ updated: 1, finished: 1, adopted: 1, missing: 0 });
    const stored = await storedFixture(oldProvider, externalId);
    expect(stored).toMatchObject({ status: "finished", home_score: 6, away_score: 2 });
    expect(stored?.winner_team_id).toBe(stored?.home_team_id);
  });

  it("names the played matches the schedule has no row for", async () => {
    const suffix = crypto.randomUUID();
    const provider = `test-results-missing-${suffix}`;
    const kickoffAt = new Date(QUIET_PAST.getTime() - 3 * 3_600_000).toISOString();
    const unrecorded = scheduled(`test-missing-${suffix}`, `${provider}:Round ${suffix}`, kickoffAt);

    // Nothing of this provider's is in the schedule at all, so there is nothing
    // to pull - the point being that the provider still has a played match.
    const result = await synchronizeMatchResults(
      fakeProvider(provider, async () => ({
        requestCount: 1,
        fixtures: [{ ...unrecorded, status: "finished", homeScore: 6, awayScore: 2 }],
      })),
      QUIET_PAST,
      "super-lig",
      true,
    );

    expect(result).toMatchObject({ pending: 0, updated: 0, requestCount: 1, missing: 1 });
  });

  it("asks the provider for nothing when no fixture is waiting on a result", async () => {
    const fetchFixtures = vi.fn();
    const result = await synchronizeMatchResults(
      fakeProvider(`test-results-quiet-${crypto.randomUUID()}`, fetchFixtures),
      QUIET_PAST,
    );

    expect(fetchFixtures).not.toHaveBeenCalled();
    expect(result).toMatchObject({ leagues: 0, requestCount: 0, updated: 0 });
  });
});
