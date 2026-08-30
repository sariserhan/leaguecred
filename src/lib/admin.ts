import { cache } from "react";
import { notFound } from "next/navigation";

import { sqlClient } from "@/db";
import type { UserRole } from "@/db/schema";
import { getSession } from "@/lib/auth-session";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isAdmin: boolean;
};

/**
 * The role is read from the database rather than the session so that revoking
 * an admin takes effect immediately instead of at the next sign-in.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const session = await getSession();
  if (!session) return null;

  try {
    const [row] = await sqlClient<Array<{ id: string; name: string; email: string; role: UserRole }>>`
      select id, name, email, role from "user" where id = ${session.user.id}`;
    if (!row) return null;

    return { ...row, isAdmin: row.role === "admin" };
  } catch (error) {
    console.error("Failed to read the viewer role.", error);
    return null;
  }
});

export async function viewerIsAdmin() {
  return Boolean((await getViewer())?.isAdmin);
}

/**
 * Answers with a 404 rather than a 403 so that the admin surface does not
 * confirm its own existence to a signed-in member.
 */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer?.isAdmin) notFound();

  return viewer;
}
