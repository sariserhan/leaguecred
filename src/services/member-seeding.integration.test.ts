import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { assignMemberLock, createMember, listAssignableFixtures } from "@/services/member-seeding";

const superLig = "10000000-0000-4000-8000-000000000001";

async function admin(suffix: string) {
  const id = `test-admin-${suffix}`;
  await sqlClient`insert into "user" (id, name, email, email_verified, role)
    values (${id}, ${id}, ${`${id}@test.local`}, true, 'admin')`;
  return id;
}

/** A fixture in this league's current season, kicking off when asked. */
async function fixtureAt(suffix: string, kickoff: string, status: "scheduled" | "finished") {
  const [season] = await sqlClient<Array<{ id: string }>>`
    select id from seasons where league_id = ${superLig} and is_current = true limit 1`;
  const [matchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, start_at, lock_at, end_at)
    values (${superLig}, ${season!.id}, ${`seed-round-${suffix}`}, ${`Seed week ${suffix}`},
      ${kickoff}::timestamptz, ${kickoff}::timestamptz, ${kickoff}::timestamptz + interval '3 hours')
    returning id`;
  const [home] = await sqlClient<Array<{ id: string }>>`
    insert into teams (provider, provider_external_id, name, slug, short_name)
    values (${`seed-home-${suffix}`}, ${`seed-home-${suffix}`}, ${`Seed Home ${suffix}`}, ${`seed-home-${suffix}`}, 'SHM')
    returning id`;
  const [away] = await sqlClient<Array<{ id: string }>>`
    insert into teams (provider, provider_external_id, name, slug, short_name)
    values (${`seed-away-${suffix}`}, ${`seed-away-${suffix}`}, ${`Seed Away ${suffix}`}, ${`seed-away-${suffix}`}, 'SAW')
    returning id`;
  for (const team of [home!.id, away!.id]) {
    await sqlClient`insert into league_team_memberships (league_id, season_id, team_id, source_provider, source_scope)
      values (${superLig}, ${season!.id}, ${team}, ${`seed-${suffix}`}, 'fixture-feed')`;
  }
  const [fixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id,
      home_team_id, away_team_id, kickoff_at, status, home_score, away_score, winner_team_id, last_synced_at)
    values (${`seed-${suffix}`}, ${`seed-fixture-${suffix}`}, ${superLig}, ${season!.id}, ${matchweek!.id},
      ${home!.id}, ${away!.id}, ${kickoff}::timestamptz, ${status},
      ${status === "finished" ? 2 : null}, ${status === "finished" ? 1 : null},
      ${status === "finished" ? home!.id : null}, now())
    returning id`;
  return { fixtureId: fixture!.id, homeId: home!.id, awayId: away!.id };
}

describe("assignMemberLock", () => {
  it("settles a lock on a match already played", async () => {
    const suffix = crypto.randomUUID();
    const actor = await admin(suffix);
    const member = await createMember({ name: `Seed Member ${suffix.slice(0, 8)}`, actorUserId: actor });
    const kickoff = new Date(Date.now() - 5 * 24 * 3_600_000).toISOString();
    const { fixtureId, homeId } = await fixtureAt(suffix, kickoff, "finished");

    const pickId = await assignMemberLock({ userId: member.id, fixtureId, selectedTeamId: homeId, actorUserId: actor });

    const [pick] = await sqlClient<Array<{ result: string; submitted_at: Date }>>`
      select result, submitted_at from picks where id = ${pickId}`;
    expect(pick?.result).toBe("win");
    // Backfilled from the kickoff, so the row reads as a lock placed before it.
    expect(new Date(pick!.submitted_at).getTime()).toBeLessThan(Date.parse(kickoff));
  });

  // What this adds: the same panel can now record a lock on a match still to
  // come. It is an ordinary lock - stamped now, pending until the match is
  // played - rather than a backfill, which would have dated it in the future.
  it("leaves a lock on an upcoming match pending, stamped now", async () => {
    const suffix = crypto.randomUUID();
    const actor = await admin(suffix);
    const member = await createMember({ name: `Seed Future ${suffix.slice(0, 8)}`, actorUserId: actor });
    const kickoff = new Date(Date.now() + 5 * 24 * 3_600_000).toISOString();
    const { fixtureId, awayId } = await fixtureAt(suffix, kickoff, "scheduled");

    // That upcoming matches are offered at all is what is new here. Which ones
    // is not asserted: the list is capped, and a test database carries every
    // earlier run's fixtures, so a particular one need not be inside the cap.
    const offered = await listAssignableFixtures({ userId: member.id, leagueSlug: "super-lig" });
    expect(offered.some((fixture) => !fixture.played)).toBe(true);
    expect(offered.every((fixture) => fixture.played || Date.parse(fixture.kickoff) > Date.now())).toBe(true);

    const pickId = await assignMemberLock({ userId: member.id, fixtureId, selectedTeamId: awayId, actorUserId: actor });

    const [pick] = await sqlClient<Array<{ result: string; submitted_at: Date }>>`
      select result, submitted_at from picks where id = ${pickId}`;
    expect(pick?.result).toBe("pending");
    expect(new Date(pick!.submitted_at).getTime()).toBeLessThan(Date.parse(kickoff));
    expect(new Date(pick!.submitted_at).getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });
});
