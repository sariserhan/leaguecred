import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { sendLockReminders } from "@/services/lock-reminders";

const superLig = "10000000-0000-4000-8000-000000000001";
const season = "20000000-0000-4000-8000-000000000001";
const settledMatchweek = "30000000-0000-4000-8000-000000000001";

async function createUser(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified) values (${id}, ${id}, ${`${id}@test.local`}, true)`;
}

async function createUpcomingMatchweek(hoursUntilLock: number) {
  const lockAt = new Date(Date.now() + hoursUntilLock * 3_600_000).toISOString();
  const [matchweek] = await sqlClient<Array<{ id: string }>>`
    insert into matchweeks (league_id, season_id, provider_round_name, display_name, slug, start_at, lock_at, end_at, status)
    values (${superLig}, ${season}, ${`reminder-test-${crypto.randomUUID()}`}, 'Reminder test matchweek', ${`reminder-slug-${crypto.randomUUID()}`}, ${lockAt}, ${lockAt}, ${lockAt}, 'upcoming')
    returning id`;
  return matchweek!.id;
}

// Other tests in this file also create 'upcoming' matchweeks in the same seeded
// league that remain in the reminder window, so every assertion here is scoped
// to lock_reminders rows for this test's own matchweek id, never a global send log.
async function remindersFor(matchweekId: string) {
  return sqlClient<Array<{ user_id: string }>>`
    select user_id from lock_reminders where matchweek_id = ${matchweekId}`;
}

describe("sendLockReminders", () => {
  it("reminds an engaged user who has not yet locked, then skips them next run", async () => {
    const userId = `test-engaged-${crypto.randomUUID()}`;
    await createUser(userId);
    // "Engaged" via a settled independent pick in a past matchweek of this league.
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
      values (${userId}, ${superLig}, ${settledMatchweek}, 'independent') on conflict do nothing`;

    const matchweekId = await createUpcomingMatchweek(6);
    const sent: Array<{ to: string }> = [];

    await sendLockReminders({ hoursBeforeLock: 24, send: async (input) => { sent.push(input); } });
    expect(sent.some((email) => email.to === `${userId}@test.local`)).toBe(true);
    expect((await remindersFor(matchweekId)).map((row) => row.user_id)).toContain(userId);

    sent.length = 0;
    await sendLockReminders({ hoursBeforeLock: 24, send: async (input) => { sent.push(input); } });
    expect(sent.some((email) => email.to === `${userId}@test.local`)).toBe(false);
  });

  it("does not remind an unengaged user or a user who already locked", async () => {
    const unengagedUserId = `test-unengaged-${crypto.randomUUID()}`;
    const lockedUserId = `test-locked-${crypto.randomUUID()}`;
    await createUser(unengagedUserId);
    await createUser(lockedUserId);
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
      values (${lockedUserId}, ${superLig}, ${settledMatchweek}, 'independent') on conflict do nothing`;

    const matchweekId = await createUpcomingMatchweek(6);
    // lockedUserId already has a participation row for the upcoming matchweek itself.
    await sqlClient`insert into matchweek_participation (user_id, league_id, matchweek_id, mode)
      values (${lockedUserId}, ${superLig}, ${matchweekId}, 'independent')`;

    await sendLockReminders({ hoursBeforeLock: 24, send: async () => {} });

    const remindedUserIds = (await remindersFor(matchweekId)).map((row) => row.user_id);
    expect(remindedUserIds).not.toContain(unengagedUserId);
    expect(remindedUserIds).not.toContain(lockedUserId);
  });
});
