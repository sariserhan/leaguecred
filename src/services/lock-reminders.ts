import { sqlClient } from "@/db";
import { sendEmail } from "@/lib/email";
import { lockReminderEmail } from "@/lib/email-templates";
import { serverEnv } from "@/lib/env";

export type EmailSender = (input: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  idempotencyKey: string;
}) => Promise<void>;

/**
 * Goes through the shared transport, then raises on failure so the caller's
 * per-candidate catch skips the lock_reminders row and the reminder is retried.
 */
const defaultSender: EmailSender = async ({ to, subject, html, from, idempotencyKey }) => {
  const result = await sendEmail(to, { subject, html, from }, { idempotencyKey });
  if (!result.delivered) throw new Error(`Resend did not deliver the reminder: ${result.reason}`);
};

type ReminderCandidate = {
  user_id: string;
  email: string;
  name: string;
  matchweek_id: string;
  display_name: string;
  league_name: string;
  league_slug: string;
  lock_at: Date;
};

// A user is engaged once they have participated, followed, or explicitly marked
// a league as known during onboarding.
export async function sendLockReminders(options: { hoursBeforeLock?: number; send?: EmailSender } = {}) {
  const hoursBeforeLock = options.hoursBeforeLock ?? 24;
  const send = options.send ?? defaultSender;

  const candidates = await sqlClient<ReminderCandidate[]>`
    select distinct u.id as user_id, u.email, u.name, mw.id as matchweek_id, mw.display_name,
      l.name as league_name, l.slug as league_slug, mw.lock_at
    from matchweeks mw
    join leagues l on l.id = mw.league_id
    join (
      select user_id, league_id from matchweek_participation
      union
      select follower_user_id as user_id, league_id from league_follows
      union
      select user_id, league_id from user_league_preferences where kind = 'know'
    ) engaged on engaged.league_id = mw.league_id
    join "user" u on u.id = engaged.user_id
    where mw.status = 'upcoming'
      and mw.lock_at > now()
      and mw.lock_at <= now() + make_interval(hours => ${hoursBeforeLock})
      and not exists (
        select 1 from matchweek_participation mp2
        where mp2.matchweek_id = mw.id and mp2.user_id = u.id
      )
      and not exists (
        select 1 from lock_reminders lr
        where lr.matchweek_id = mw.id and lr.user_id = u.id
      )
    order by mw.lock_at`;

  let sent = 0;
  for (const candidate of candidates) {
    const lockAt = new Intl.DateTimeFormat("en", {
      weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
    }).format(new Date(candidate.lock_at));

    try {
      await sqlClient`insert into notifications(user_id,kind,title,body,href,dedupe_key)
        select ${candidate.user_id},'lock_deadline',${`${candidate.league_name} Weekly Lock due`},${`${candidate.display_name} closes ${lockAt}.`},${`/leagues/${candidate.league_slug}`},${`lock-deadline/${candidate.matchweek_id}`}
        where coalesce((select lock_deadlines from notification_preferences where user_id=${candidate.user_id}),true)
        on conflict(user_id,dedupe_key) do nothing`;
      const message = lockReminderEmail({
        name: candidate.name,
        leagueName: candidate.league_name,
        matchweekName: candidate.display_name,
        lockAt,
        url: `${serverEnv.betterAuthUrl}/leagues/${encodeURIComponent(candidate.league_slug)}`,
      });
      await send({
        to: candidate.email,
        subject: message.subject,
        html: message.html,
        from: message.from,
        idempotencyKey: `lock-reminder/${candidate.user_id}/${candidate.matchweek_id}`,
      });
      await sqlClient`
        insert into lock_reminders (user_id, matchweek_id)
        values (${candidate.user_id}, ${candidate.matchweek_id})
        on conflict do nothing`;
      sent += 1;
    } catch (error) {
      console.error(`Failed to send lock reminder to ${candidate.email}`, error);
    }
  }

  return { candidates: candidates.length, sent };
}
