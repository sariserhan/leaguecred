import { sqlClient } from "@/db";

/**
 * Whether a display name is already worn by someone else.
 *
 * A unique index is what makes this true under a race; this is what makes the
 * refusal a sentence rather than a constraint violation. Compared without case,
 * because "Kaan" and "kaan" read as the same person.
 */
export async function displayNameTaken(name: string, exceptUserId?: string) {
  const [row] = await sqlClient<Array<{ id: string }>>`
    select id from "user"
    where lower(name) = lower(${name.trim()})
      ${exceptUserId ? sqlClient`and id <> ${exceptUserId}` : sqlClient``}
    limit 1`;
  return Boolean(row);
}

export const NAME_TAKEN_MESSAGE =
  "That name is already taken. Records are followed by name here, so each one belongs to a single member.";
