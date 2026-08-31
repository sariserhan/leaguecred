import { headers } from "next/headers";

import { sqlClient } from "@/db";
import { evaluateWindow, RATE_LIMITS, type RateLimitedAction } from "@/lib/rate-limit";

/**
 * Counts an attempt against an actor's window and says whether it is allowed.
 *
 * Deliberately fails open. This guards against volume, not against anything that
 * would corrupt data — the writes it covers are already unique-constrained — so
 * a database hiccup here must not stop somebody making their Daily Lock. The
 * cost of being wrong in the other direction is far higher than the cost of
 * letting a burst through.
 */

/** The signed-in user, or the caller's address. An address is a weak identity
 * behind a proxy, but it is what there is before a session exists. */
export async function rateLimitActor(userId?: string | null) {
  if (userId) return `user:${userId}`;
  const requestHeaders = await headers();
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `address:${forwarded || "unknown"}`;
}

export async function withinRateLimit(
  action: RateLimitedAction,
  actor: string,
  now = new Date(),
): Promise<boolean> {
  const policy = RATE_LIMITS[action];

  try {
    return await sqlClient.begin(async (sql) => {
      const [existing] = await sql<Array<{ window_started_at: Date; attempts: number }>>`
        select window_started_at, attempts from action_rate_limits
        where actor = ${actor} and action = ${action}
        for update`;

      const outcome = evaluateWindow(
        policy,
        now,
        existing ? new Date(existing.window_started_at) : null,
        existing?.attempts ?? 0,
      );
      if (!outcome.allowed) return false;

      // The window is decided here rather than in SQL: the row is already locked
      // for update, so its current start is known, and a value beats a fragment.
      // Sent as text with an explicit cast: with prepared statements off the
      // driver has no type to infer for a bare Date here.
      const windowStartedAt = (outcome.resetWindow || !existing
        ? now
        : new Date(existing.window_started_at)).toISOString();

      await sql`
        insert into action_rate_limits (actor, action, window_started_at, attempts)
        values (${actor}, ${action}, ${windowStartedAt}::timestamptz, ${outcome.attempts})
        on conflict (actor, action) do update set
          window_started_at = excluded.window_started_at,
          attempts = excluded.attempts`;
      return true;
    });
  } catch (error) {
    console.error(`Rate limit check failed for ${action}; allowing the attempt.`, error);
    return true;
  }
}

/** Convenience for the common case: an action taken by a signed-in user. */
export async function withinUserRateLimit(action: RateLimitedAction, userId?: string | null) {
  return withinRateLimit(action, await rateLimitActor(userId));
}
