import { sqlClient } from "@/db";
import { HANDLE_MAX, handleFromName } from "@/lib/handle";

/** Whether a handle already belongs to someone else. */
export async function handleTaken(handle: string, exceptUserId?: string) {
  const [row] = await sqlClient<Array<{ id: string }>>`
    select id from "user"
    where lower(username) = lower(${handle})
      ${exceptUserId ? sqlClient`and id <> ${exceptUserId}` : sqlClient``}
    limit 1`;
  return Boolean(row);
}

/**
 * A handle nobody holds, derived from a display name.
 *
 * Used where a member has not chosen one - a sign-up that did not carry a
 * handle, or a member created by an admin - so that everyone is reachable at a
 * readable address rather than a uuid. A taken base takes a number, the way a
 * person would pick one themselves.
 */
export async function freeHandleFor(name: string) {
  const base = handleFromName(name);
  const candidates = [base, ...Array.from({ length: 50 }, (_, index) => {
    const suffix = String(index + 2);
    return `${base.slice(0, HANDLE_MAX - suffix.length)}${suffix}`;
  })];

  const taken = new Set((await sqlClient<Array<{ username: string }>>`
    select lower(username) as username from "user" where lower(username) = any(${candidates})`)
    .map((row) => row.username));

  const free = candidates.find((candidate) => !taken.has(candidate));
  // Fifty people sharing one name is not a case worth a nicer answer than a
  // handle nobody will love but everybody can reach.
  return free ?? `${base.slice(0, HANDLE_MAX - 7)}_${Math.random().toString(36).slice(2, 8)}`;
}
