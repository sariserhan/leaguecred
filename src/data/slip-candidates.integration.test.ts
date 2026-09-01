import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getSlipCandidates } from "@/data/slip-candidates";

const superLig = "10000000-0000-4000-8000-000000000001";

async function member(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified)
    values (${id}, ${id}, ${`${id}@test.local`}, true)`;
  return id;
}

async function fixtureIn(suffix: string, kickoff: string, status: "scheduled" | "live") {
  const [season] = await sqlClient<Array<{ id: string }>>`
    select id from seasons where league_id = ${superLig} and is_current = true limit 1`;
  const [matchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at)
    values (${superLig}, ${season!.id}, ${`slip-round-${suffix}`}, ${`Slip week ${suffix}`},
      ${kickoff}::timestamptz, ${kickoff}::timestamptz, ${kickoff}::timestamptz + interval '3 hours')
    returning id`;
  const teams: string[] = [];
  for (const side of ["home", "away"]) {
    const [team] = await sqlClient<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, slug, short_name)
      values (${`slip-${side}-${suffix}`}, ${`slip-${side}-${suffix}`}, ${`Slip ${side} ${suffix}`},
        ${`slip-${side}-${suffix}`}, 'SLP')
      returning id`;
    teams.push(team!.id);
  }
  const [fixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id,
      home_team_id, away_team_id, kickoff_at, status, last_synced_at)
    values (${`slip-${suffix}`}, ${`slip-fixture-${suffix}`}, ${superLig}, ${season!.id}, ${matchweek!.id},
      ${teams[0]}, ${teams[1]}, ${kickoff}::timestamptz, ${status}, now())
    returning id`;
  return { fixtureId: fixture!.id, matchweekId: matchweek!.id, seasonId: season!.id, homeId: teams[0]!, awayId: teams[1]! };
}

describe("getSlipCandidates", () => {
  it("lists a match set aside, with both sides still open", async () => {
    const suffix = crypto.randomUUID();
    const userId = await member(`test-slip-${suffix}`);
    const match = await fixtureIn(suffix, new Date(Date.now() + 3 * 24 * 3_600_000).toISOString(), "scheduled");
    await sqlClient`insert into slip_candidates (user_id, fixture_id) values (${userId}, ${match.fixtureId})`;

    const [candidate] = await getSlipCandidates(userId);

    expect(candidate).toMatchObject({ fixtureId: match.fixtureId, started: false, dayAlreadyLocked: false });
    expect(candidate?.home.id).toBe(match.homeId);
    expect(candidate?.away.id).toBe(match.awayId);
  });

  // A slip entry stays visible either way, since a member should see why the
  // match they set aside can no longer be locked rather than watch it vanish.
  it("marks a match that started, and a day already locked", async () => {
    const suffix = crypto.randomUUID();
    const userId = await member(`test-slip-closed-${suffix}`);

    const started = await fixtureIn(`${suffix}-a`, new Date(Date.now() - 3_600_000).toISOString(), "live");
    await sqlClient`insert into slip_candidates (user_id, fixture_id) values (${userId}, ${started.fixtureId})`;

    const open = await fixtureIn(`${suffix}-b`, new Date(Date.now() + 4 * 24 * 3_600_000).toISOString(), "scheduled");
    await sqlClient`insert into slip_candidates (user_id, fixture_id) values (${userId}, ${open.fixtureId})`;
    // A lock that day, on another match in the same league, closes the slip entry.
    const rival = await fixtureIn(`${suffix}-c`, new Date(Date.now() + 4 * 24 * 3_600_000).toISOString(), "scheduled");
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
      values (${userId}, ${superLig}, ${rival.matchweekId}, 'independent')`;
    await sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id, match_date)
      values (${userId}, ${superLig}, ${rival.seasonId}, ${rival.matchweekId}, ${rival.fixtureId}, ${rival.homeId},
        (select (kickoff_at at time zone 'UTC')::date from fixtures where id = ${rival.fixtureId}))`;

    const candidates = await getSlipCandidates(userId);
    const startedEntry = candidates.find((entry) => entry.fixtureId === started.fixtureId);
    const openEntry = candidates.find((entry) => entry.fixtureId === open.fixtureId);

    expect(startedEntry?.started).toBe(true);
    expect(openEntry).toMatchObject({ started: false, dayAlreadyLocked: true });
  });
});
