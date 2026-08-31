import { afterAll, describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import type { FixtureProvider, ProviderFixture } from "@/providers/fixtures";
import { synchronizeFixtures } from "@/services/fixture-sync";
import { correctSettlement, settlePick } from "@/services/settlement";

const superLig = "10000000-0000-4000-8000-000000000001";
const season = "20000000-0000-4000-8000-000000000001";
const matchweek = "30000000-0000-4000-8000-000000000001";
const fixtureThree = "50000000-0000-4000-8000-000000000003";
const fixtureFour = "50000000-0000-4000-8000-000000000004";
const besiktas = "40000000-0000-4000-8000-000000000005";
const konyaspor = "40000000-0000-4000-8000-000000000006";
const trabzonspor = "40000000-0000-4000-8000-000000000007";
const rizespor = "40000000-0000-4000-8000-000000000008";

async function createUser(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified) values (${id}, ${id}, ${`${id}@test.local`}, true)`;
}

async function createAndSettlePick(input: {
  userId: string;
  seasonId: string;
  round: string;
  fixtureStatus: "finished" | "cancelled";
  winnerTeamId: string | null;
}) {
  const kickoff = new Date().toISOString();
  // A real matchweek's window spans hours, not years. This test never checks
  // lock timing, but a multi-year placeholder here would overlap every other
  // matchweek any other test in this file creates, colliding with matchweek
  // lookup-by-date-window in fixture-sync.ts.
  const endAt = new Date(Date.now() + 3 * 3_600_000).toISOString();
  const [createdMatchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at, status)
    values (${superLig}, ${input.seasonId}, ${input.round}, ${input.round}, ${kickoff}, ${endAt}, ${endAt}, 'upcoming') returning id`;
  const [createdFixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, winner_team_id, last_synced_at)
    values ('settlement-test', ${input.round}, ${superLig}, ${input.seasonId}, ${createdMatchweek!.id}, ${besiktas}, ${konyaspor}, ${kickoff}, ${input.fixtureStatus}, ${input.winnerTeamId}, now()) returning id`;
  await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
    values (${input.userId}, ${superLig}, ${createdMatchweek!.id}, 'independent')`;
  const [pick] = await sqlClient<Array<{ id: string }>>`
    insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id)
    values (${input.userId}, ${superLig}, ${input.seasonId}, ${createdMatchweek!.id}, ${createdFixture!.id}, ${besiktas}) returning id`;
  expect(await settlePick(pick!.id)).toBe(true);
}

