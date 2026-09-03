/**
 * A referral code, reduced to what is safe to trust.
 *
 * The code arrives from a URL somebody was handed, so it is treated as hostile
 * until it is letters and digits and nothing else. Shared by the route that
 * sets the cookie and the lookup that names the inviter, so the two can never
 * disagree about what a code is.
 */
export function safeReferralCode(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const code = raw.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
  return code || null;
}
