import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getLockedGames } from "@/data/locked-games";

const superLig = "10000000-0000-4000-8000-000000000001";

async function lockFor(suffix: string, kickoffOffsetHours: number, status: "scheduled" | "finished") {
  const userId = `test-locked-${suffix}`;
  await sqlClient`insert into "user" (id, name, email, email_verified)
    values (${userId}, ${userId}, ${`${userId}@test.local`}, true)`;

  const kickoff = new Date(Date.now() + kickoffOffsetHours * 3_600_000).toISOString();
  const [season] = await sqlClient<Array<{ id: string }>>`
    select id from seasons where league_id = ${superLig} and is_current = true limit 1`;
  const [matchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, slug, start_at, lock_at, end_at)
    values (${superLig}, ${season!.id}, ${`locked-round-${suffix}`}, ${`Locked week ${suffix}`}, ${`locked-slug-${suffix}`},
      ${kickoff}::timestamptz, ${kickoff}::timestamptz, ${kickoff}::timestamptz + interval '3 hours')
    returning id`;
  const teams: string[] = [];
  for (const side of ["home", "away"]) {
    const [team] = await sqlClient<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, slug, short_name)
      values (${`locked-${side}-${suffix}`}, ${`locked-${side}-${suffix}`}, ${`Locked ${side} ${suffix}`},
        ${`locked-${side}-${suffix}`}, 'LCK')
      returning id`;
    teams.push(team!.id);
  }
  const [fixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id,
      home_team_id, away_team_id, kickoff_at, status, last_synced_at)
    values (${`locked-${suffix}`}, ${`locked-fixture-${suffix}`}, ${superLig}, ${season!.id}, ${matchweek!.id},
      ${teams[0]}, ${teams[1]}, ${kickoff}::timestamptz, ${status}, now())
    returning id`;
  await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
    values (${userId}, ${superLig}, ${matchweek!.id}, 'independent')`;
  await sqlClient`select set_config('leaguecred.backfill', 'on', false)`;
  const [pick] = await sqlClient<Array<{ id: string }>>`
    insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id, match_date)
    values (${userId}, ${superLig}, ${season!.id}, ${matchweek!.id}, ${fixture!.id}, ${teams[0]},
      (${kickoff}::timestamptz at time zone 'UTC')::date)
    returning id`;
  await sqlClient`select set_config('leaguecred.backfill', 'off', false)`;
  return { userId, pickId: pick!.id, selectedTeamId: teams[0]!, opponentName: `Locked away ${suffix}` };
}

describe("getLockedGames", () => {
  it("lists a call still riding, with what it is riding on", async () => {
    const suffix = crypto.randomUUID();
    const lock = await lockFor(suffix, 48, "scheduled");

    const [game] = await getLockedGames(lock.userId);

    expect(game).toMatchObject({ pickId: lock.pickId, live: false });
    expect(game?.opponent.name).toBe(lock.opponentName);
  });

  // The dock is for calls still open. A settled one belongs to the record, and
  // showing it here would suggest something is still to come of it.
  it("drops a call once it has settled", async () => {
    const suffix = crypto.randomUUID();
    const lock = await lockFor(suffix, -48, "finished");
    await sqlClient`update picks set result = 'win' where id = ${lock.pickId}`;

    expect(await getLockedGames(lock.userId)).toHaveLength(0);
  });
});