describe("LeagueCred database integrity", () => {
  it("allows one immutable independent Weekly Lock", async () => {
    const userId = `test-independent-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode) values (${userId}, ${superLig}, ${matchweek}, 'independent')`;
    await sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureThree}, ${besiktas})`;

    await expect(sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureThree}, ${konyaspor})`).rejects.toThrow();
    await expect(sqlClient`update picks set selected_team_id = ${konyaspor} where user_id = ${userId} and matchweek_id = ${matchweek}`).rejects.toThrow(/immutable/);
    const [participation] = await sqlClient<Array<{ expert_picks_revealed_at: Date | null }>>`select expert_picks_revealed_at from matchweek_participation where user_id = ${userId}`;
    expect(participation?.expert_picks_revealed_at).toBeTruthy();
  });

  it("keeps followed guidance separate from independent expertise", async () => {
    const userId = `test-follow-${crypto.randomUUID()}`;
    await createUser(userId);
    const [source] = await sqlClient<Array<{ id: string }>>`select id from picks where user_id = 'seed-aylin' and matchweek_id = ${matchweek}`;
    expect(source).toBeDefined();
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode, expert_picks_revealed_at) values (${userId}, ${superLig}, ${matchweek}, 'follow', now())`;
    await sqlClient`insert into followed_picks (follower_user_id, source_pick_id, league_id, season_id, matchweek_id) values (${userId}, ${source!.id}, ${superLig}, ${season}, ${matchweek})`;

    await expect(sqlClient`update matchweek_participation set mode = 'independent' where user_id = ${userId}`).rejects.toThrow(/immutable/);
    await expect(sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureThree}, ${besiktas})`).rejects.toThrow(/independent participation/);
    const [record] = await sqlClient<Array<{ count: number }>>`select count(*)::int as count from user_league_records where user_id = ${userId}`;
    expect(record?.count).toBe(0);
  });

  it("settles idempotently and corrects through append-only events", async () => {
    const userId = `test-settlement-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode) values (${userId}, ${superLig}, ${matchweek}, 'independent')`;
    const [pick] = await sqlClient<Array<{ id: string }>>`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureFour}, ${trabzonspor}) returning id`;
    await sqlClient`update fixtures set status = 'finished', home_score = 2, away_score = 0, winner_team_id = ${trabzonspor} where id = ${fixtureFour}`;

    expect(await settlePick(pick!.id)).toBe(true);
    expect(await settlePick(pick!.id)).toBe(false);
    let [events] = await sqlClient<Array<{ count: number }>>`select count(*)::int as count from settlement_events where pick_id = ${pick!.id}`;
    expect(events?.count).toBe(1);

    await sqlClient`update fixtures set home_score = 0, away_score = 1, winner_team_id = ${rizespor} where id = ${fixtureFour}`;
    await sqlClient`update fixtures set status = 'scheduled', winner_team_id = null where id = ${fixtureFour}`;
    await expect(correctSettlement(pick!.id, "Provider is still reconciling the result")).rejects.toThrow(/terminal fixture result/);
    [events] = await sqlClient<Array<{ count: number }>>`select count(*)::int as count from settlement_events where pick_id = ${pick!.id}`;
    expect(events?.count).toBe(1);

    await sqlClient`update fixtures set status = 'finished', winner_team_id = ${rizespor} where id = ${fixtureFour}`;
    expect(await correctSettlement(pick!.id, "Provider corrected the final score")).toBe(true);
    [events] = await sqlClient<Array<{ count: number }>>`select count(*)::int as count from settlement_events where pick_id = ${pick!.id}`;
    expect(events?.count).toBe(3);
    const [active] = await sqlClient<Array<{ result: string }>>`select result from active_settlement_effects where pick_id = ${pick!.id}`;
    expect(active?.result).toBe("loss");
    await expect(sqlClient`delete from settlement_events where pick_id = ${pick!.id}`).rejects.toThrow(/append-only/);
  });

  it("rebuilds voids, streaks, season records, and career records correctly", async () => {
    const suffix = crypto.randomUUID();
    const userId = `test-record-${suffix}`;
    await createUser(userId);

    await createAndSettlePick({ userId, seasonId: season, round: `record-win-1-${suffix}`, fixtureStatus: "finished", winnerTeamId: besiktas });
    await createAndSettlePick({ userId, seasonId: season, round: `record-void-${suffix}`, fixtureStatus: "cancelled", winnerTeamId: null });
    await createAndSettlePick({ userId, seasonId: season, round: `record-win-2-${suffix}`, fixtureStatus: "finished", winnerTeamId: besiktas });
    await createAndSettlePick({ userId, seasonId: season, round: `record-loss-${suffix}`, fixtureStatus: "finished", winnerTeamId: konyaspor });

    const [secondSeason] = await sqlClient<Array<{ id: string }>>`
      insert into seasons (league_id, provider_season, name, start_date, end_date, is_current)
      values (${superLig}, ${`integration-${suffix}`}, 'Integration season', '2030-07-01', '2031-06-30', false) returning id`;
    await createAndSettlePick({ userId, seasonId: secondSeason!.id, round: `record-career-win-${suffix}`, fixtureStatus: "finished", winnerTeamId: besiktas });

    const [seasonRecord] = await sqlClient<Array<{ wins: number; losses: number; voids: number; settled_picks: number; current_win_streak: number; best_win_streak: number; tier: string }>>`
      select wins, losses, voids, settled_picks, current_win_streak, best_win_streak, tier
      from user_league_season_records where user_id = ${userId} and season_id = ${season}`;
    const [careerRecord] = await sqlClient<Array<{ wins: number; losses: number; voids: number; settled_picks: number; current_win_streak: number; best_win_streak: number; tier: string }>>`
      select wins, losses, voids, settled_picks, current_win_streak, best_win_streak, tier
      from user_league_records where user_id = ${userId} and league_id = ${superLig}`;

    expect(seasonRecord).toMatchObject({ wins: 2, losses: 1, voids: 1, settled_picks: 3, current_win_streak: 0, best_win_streak: 2, tier: "Provisional" });
    expect(careerRecord).toMatchObject({ wins: 3, losses: 1, voids: 1, settled_picks: 4, current_win_streak: 1, best_win_streak: 2, tier: "Provisional" });
  });

  it("freezes fixture eligibility after participation while continuing score updates", async () => {
    const suffix = crypto.randomUUID();
    const round = `Integration round ${suffix}`;
    const originalKickoff = "2026-09-03T18:00:00.000Z";
    const delayedKickoff = "2026-09-04T20:00:00.000Z";
    const originalExternalId = `integration-fixture-${suffix}`;

    let incoming: ProviderFixture[] = [{
      externalId: originalExternalId,
      round,
      kickoffAt: originalKickoff,
      status: "scheduled",
      home: { externalId: `integration-home-${suffix}`, name: "Integration Home", shortName: "IHM", logoUrl: null },
      away: { externalId: `integration-away-${suffix}`, name: "Integration Away", shortName: "IAW", logoUrl: null },
      homeScore: null,
      awayScore: null,
      winnerExternalId: null,
    }];
    const provider: FixtureProvider = {
      name: "api-football",
      async fetchFixtures() {
        return { fixtures: incoming, requestCount: 1 };
      },
    };

    await synchronizeFixtures(provider, new Date("2026-09-01T00:00:00.000Z"));
    const [created] = await sqlClient<Array<{ id: string }>>`
      select id from matchweeks where league_id = ${superLig} and provider_round_name = ${round}`;
    expect(created).toBeDefined();

    const userId = `test-frozen-${suffix}`;
    await createUser(userId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
      values (${userId}, ${superLig}, ${created!.id}, 'follow')`;

    incoming = [
      { ...incoming[0]!, kickoffAt: delayedKickoff, status: "live", homeScore: 1, awayScore: 0 },
      {
        externalId: `integration-late-fixture-${suffix}`,
        round,
        kickoffAt: delayedKickoff,
        status: "scheduled",
        home: { externalId: `integration-late-home-${suffix}`, name: "Late Home", shortName: "LHM", logoUrl: null },
        away: { externalId: `integration-late-away-${suffix}`, name: "Late Away", shortName: "LAW", logoUrl: null },
        homeScore: null,
        awayScore: null,
        winnerExternalId: null,
      },
    ];
    await synchronizeFixtures(provider, new Date("2026-09-01T01:00:00.000Z"));

    const [original] = await sqlClient<Array<{ kickoff_at: Date; status: string; home_score: number | null }>>`
      select kickoff_at, status, home_score from fixtures
      where provider = 'api-football' and provider_external_id = ${originalExternalId}`;
    const [fixtureCount] = await sqlClient<Array<{ count: number }>>`
      select count(*)::int as count from fixtures where matchweek_id = ${created!.id}`;

    expect(new Date(original!.kickoff_at).toISOString()).toBe(originalKickoff);
    expect(original).toMatchObject({ status: "live", home_score: 1 });
    expect(fixtureCount?.count).toBe(1);
  });
});

afterAll(async () => {
  await sqlClient.end();
});
