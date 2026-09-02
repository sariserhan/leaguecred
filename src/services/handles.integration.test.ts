import { describe, expect, it } from "vitest";

import { sqlClient } from "@/db";
import { freeHandleFor, handleTaken } from "@/services/handles";

async function member(name: string, handle: string) {
  const id = `test-handle-${crypto.randomUUID()}`;
  await sqlClient`insert into "user" (id, name, email, email_verified, username)
    values (${id}, ${name}, ${`${id}@test.local`}, true, ${handle})`;
  return id;
}

describe("freeHandleFor", () => {
  it("derives a handle from the name, spelled the way the name reads", async () => {
    expect(await freeHandleFor(`Kaan Yılmaz ${crypto.randomUUID().slice(0, 4)}`)).toMatch(/^kaan_yilmaz_/);
  });

  // The point of the whole exercise: two members really are called this.
  it("numbers a handle whose name is already worn", async () => {
    const name = `Mehmet ${crypto.randomUUID().slice(0, 6)}`;
    const first = await freeHandleFor(name);
    await member(name, first);

    const second = await freeHandleFor(name);

    expect(second).not.toBe(first);
    expect(await handleTaken(second)).toBe(false);
  });
});

describe("handleTaken", () => {
  it("reads a handle as taken whatever its case, and not against its owner", async () => {
    const handle = `kaan_${crypto.randomUUID().slice(0, 8)}`;
    const id = await member("Kaan", handle);

    expect(await handleTaken(handle.toUpperCase())).toBe(true);
    expect(await handleTaken(handle, id)).toBe(false);
  });

  // The check is a courtesy; the index is the rule.
  it("is backed by a constraint", async () => {
    const handle = `bo_${crypto.randomUUID().slice(0, 8)}`;
    await member("Bo", handle);

    await expect(member("Bo again", handle.toUpperCase())).rejects.toThrow();
  });
});

describe("display names", () => {
  // What the handle bought: two members may be called the same thing.
  it("may now repeat, because the handle is what tells members apart", async () => {
    const name = `Repeated ${crypto.randomUUID().slice(0, 6)}`;
    await member(name, `rep_a_${crypto.randomUUID().slice(0, 6)}`);

    await expect(member(name, `rep_b_${crypto.randomUUID().slice(0, 6)}`)).resolves.toBeTruthy();
  });
});
