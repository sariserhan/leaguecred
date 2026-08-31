/**
 * What each action costs an actor.
 *
 * Most writes here are already bounded by the schema — a Daily Lock is unique
 * per user, league and matchweek, and a follow is unique per pair — so repeating
 * them corrupts nothing. What they still cost is work: a query, a transaction,
 * and for a fixture refresh an upstream request. These limits are set against
 * that, not against data integrity, so they are generous enough that nobody
 * using the product normally will ever meet one.
 */

export type RateLimitPolicy = { limit: number; windowSeconds: number };

export const RATE_LIMITS = {
  /** One a day is the real rate; the rest is changing your mind. */
  submitDailyLock: { limit: 30, windowSeconds: 60 },
  followSpecialist: { limit: 60, windowSeconds: 60 },
  updateProfile: { limit: 20, windowSeconds: 60 },
  saveLeaguePreferences: { limit: 30, windowSeconds: 60 },
  saveNotificationPreferences: { limit: 30, windowSeconds: 60 },
  /** Reads the club list for one league. Cheap, but unauthenticated and one
   * query per call, so it is the easiest thing here to point a script at. */
  loadLeagueTeams: { limit: 120, windowSeconds: 60 },
  /** Calls an upstream provider, so this one is about their rate limit as much
   * as ours. Admin-only, and no admin refreshes a league twice a minute. */
  refreshLeagueFixtures: { limit: 5, windowSeconds: 60 },
  /** No account required, so the actor is a cookie, not a user - generous
   * enough for someone genuinely changing their mind on several fixtures. */
  castFixtureVote: { limit: 30, windowSeconds: 60 },
  addGameDiscussion: { limit: 10, windowSeconds: 60 },
} as const satisfies Record<string, RateLimitPolicy>;

export type RateLimitedAction = keyof typeof RATE_LIMITS;

/**
 * Whether an attempt fits inside the window that is already open.
 *
 * @param windowStartedAt when the open window began, or null for a first attempt
 * @param attempts how many have been counted in it
 * @returns the window to record, and whether the attempt is allowed
 */
export function evaluateWindow(
  policy: RateLimitPolicy,
  now: Date,
  windowStartedAt: Date | null,
  attempts: number,
) {
  const expired = !windowStartedAt
    || now.getTime() - windowStartedAt.getTime() >= policy.windowSeconds * 1000;

  if (expired) return { allowed: true, resetWindow: true, attempts: 1 } as const;
  if (attempts >= policy.limit) {
    return { allowed: false, resetWindow: false, attempts } as const;
  }
  return { allowed: true, resetWindow: false, attempts: attempts + 1 } as const;
}
