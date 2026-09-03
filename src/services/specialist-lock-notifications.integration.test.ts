import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { sendSpecialistLockNotifications } from "@/services/specialist-lock-notifications";

const superLig = "10000000-0000-4000-8000-000000000001";
const season = "20000000-0000-4000-8000-000000000001";
const besiktas = "40000000-0000-4000-8000-000000000005";
const konyaspor = "40000000-0000-4000-8000-000000000006";

async function createUser(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified) values (${id}, ${id}, ${`${id}@test.local`}, true)`;
}

// Creates a matchweek, its one fixture, and an independent Daily Lock for
// specialistId on that fixture, satisfying the picks-insert integrity trigger.
async function lockAPick(specialistId: string, hoursUntilLock: number) {
  const lockAt = new Date(Date.now() + hoursUntilLock * 3_600_000).toISOString();
  const [matchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, slug, start_at, lock_at, end_at, status)
    values (${superLig}, ${season}, ${`specialist-lock-test-${crypto.randomUUID()}`}, 'Specialist lock test matchweek', ${`specialist-lock-slug-${crypto.randomUUID()}`}, ${lockAt}, ${lockAt}, ${lockAt}, 'upcoming')
    returning id`;
  const [fixture] = await sqlClient<Array<{ id: string }>>`
    insert into fixtures (provider, provider_external_id, league_id, season_id, matchweek_id, home_team_id, away_team_id, kickoff_at, status, last_synced_at)
    values ('test', ${`specialist-lock-test-${crypto.randomUUID()}`}, ${superLig}, ${season}, ${matchweek!.id}, ${besiktas}, ${konyaspor}, ${lockAt}, 'scheduled', now())
    returning id`;
  await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
    values (${specialistId}, ${superLig}, ${matchweek!.id}, 'independent')`;
  await sqlClient`insert into picks (user_id, league_id, season_id, matchweek_id, fixture_id, selected_team_id)
    values (${specialistId}, ${superLig}, ${season}, ${matchweek!.id}, ${fixture!.id}, ${besiktas})`;
  return matchweek!.id;
}

// Other tests in this file lock picks in the same seeded league that remain
// upcoming, so every assertion is scoped to this test's own matchweek id.
async function notificationsFor(matchweekId: string) {
  return sqlClient<Array<{ follower_user_id: string }>>`
    select follower_user_id from specialist_lock_notifications where matchweek_id = ${matchweekId}`;
}

describe("sendSpecialistLockNotifications", () => {
  it("notifies a follower once a followed specialist locks, then skips them next run", async () => {
    const specialistId = `test-specialist-${crypto.randomUUID()}`;
    const followerId = `test-follower-${crypto.randomUUID()}`;
    await createUser(specialistId);
    await createUser(followerId);
    await sqlClient`insert into league_follows (follower_user_id, specialist_user_id, league_id)
      values (${followerId}, ${specialistId}, ${superLig})`;

    const matchweekId = await lockAPick(specialistId, 6);
    const sent: Array<{ to: string }> = [];

    await sendSpecialistLockNotifications({ send: async (input) => { sent.push(input); } });
    expect(sent.some((email) => email.to === `${followerId}@test.local`)).toBe(true);
    expect((await notificationsFor(matchweekId)).map((row) => row.follower_user_id)).toContain(followerId);

    sent.length = 0;
    await sendSpecialistLockNotifications({ send: async (input) => { sent.push(input); } });
    expect(sent.some((email) => email.to === `${followerId}@test.local`)).toBe(false);
  });

  it("does not notify a user who does not follow the specialist", async () => {
    const specialistId = `test-specialist-${crypto.randomUUID()}`;
    const strangerId = `test-stranger-${crypto.randomUUID()}`;
    await createUser(specialistId);
    await createUser(strangerId);

    const matchweekId = await lockAPick(specialistId, 6);
    await sendSpecialistLockNotifications({ send: async () => {} });

    const notifiedUserIds = (await notificationsFor(matchweekId)).map((row) => row.follower_user_id);
    expect(notifiedUserIds).not.toContain(strangerId);
  });
});
