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
    winner_team_id: string | null; home_team_id: string;
  }>>`
    select status, home_score, away_score, winner_team_id, home_team_id
    from fixtures where provider = ${provider} and provider_external_id = ${externalId}`;
  return row;
}

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

  it("asks the provider for nothing when no fixture is waiting on a result", async () => {
    const fetchFixtures = vi.fn();
    const result = await synchronizeMatchResults(
      fakeProvider(`test-results-quiet-${crypto.randomUUID()}`, fetchFixtures),
    );

    expect(fetchFixtures).not.toHaveBeenCalled();
    expect(result).toMatchObject({ leagues: 0, requestCount: 0, updated: 0 });
  });
});
