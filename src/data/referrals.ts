import "server-only";

import { cache } from "react";

import { sqlClient } from "@/db";
import { safeReferralCode } from "@/lib/referral-code";

/**
 * The member behind a referral code.
 *
 * A link somebody was handed by a friend is the strongest invitation this
 * product has, and it used to arrive at a sign-in form that said nothing about
 * who sent it. Naming them turns a generic form into an introduction.
 *
 * Fails open to an unnamed invitation: a database problem must not turn a
 * working invite link into an error page.
 */
export const getReferrerName = cache(async (value: string | string[] | undefined): Promise<string | null> => {
  const code = safeReferralCode(value);
  if (!code) return null;

  try {
    const [row] = await sqlClient<Array<{ name: string }>>`
      select name from "user" where lower(referral_code) = lower(${code}) limit 1`;
    return row?.name ?? null;
  } catch (error) {
    console.error("Failed to read a referral code.", error);
    return null;
  }
});
