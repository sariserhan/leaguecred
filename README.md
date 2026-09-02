# LeagueCred

LeagueCred is a league-expertise network for football supporters.

Users make one independent highest-confidence Weekly Lock in a domestic league they know. That permanent record establishes league-specific credibility. In leagues they do not know, they can follow proven specialists without presenting copied picks as independent expertise.

## Current vertical slice

The repository contains a working, responsive Prove-or-Follow application with:

- Better Auth email/password accounts and persistent sessions
- PostgreSQL and Drizzle-backed leagues, matchweeks, picks, follows, and records
- one immutable independent Weekly Lock per league and matchweek
- specialist reveal and attributed follow mode kept outside independent accuracy
- a focused 25-competition catalog with league and team badges
- API-Football behind a provider abstraction with frozen matchweek eligibility
- idempotent settlement and an append-only correction ledger
- an admin dashboard for maintenance mode, a site banner, and feature flags
- admin diagnostics for fixture sync runs, the settlement correction ledger, and an append-only audit log of admin changes
- database constraints, disposable PostgreSQL integration tests, and browser QA

The product intentionally ranks league-specific accuracy and confidence-adjusted accuracy. It does not optimize odds, stake size, or expected profit.

## Quick start

Requirements: Node.js 24, pnpm 11, and Docker.

~~~bash
pnpm install
cp .env.example .env.local
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
~~~

Open http://localhost:3000 and create an account. The seeded Süper Lig page contains a future matchweek and specialist records for exercising both paths.

## Quality checks

~~~bash
pnpm check
pnpm test:integration
~~~

The integration command uses the isolated `postgres-test` Docker service on port 54330.

## Operations

~~~bash
pnpm db:seed:catalog
pnpm fixtures:sync
pnpm settle
pnpm remind
pnpm notify:specialist-locks
pnpm admin:grant you@example.com
~~~

`pnpm admin:grant` is the only way to create the first administrator; add `--revoke` to remove the role. Administrators reach `/admin` to switch maintenance mode on, publish a site banner, toggle feature flags, and review recent sync runs, settlement corrections, and admin activity. The route answers with a 404 for everyone else, so it never confirms its own existence.

Every site-settings save and feature-flag toggle writes a row to `admin_audit_log` (actor, before, after, timestamp) in the same transaction as the change itself, so the two can never drift apart. The admin page's "Admin activity" panel reads it back, newest first; there is no edit or delete path for the table.

Sign-up rejects known disposable-email domains and inherits Better Auth's default rate limiting (3 requests per 10 seconds on sign-up/sign-in). The admin page's "Abuse signals" panel surfaces accounts that have ever signed in from the same address, and follows between accounts that currently share one — both read from the `ip_address` Better Auth already records on every session, not new tracking. These are signals for a human to review, not automatic enforcement.

The catalog seed idempotently loads the 25 competitions currently supported by the product, including the major European domestic leagues and UEFA competitions, selected leagues in the Americas and Middle East, and Copa Libertadores. It seeds league metadata from API-Football and 290 team records with badges from TheSportsDB. The 298 league/team memberships are deliberately marked partial because TheSportsDB's free league endpoint is capped and cup membership is inferred from a limited event sample; the UI communicates that status rather than presenting the lists as complete rosters.

Fixture synchronization runs two independent sources, each caught and reported separately so one being down for the night never stops the other: ESPN's public scoreboard API covers every enabled league and goes first; football-data.org adds whatever ESPN is missing for its free-tier competitions (the top-five European leagues plus the Championship, Primeira Liga, Eredivisie, Brasileirão, and Champions League) when `FOOTBALL_DATA_API_KEY` is configured. Whoever records a match first keeps it — football-data.org only fills gaps, so a real gameweek never gets recorded twice. Football-Data.co.uk's CSV feed is not wired into fixture sync — it never contributed a match ESPN didn't already have, only stale duplicates — but stays available and still supplies the roster sync. Neon stores normalized fixtures, scores, provider aliases, and sync-run metadata. API-Football remains available for catalog metadata but is no longer a fixture source.

Vercel runs three cron jobs: `GET /api/jobs/results` hourly at :00, which pulls scores for fixtures still awaiting a result and settles what it can; `GET /api/jobs/daily` at 04:00 UTC, which chains fixture synchronization, settlement, and team-logo backfill in that order; and `GET /api/jobs/reminders` at 09:00 UTC, which runs the lock-reminder and specialist-lock-notification steps. The project runs on a Pro plan, where all three fire on the schedules as written — verified in the runtime logs on 2 September 2026 as 24 consecutive hourly results runs plus the nightly chain and the reminder run, every one a 200. Hobby is the case to watch for in a fork: it allows two cron jobs and runs them roughly once a day whatever the expression says, so the hourly results pull would have to fold back into the daily chain. A new kind of scheduled mail is still a step added to an existing route rather than a fourth cron. The individual routes `/api/jobs/fixtures`, `/api/jobs/settlement`, `/api/jobs/team-logos`, and `/api/jobs/reminders` remain available for manual runs. All of them accept GET or POST and require `Authorization: Bearer $CRON_SECRET`.

`pnpm remind` emails anyone who has ever locked, followed, or been followed in a league about an upcoming matchweek closing within 24 hours, if they have not yet made this week's independent Weekly Lock. Each user is reminded at most once per matchweek (tracked in `lock_reminders`).

`pnpm notify:specialist-locks` emails anyone following a specialist in a league once that specialist makes their independent Weekly Lock for an upcoming matchweek, so a follower knows to reveal specialist calls before it locks. Each follower is notified at most once per specialist per matchweek (tracked in `specialist_lock_notifications`).

A failed cron step is reported twice over: a `leaguecred.error` line in the runtime logs, and an email to `ALERT_EMAIL` when one is configured. Unset, nothing is sent and the failure is still a 500 in the cron log.

Both jobs send through the one shared transport (`src/lib/email.ts`); sending requires `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` defaults to Resend's unverified-domain test sender, which only delivers to Resend's own test addresses, so set a verified sender before relying on either in production.

To apply a provider score correction after settlement, first synchronize the corrected fixture and then call:

~~~bash
curl -X PATCH http://localhost:3000/api/jobs/settlement/PICK_ID \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Provider corrected the final score"}'
~~~

See DEVELOPER_HANDBOOK.md for the detailed project workflow and spec.md for product behavior.
