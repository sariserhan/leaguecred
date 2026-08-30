import { Resend } from "resend";

import { sqlClient } from "@/db";
import { requireResendApiKey, serverEnv } from "@/lib/env";

export type EmailSender = (input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) => Promise<void>;

function defaultSender(): EmailSender {
  const resend = new Resend(requireResendApiKey());
  return async ({ to, subject, html, idempotencyKey }) => {
    const { error } = await resend.emails.send(
      { from: serverEnv.resendFromEmail, to: [to], subject, html },
      { idempotencyKey },
    );
    if (error) throw new Error(error.message);
  };
}

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

// A user is "engaged" with a league once they have ever locked, followed, or
// been followed there; a fresh signup with zero history gets no reminders.
export async function sendLockReminders(options: { hoursBeforeLock?: number; send?: EmailSender } = {}) {
  const hoursBeforeLock = options.hoursBeforeLock ?? 24;
  const send = options.send ?? defaultSender();

  const candidates = await sqlClient<ReminderCandidate[]>`
    select distinct u.id as user_id, u.email, u.name, mw.id as matchweek_id, mw.display_name,
      l.name as league_name, l.slug as league_slug, mw.lock_at
    from matchweeks mw
    join leagues l on l.id = mw.league_id
    join (
      select user_id, league_id from matchweek_participation
      union
      select follower_user_id as user_id, league_id from league_follows
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
      await send({
        to: candidate.email,
        subject: `Your ${candidate.league_name} Weekly Lock closes ${lockAt}`,
        html: `<p>Hi ${candidate.name},</p>` +
          `<p>You have not made your independent Weekly Lock for ${candidate.league_name} · ${candidate.display_name}. Locks close ${lockAt}.</p>` +
          `<p><a href="${serverEnv.betterAuthUrl}/leagues/${candidate.league_slug}">Make your pick</a></p>`,
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
