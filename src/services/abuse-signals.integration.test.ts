import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { getSharedIpAccounts, getSuspiciousFollows } from "@/services/abuse-signals";

const superLig = "10000000-0000-4000-8000-000000000001";

async function createUser(id: string) {
  await sqlClient`insert into "user" (id, name, email, email_verified) values (${id}, ${id}, ${`${id}@test.local`}, true)`;
}

async function createSession(userId: string, ipAddress: string | null) {
  await sqlClient`insert into session (id, expires_at, token, ip_address, user_id)
    values (${`session-${crypto.randomUUID()}`}, now() + interval '1 day', ${crypto.randomUUID()}, ${ipAddress}, ${userId})`;
}

describe("getSharedIpAccounts", () => {
  it("flags accounts that have signed in from the same non-loopback address", async () => {
    // Unique per run rather than one of 254 random addresses: the test database
    // keeps every earlier run's accounts, so a repeat address made two runs look
    // like one cluster of four.
    const ip = `2001:db8::${crypto.randomUUID()}`;
    const a = `test-shared-a-${crypto.randomUUID()}`;
    const b = `test-shared-b-${crypto.randomUUID()}`;
    await createUser(a);
    await createUser(b);
    await createSession(a, ip);
    await createSession(b, ip);

    const clusters = await getSharedIpAccounts();
    const cluster = clusters.find((c) => c.ipAddress === ip);

    expect(cluster).toBeDefined();
    expect(cluster!.accounts.map((account) => account.id).sort()).toEqual([a, b].sort());
  });

  it("does not flag a single account's own address, or loopback addresses", async () => {
    const ip = `2001:db8::${crypto.randomUUID()}`;
    const solo = `test-solo-${crypto.randomUUID()}`;
    await createUser(solo);
    await createSession(solo, ip);
    await createSession(solo, "127.0.0.1");

    const clusters = await getSharedIpAccounts();

    expect(clusters.some((c) => c.ipAddress === ip)).toBe(false);
    expect(clusters.some((c) => c.ipAddress === "127.0.0.1")).toBe(false);
  });

  // The failure this guards: a local connection with no real remote address
  // reports as the IPv6 unspecified address in its fully-expanded form, which
  // clustered every local dev/test account together as "sharing an IP".
  it("does not flag two accounts that share the IPv6 unspecified address", async () => {
    const unspecified = "0000:0000:0000:0000:0000:0000:0000:0000";
    const a = `test-unspecified-a-${crypto.randomUUID()}`;
    const b = `test-unspecified-b-${crypto.randomUUID()}`;
    await createUser(a);
    await createUser(b);
    await createSession(a, unspecified);
    await createSession(b, unspecified);

    const clusters = await getSharedIpAccounts();

    expect(clusters.some((c) => c.ipAddress === unspecified)).toBe(false);
  });
});

describe("getSuspiciousFollows", () => {
  it("flags a follow between two accounts that share a sign-in address", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 254) + 1}`;
    const follower = `test-follower-${crypto.randomUUID()}`;
    const specialist = `test-specialist-${crypto.randomUUID()}`;
    await createUser(follower);
    await createUser(specialist);
    await createSession(follower, ip);
    await createSession(specialist, ip);
    await sqlClient`insert into league_follows (follower_user_id, specialist_user_id, league_id)
      values (${follower}, ${specialist}, ${superLig})`;

    const follows = await getSuspiciousFollows();
    const match = follows.find((f) => f.followerId === follower && f.specialistId === specialist);

    expect(match).toBeDefined();
    expect(match!.sharedIpAddress).toBe(ip);
  });

  it("does not flag a follow between accounts with no shared address", async () => {
    const follower = `test-follower-clean-${crypto.randomUUID()}`;
    const specialist = `test-specialist-clean-${crypto.randomUUID()}`;
    await createUser(follower);
    await createUser(specialist);
    await createSession(follower, `198.51.100.${Math.floor(Math.random() * 100) + 1}`);
    await createSession(specialist, `198.51.100.${Math.floor(Math.random() * 100) + 101}`);
    await sqlClient`insert into league_follows (follower_user_id, specialist_user_id, league_id)
      values (${follower}, ${specialist}, ${superLig})`;

    const follows = await getSuspiciousFollows();

    expect(follows.some((f) => f.followerId === follower && f.specialistId === specialist)).toBe(false);
  });
});
