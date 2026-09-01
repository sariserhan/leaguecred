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

// A lock now belongs to a day, and only one can be held per league per day, so
// each of these has to fall on its own. They also have to be made while the
// match is still to be played, which the old shortcut of inserting a pick
// against an already-finished fixture no longer allows — so this follows the
// real sequence instead: a scheduled match, a lock, then the result.
let matchDayOffset = 0;

async function createAndSettlePick(input: {
  userId: string;
  seasonId: string;
  round: string;
  fixtureStatus: "finished" | "cancelled";
  winnerTeamId: string | null;
}) {
  matchDayOffset += 1;
  const kickoff = new Date(Date.now() + matchDayOffset * 86_400_000);
  // A real matchweek's window spans hours, not years. A multi-year placeholder
  // would overlap every other matchweek this file creates, colliding with the
  // matchweek lookup by date window in fixture-sync.ts.
  const endAt = new Date(kickoff.getTime() + 3 * 3_600_000).toISOString();
  const [createdMatchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at, status)
    values (${superLig}, ${input.seasonId}, ${input.round}, ${input.round}, ${kickoff.toISOString()}, ${endAt}, ${endAt}, 'upcoming') returning id`;
  const [createdFixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, last_synced_at)
    values ('settlement-test', ${input.round}, ${superLig}, ${input.seasonId}, ${createdMatchweek!.id}, ${besiktas}, ${konyaspor}, ${kickoff.toISOString()}, 'scheduled', now()) returning id`;
  await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
    values (${input.userId}, ${superLig}, ${createdMatchweek!.id}, 'independent')`;
  const [pick] = await sqlClient<Array<{ id: string }>>`
    insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id)
    values (${input.userId}, ${superLig}, ${input.seasonId}, ${createdMatchweek!.id}, ${createdFixture!.id}, ${besiktas}) returning id`;

  // The match is played.
  await sqlClient`update fixtures set status = ${input.fixtureStatus}, winner_team_id = ${input.winnerTeamId}, updated_at = now()
    where id = ${createdFixture!.id}`;
  expect(await settlePick(pick!.id)).toBe(true);
}

describe("LeagueCred database integrity", () => {
  it("allows one immutable daily lock, and only one for that day", async () => {
    const userId = `test-independent-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode) values (${userId}, ${superLig}, ${matchweek}, 'independent')`;
    await sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureThree}, ${besiktas})`;

    // A second call on the same day, even on a different match, is refused.
    await expect(sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureFour}, ${trabzonspor})`).rejects.toThrow();
    await expect(sqlClient`update picks set selected_team_id = ${konyaspor} where user_id = ${userId} and matchweek_id = ${matchweek}`).rejects.toThrow(/immutable/);

    // The date is taken from the fixture, not from whatever was passed in.
    const [stored] = await sqlClient<Array<{ match_date: string }>>`select match_date from picks where user_id = ${userId}`;
    const [fixture] = await sqlClient<Array<{ match_date: string }>>`select (kickoff_at at time zone 'UTC')::date as match_date from fixtures where id = ${fixtureThree}`;
    expect(String(stored?.match_date)).toBe(String(fixture?.match_date));
  });

  it("allows a lock for another day to be held at the same time", async () => {
    const userId = `test-daily-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode) values (${userId}, ${superLig}, ${matchweek}, 'independent')`;

    // A second match in the same week, played the following day.
    const [tomorrow] = await sqlClient<Array<{ id: string }>>`
      insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, last_synced_at)
      values ('daily-lock-test', ${`next-day-${crypto.randomUUID()}`}, ${superLig}, ${season}, ${matchweek}, ${trabzonspor}, ${rizespor},
        (select kickoff_at + interval '1 day' from fixtures where id = ${fixtureThree}), 'scheduled', now())
      returning id`;

    await sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${fixtureThree}, ${besiktas})`;
    await sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${tomorrow!.id}, ${trabzonspor})`;

    const held = await sqlClient<Array<{ match_date: string }>>`select match_date from picks where user_id = ${userId} order by match_date`;
    expect(held).toHaveLength(2);
    expect(new Set(held.map((row) => String(row.match_date))).size).toBe(2);
  });

  it("refuses a lock once that match has kicked off", async () => {
    const userId = `test-kickoff-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode) values (${userId}, ${superLig}, ${matchweek}, 'independent')`;

    // The deadline is the match's own kickoff, not the week's first.
    const [started] = await sqlClient<Array<{ id: string }>>`
      insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, last_synced_at)
      values ('daily-lock-test', ${`started-${crypto.randomUUID()}`}, ${superLig}, ${season}, ${matchweek}, ${trabzonspor}, ${rizespor},
        now() - interval '10 minutes', 'scheduled', now())
      returning id`;

    await expect(sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${started!.id}, ${trabzonspor})`)
      .rejects.toThrow(/already started/);
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

    // Its own fixture rather than a shared seed one: a lock can only be made
    // before its match starts, so a test that finishes the match would stop
    // every later test in the suite from locking it.
    matchDayOffset += 1;
    const [ownFixture] = await sqlClient<Array<{ id: string }>>`
      insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, last_synced_at)
      values ('settlement-test', ${`settle-${crypto.randomUUID()}`}, ${superLig}, ${season}, ${matchweek}, ${trabzonspor}, ${rizespor},
        now() + make_interval(days => ${matchDayOffset}), 'scheduled', now())
      returning id`;
    const [pick] = await sqlClient<Array<{ id: string }>>`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id) values (${userId}, ${superLig}, ${season}, ${matchweek}, ${ownFixture!.id}, ${trabzonspor}) returning id`;
    await sqlClient`update fixtures set status = 'finished', home_score = 2, away_score = 0, winner_team_id = ${trabzonspor} where id = ${ownFixture!.id}`;

    expect(await settlePick(pick!.id)).toBe(true);
    expect(await settlePick(pick!.id)).toBe(false);
    let [events] = await sqlClient<Array<{ count: number }>>`select count(*)::int as count from settlement_events where pick_id = ${pick!.id}`;
    expect(events?.count).toBe(1);

    await sqlClient`update fixtures set home_score = 0, away_score = 1, winner_team_id = ${rizespor} where id = ${ownFixture!.id}`;
    await sqlClient`update fixtures set status = 'scheduled', winner_team_id = null where id = ${ownFixture!.id}`;
    await expect(correctSettlement(pick!.id, "Provider is still reconciling the result")).rejects.toThrow(/terminal fixture result/);
    [events] = await sqlClient<Array<{ count: number }>>`select count(*)::int as count from settlement_events where pick_id = ${pick!.id}`;
    expect(events?.count).toBe(1);

    await sqlClient`update fixtures set status = 'finished', winner_team_id = ${rizespor} where id = ${ownFixture!.id}`;
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

  // A frozen week keeps its own dates and its recorded fixtures untouched, but
  // it no longer refuses a fixture that arrives late. Dropping one wrote the
  // match nowhere at all - not the schedule, not the results, and out of reach
  // of every later job - so a match that was played simply never appeared.
  it("keeps a frozen week's dates while still recording a fixture that arrives late", async () => {
    const suffix = crypto.randomUUID();
    const round = `Integration round ${suffix}`;
    const originalExternalId = `integration-fixture-${suffix}`;
    // The team names below are fixed, not suffixed, so a rerun against a database that
    // still has an earlier run's rows resolves to the same two teams. A fixed kickoff
    // date would then look like the same match again to the cross-provider dedupe (same
    // teams, same day) and get silently absorbed instead of opening a new matchweek - so
    // the date has to vary per run too, derived from the suffix already unique to it.
    const dayOffset = 120 + (parseInt(suffix.slice(0, 4), 16) % 300);
    const kickoffBase = new Date(Date.UTC(2026, 0, 1) + dayOffset * 86_400_000);
    const originalKickoff = new Date(kickoffBase.getTime() + 18 * 3_600_000).toISOString();
    const delayedKickoff = new Date(kickoffBase.getTime() + 44 * 3_600_000).toISOString();
    const syncNow = new Date(kickoffBase.getTime() - 2 * 86_400_000);

    let incoming: ProviderFixture[] = [{
      externalId: originalExternalId,
      round,
      kickoffAt: originalKickoff,
      status: "scheduled",
      // Named per run, like everything else here. Two runs sharing club names
      // produce the same match on the same day, which the sync now recognises
      // as one another provider already recorded and skips.
      home: { externalId: `integration-home-${suffix}`, name: `Integration Home ${suffix}`, shortName: "IHM", logoUrl: null },
      away: { externalId: `integration-away-${suffix}`, name: `Integration Away ${suffix}`, shortName: "IAW", logoUrl: null },
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

    await synchronizeFixtures(provider, syncNow);
    const [created] = await sqlClient<Array<{ id: string }>>`
      select id from matchweeks where league_id = ${superLig} and provider_round_name = ${round}`;
    expect(created).toBeDefined();

    // Captured before the second sync: this week may be one an earlier run left
    // behind and this round joined, and what matters is that locking pins the
    // deadline wherever it already sat.
    const [before] = await sqlClient<Array<{ lock_at: Date }>>`
      select lock_at from matchweeks where id = ${created!.id}`;

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
    await synchronizeFixtures(provider, new Date(syncNow.getTime() + 3_600_000));

    const [original] = await sqlClient<Array<{ kickoff_at: Date; status: string; home_score: number | null }>>`
      select kickoff_at, status, home_score from fixtures
      where provider = 'api-football' and provider_external_id = ${originalExternalId}`;
    const [fixtureCount] = await sqlClient<Array<{ count: number }>>`
      select count(*)::int as count from fixtures where matchweek_id = ${created!.id}`;

    // The recorded match keeps the kickoff it was locked against, and its score
    // still moves.
    expect(new Date(original!.kickoff_at).toISOString()).toBe(originalKickoff);
    expect(original).toMatchObject({ status: "live", home_score: 1 });
    // The late arrival is recorded rather than lost.
    expect(fixtureCount?.count).toBe(2);

    const [week] = await sqlClient<Array<{ lock_at: Date }>>`
      select lock_at from matchweeks where id = ${created!.id}`;
    expect(new Date(week!.lock_at).toISOString()).toBe(new Date(before!.lock_at).toISOString());
  });
});

afterAll(async () => {
  await sqlClient.end();
});
