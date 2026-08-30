import { sqlClient } from "@/db";
import { sendEmail } from "@/lib/email";
import { specialistLockedEmail } from "@/lib/email-templates";
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
 * per-candidate catch skips the notification row and the send is retried.
 */
const defaultSender: EmailSender = async ({ to, subject, html, from, idempotencyKey }) => {
  const result = await sendEmail(to, { subject, html, from }, { idempotencyKey });
  if (!result.delivered) throw new Error(`Resend did not deliver the notification: ${result.reason}`);
};

type NotificationCandidate = {
  follower_user_id: string;
  follower_email: string;
  follower_name: string;
  specialist_user_id: string;
  specialist_name: string;
  matchweek_id: string;
  display_name: string;
  league_name: string;
  league_slug: string;
  lock_at: Date;
};

// A pick row only ever exists for an independent Weekly Lock (a followed call
// lives in followed_picks instead), so no participation-mode filter is needed.
export async function sendSpecialistLockNotifications(options: { send?: EmailSender } = {}) {
  const send = options.send ?? defaultSender;

  const candidates = await sqlClient<NotificationCandidate[]>`
    select distinct
      follower.id as follower_user_id, follower.email as follower_email, follower.name as follower_name,
      specialist.id as specialist_user_id, specialist.name as specialist_name,
      mw.id as matchweek_id, mw.display_name, l.name as league_name, l.slug as league_slug, mw.lock_at
    from picks p
    join matchweeks mw on mw.id = p.matchweek_id
    join leagues l on l.id = p.league_id
    join league_follows lf on lf.specialist_user_id = p.user_id and lf.league_id = p.league_id
    join "user" specialist on specialist.id = p.user_id
    join "user" follower on follower.id = lf.follower_user_id
    where mw.status = 'upcoming'
      and mw.lock_at > now()
      and not exists (
        select 1 from specialist_lock_notifications n
        where n.follower_user_id = follower.id
          and n.specialist_user_id = specialist.id
          and n.matchweek_id = mw.id
      )
    order by mw.lock_at`;

  let sent = 0;
  for (const candidate of candidates) {
    const lockAt = new Intl.DateTimeFormat("en", {
      weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
    }).format(new Date(candidate.lock_at));

    try {
      const message = specialistLockedEmail({
        name: candidate.follower_name,
        specialistName: candidate.specialist_name,
        leagueName: candidate.league_name,
        matchweekName: candidate.display_name,
        lockAt,
        url: `${serverEnv.betterAuthUrl}/leagues/${encodeURIComponent(candidate.league_slug)}`,
      });
      await send({
        to: candidate.follower_email,
        subject: message.subject,
        html: message.html,
        from: message.from,
        idempotencyKey: `specialist-lock/${candidate.follower_user_id}/${candidate.specialist_user_id}/${candidate.matchweek_id}`,
      });
      await sqlClient`
        insert into specialist_lock_notifications (follower_user_id, specialist_user_id, matchweek_id)
        values (${candidate.follower_user_id}, ${candidate.specialist_user_id}, ${candidate.matchweek_id})
        on conflict do nothing`;
      sent += 1;
    } catch (error) {
      console.error(`Failed to notify ${candidate.follower_email} of ${candidate.specialist_name}'s lock`, error);
    }
  }

  return { candidates: candidates.length, sent };
}
