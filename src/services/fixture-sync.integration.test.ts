import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import type { FixtureBatch, FixtureProvider, ProviderFixture } from "@/providers/fixtures";
import { synchronizeFixtures } from "@/services/fixture-sync";

const superLigExternalId = "203";

function fixture(overrides: Partial<ProviderFixture> & { externalId: string; round: string; kickoffAt: string; home: ProviderFixture["home"]; away: ProviderFixture["away"] }): ProviderFixture {
  return {
    status: "scheduled",
    homeScore: null,
    awayScore: null,
    winnerExternalId: null,
    ...overrides,
  };
}

function team(id: string, name: string): ProviderFixture["home"] {
  return { externalId: id, name, shortName: name.slice(0, 3).toUpperCase(), logoUrl: null };
}

function fakeProvider(name: string, batch: FixtureBatch): FixtureProvider {
  return {
    name,
    competitions: [{ leagueSlug: "super-lig", externalId: superLigExternalId }],
    fetchFixtures: async () => batch,
  };
}

// "Date.now() + N days" alone barely moves between two runs of this suite in
// the same session, so a leftover matchweek from an earlier run can still
// overlap this run's window and get wrongly joined - the exact bug these
// tests guard against, just across runs instead of within one. Salting the
// day count with each test's own random suffix keeps every run on its own day.
function daysFromNow(base: number, suffix: string) {
  return base + (parseInt(suffix.slice(0, 4), 16) % 300);
}

async function matchweeksFor(externalIds: string[]) {
  return sqlClient<Array<{ id: string; fixture_count: number }>>`
    select mw.id, count(f.id)::int as fixture_count
    from matchweeks mw
    join fixtures f on f.matchweek_id = mw.id
    where f.provider_external_id = any(${externalIds})
    group by mw.id`;
}

describe("synchronizeFixtures matchweek keying", () => {
  // The failure this guards: two providers naming the same real week
  // differently used to create two matchweek rows with overlapping fixture
  // dates, letting a player lock in both. See matchweek-merge.ts.
  it("reuses the existing matchweek for a different provider's round whose fixture dates overlap", async () => {
    const suffix = crypto.randomUUID();
    // Both fall on the same real matchday: kickoffA's window runs to kickoffA + 3h,
    // and kickoffB sits inside it - a different provider's round, the same real week.
    // Each test in this file has its own base offset, spaced far enough apart
    // that they never collide with each other, and daysFromNow salts it with
    // this run's own suffix so a rerun never lands on a prior run's leftovers.
    const kickoffA = new Date(Date.now() + daysFromNow(600, suffix) * 24 * 3_600_000).toISOString();
    const kickoffB = new Date(Date.parse(kickoffA) + 2 * 3_600_000).toISOString();
    const providerA = `test-provider-a-${suffix}`;
    const providerB = `test-provider-b-${suffix}`;

    const batchA: FixtureBatch = {
      requestCount: 1,
      fixtures: [
        fixture({
          externalId: `test-a-${suffix}`,
          round: `${providerA}:Round A ${suffix}`,
          kickoffAt: kickoffA,
          home: team(`home-a-${suffix}`, `Home A ${suffix}`),
          away: team(`away-a-${suffix}`, `Away A ${suffix}`),
        }),
      ],
    };
    const batchB: FixtureBatch = {
      requestCount: 1,
      fixtures: [
        fixture({
          externalId: `test-b-${suffix}`,
          round: `${providerB}:Round B ${suffix}`,
          kickoffAt: kickoffB,
          home: team(`home-b-${suffix}`, `Home B ${suffix}`),
          away: team(`away-b-${suffix}`, `Away B ${suffix}`),
        }),
      ],
    };

    await synchronizeFixtures(fakeProvider(providerA, batchA));
    await synchronizeFixtures(fakeProvider(providerB, batchB));

    const matchweeks = await matchweeksFor([`test-a-${suffix}`, `test-b-${suffix}`]);

    expect(matchweeks).toHaveLength(1);
    expect(matchweeks[0]!.fixture_count).toBe(2);
  });

  it("still creates a separate matchweek for a genuinely later round with no date overlap", async () => {
    const suffix = crypto.randomUUID();
    const kickoffA = new Date(Date.now() + daysFromNow(1000, suffix) * 24 * 3_600_000).toISOString();
    const kickoffLater = new Date(Date.parse(kickoffA) + 7 * 24 * 3_600_000).toISOString();
    const providerA = `test-provider-la-${suffix}`;
    const providerB = `test-provider-lb-${suffix}`;

    const batchA: FixtureBatch = {
      requestCount: 1,
      fixtures: [
        fixture({
          externalId: `test-later-a-${suffix}`,
          round: `${providerA}:Round A ${suffix}`,
          kickoffAt: kickoffA,
          home: team(`home-la-${suffix}`, `Home LA ${suffix}`),
          away: team(`away-la-${suffix}`, `Away LA ${suffix}`),
        }),
      ],
    };
    const batchLater: FixtureBatch = {
      requestCount: 1,
      fixtures: [
        fixture({
          externalId: `test-later-b-${suffix}`,
          round: `${providerB}:Round B ${suffix}`,
          kickoffAt: kickoffLater,
          home: team(`home-lb-${suffix}`, `Home LB ${suffix}`),
          away: team(`away-lb-${suffix}`, `Away LB ${suffix}`),
        }),
      ],
    };

    await synchronizeFixtures(fakeProvider(providerA, batchA));
    await synchronizeFixtures(fakeProvider(providerB, batchLater));

    const matchweeks = await matchweeksFor([`test-later-a-${suffix}`, `test-later-b-${suffix}`]);

    expect(matchweeks).toHaveLength(2);
  });

  // The failure this guards: an earlier version merged three of one league's
  // own consecutive rounds into one, 44 fixtures, because a long-running round
  // overlaps the next one's window. Only a different provider may join a week.
  it("never merges two overlapping rounds from the same provider", async () => {
    const suffix = crypto.randomUUID();
    const kickoffA = new Date(Date.now() + daysFromNow(1400, suffix) * 24 * 3_600_000).toISOString();
    const kickoffB = new Date(Date.parse(kickoffA) + 2 * 3_600_000).toISOString();
    const provider = `test-provider-same-${suffix}`;

    const batchA: FixtureBatch = {
      requestCount: 1,
      fixtures: [
        fixture({
          externalId: `test-same-a-${suffix}`,
          round: `${provider}:Round A ${suffix}`,
          kickoffAt: kickoffA,
          home: team(`home-sa-${suffix}`, `Home SA ${suffix}`),
          away: team(`away-sa-${suffix}`, `Away SA ${suffix}`),
        }),
      ],
    };
    const batchB: FixtureBatch = {
      requestCount: 1,
      fixtures: [
        fixture({
          externalId: `test-same-b-${suffix}`,
          round: `${provider}:Round B ${suffix}`,
          kickoffAt: kickoffB,
          home: team(`home-sb-${suffix}`, `Home SB ${suffix}`),
          away: team(`away-sb-${suffix}`, `Away SB ${suffix}`),
        }),
      ],
    };

    await synchronizeFixtures(fakeProvider(provider, batchA));
    await synchronizeFixtures(fakeProvider(provider, batchB));

    const matchweeks = await matchweeksFor([`test-same-a-${suffix}`, `test-same-b-${suffix}`]);

    expect(matchweeks).toHaveLength(2);
  });
});
