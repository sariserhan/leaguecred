import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getNotificationCenter } from "@/data/notifications";

async function createUser(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified) values (${id}, ${id}, ${`${id}@test.local`}, true)`;
}

describe("getNotificationCenter", () => {
  // The failure this guards: postgres.js can hand a timestamp column back as a
  // string rather than a Date depending on the driver path, and calling
  // .toISOString() directly on the raw value throws for every signed-in user
  // who has a notification - which took the whole site down via the root layout.
  it("does not throw when a notification's timestamps round-trip through real Postgres", async () => {
    const userId = `test-notif-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into notifications (user_id, kind, title, body, href, dedupe_key)
      values (${userId}, 'lock_deadline', 'Test title', 'Test body', '/leagues/test', ${`test/${userId}`})`;

    const center = await getNotificationCenter(userId);

    expect(center.items).toHaveLength(1);
    expect(center.items[0]!.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(center.items[0]!.readAt).toBeNull();
  });

  it("marks readAt as an ISO string once a notification is read", async () => {
    const userId = `test-notif-read-${crypto.randomUUID()}`;
    await createUser(userId);
    await sqlClient`insert into notifications (user_id, kind, title, body, href, dedupe_key, read_at)
      values (${userId}, 'lock_deadline', 'Test title', 'Test body', '/leagues/test', ${`test/${userId}`}, now())`;

    const center = await getNotificationCenter(userId);

    expect(center.items[0]!.readAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("defaults every preference to true for a user with no saved row", async () => {
    const userId = `test-notif-prefs-${crypto.randomUUID()}`;
    await createUser(userId);

    const center = await getNotificationCenter(userId);

    expect(center.preferences).toEqual({
      lockDeadlines: true,
      specialistLocks: true,
      pickResults: true,
      followedResults: true,
    });
  });
});
