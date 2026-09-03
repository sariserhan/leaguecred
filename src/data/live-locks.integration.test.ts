import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getGlobalActiveLocks } from "@/data/live-locks";

const superLig = "10000000-0000-4000-8000-000000000001";

async function member(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified)
    values (${id}, ${id}, ${`${id}@test.local`}, true)`;
  return id;
}

/** An active lock on a match still to kick off, as the board lists them. */
async function activeLock(suffix: string, userId: string) {
  const [season] = await sqlClient<Array<{ id: string }>>`
    select id from seasons where league_id = ${superLig} and is_current = true limit 1`;
  const kickoff = new Date(Date.now() + 2 * 24 * 3_600_000).toISOString();
  const [matchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, slug, start_at, lock_at, end_at)
    values (${superLig}, ${season!.id}, ${`board-round-${suffix}`}, ${`Board week ${suffix}`}, ${`board-slug-${suffix}`},
      ${kickoff}::timestamptz, ${kickoff}::timestamptz, ${kickoff}::timestamptz + interval '3 hours')
    returning id`;
  const teams: string[] = [];
  for (const side of ["home", "away"]) {
    const [team] = await sqlClient<Array<{ id: string }>>`
      insert into teams (provider, provider_external_id, name, slug, short_name)
      values (${`board-${side}-${suffix}`}, ${`board-${side}-${suffix}`}, ${`Board ${side} ${suffix}`},
        ${`board-${side}-${suffix}`}, 'BRD')
      returning id`;
    teams.push(team!.id);
    await sqlClient`insert into league_team_memberships (league_id, season_id, team_id, source_provider, source_scope)
      values (${superLig}, ${season!.id}, ${team!.id}, ${`board-${suffix}`}, 'fixture-feed')`;
  }
  const [fixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id,
      home_team_id, away_team_id, kickoff_at, status, last_synced_at)
    values (${`board-${suffix}`}, ${`board-fixture-${suffix}`}, ${superLig}, ${season!.id}, ${matchweek!.id},
      ${teams[0]}, ${teams[1]}, ${kickoff}::timestamptz, 'scheduled', now())
    returning id`;
  await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
    values (${userId}, ${superLig}, ${matchweek!.id}, 'independent')`;
  const [pick] = await sqlClient<Array<{ id: string }>>`
    insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id, match_date)
    values (${userId}, ${superLig}, ${season!.id}, ${matchweek!.id}, ${fixture!.id}, ${teams[0]},
      (${kickoff}::timestamptz at time zone 'UTC')::date)
    returning id`;
  return { pickId: pick!.id, fixtureId: fixture!.id, selectedTeamId: teams[0]!, leagueId: superLig };
}

describe("getGlobalActiveLocks", () => {
  // The board's new buttons all need something the query did not carry before:
  // the fixture to add to your own slip, the league to follow within, and where
  // the viewer already stands on the call.
  it("carries the fixture, the league and the viewer's own vote and follow", async () => {
    const suffix = crypto.randomUUID();
    const author = await member(`test-author-${suffix}`);
    const viewer = await member(`test-viewer-${suffix}`);
    const lock = await activeLock(suffix, author);

    await sqlClient`insert into pick_votes (pick_id, user_id, value) values (${lock.pickId}, ${viewer}, 1)`;
    await sqlClient`insert into league_follows (follower_user_id, specialist_user_id, league_id)
      values (${viewer}, ${author}, ${superLig})`;

    const board = await getGlobalActiveLocks(viewer);
    const listed = board.find((entry) => entry.id === lock.pickId);

    expect(listed).toBeDefined();
    expect(listed).toMatchObject({
      fixtureId: lock.fixtureId, score: 1, viewerVote: 1, viewerFollows: true,
      // Callable by the viewer: the match is ahead and they have not spent that
      // day's call in this league.
      open: true, viewerLockedThatDay: false,
    });
    expect(listed!.selected.id).toBe(lock.selectedTeamId);
    expect(listed!.league.id).toBe(lock.leagueId);
  });

  it("shows a signed-out reader the totals without a vote of their own", async () => {
    const suffix = crypto.randomUUID();
    const author = await member(`test-author-out-${suffix}`);
    const voter = await member(`test-voter-out-${suffix}`);
    const lock = await activeLock(suffix, author);
    await sqlClient`insert into pick_votes (pick_id, user_id, value) values (${lock.pickId}, ${voter}, -1)`;

    const board = await getGlobalActiveLocks();
    const listed = board.find((entry) => entry.id === lock.pickId);

    expect(listed).toMatchObject({ score: -1, viewerVote: 0, viewerFollows: false });
  });
});
