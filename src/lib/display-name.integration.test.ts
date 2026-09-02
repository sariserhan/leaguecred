import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { displayNameTaken } from "@/lib/display-name";

async function member(name: string) {
  const id = `test-name-${crypto.randomUUID()}`;
  await sqlClient`insert into "user" (id, name, email, email_verified)
    values (${id}, ${name}, ${`${id}@test.local`}, true)`;
  return id;
}

describe("displayNameTaken", () => {
  it("reads a name as taken whatever its case", async () => {
    const name = `Kaan ${crypto.randomUUID().slice(0, 8)}`;
    await member(name);

    expect(await displayNameTaken(name)).toBe(true);
    expect(await displayNameTaken(name.toUpperCase())).toBe(true);
    expect(await displayNameTaken(`${name} Two`)).toBe(false);
  });

  // Otherwise a member could not save their own profile without renaming.
  it("does not count the member's own name against them", async () => {
    const name = `Ada ${crypto.randomUUID().slice(0, 8)}`;
    const id = await member(name);

    expect(await displayNameTaken(name, id)).toBe(false);
  });

  // The index is what holds under a race the check above cannot see.
  it("is backed by a constraint, not only by the check", async () => {
    const name = `Bo ${crypto.randomUUID().slice(0, 8)}`;
    await member(name);

    await expect(member(name.toLowerCase())).rejects.toThrow();
  });
});
