import "server-only";

import { cookies } from "next/headers";

const COOKIE_NAME = "lc_voter";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** The current visitor's anonymous community-vote id, or null if they have never voted. Safe to call while rendering. */
export async function readVoterId(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

/** Same id, minted into a long-lived cookie on first use. Only callable from a Server Action or Route Handler. */
export async function getOrCreateVoterId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  store.set(COOKIE_NAME, id, { httpOnly: true, sameSite: "lax", maxAge: ONE_YEAR_SECONDS, path: "/" });
  return id;
}
