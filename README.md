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
- admin diagnostics for fixture sync runs and the settlement correction ledger
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
pnpm admin:grant you@example.com
~~~

`pnpm admin:grant` is the only way to create the first administrator; add `--revoke` to remove the role. Administrators reach `/admin` to switch maintenance mode on, publish a site banner, toggle feature flags, and review recent sync runs and settlement corrections. The route answers with a 404 for everyone else, so it never confirms its own existence.

The catalog seed idempotently loads the 25 competitions currently supported by the product, including the major European domestic leagues and UEFA competitions, selected leagues in the Americas and Middle East, and Copa Libertadores. It seeds league metadata from API-Football and 290 team records with badges from TheSportsDB. The 298 league/team memberships are deliberately marked partial because TheSportsDB's free league endpoint is capped and cup membership is inferred from a limited event sample; the UI communicates that status rather than presenting the lists as complete rosters.

Fixture synchronization uses Football-Data.co.uk's published CSV files for the 12 supported domestic fixture feeds and their recent final results. The files are parsed in memory and discarded; Neon stores normalized fixtures, scores, provider aliases, and sync-run metadata. Champions League fixtures and delayed results come from football-data.org when `FOOTBALL_DATA_API_KEY` is configured. API-Football remains available for catalog metadata but is no longer the default fixture source.

HTTP schedulers can call `POST /api/jobs/fixtures`, `POST /api/jobs/settlement`, and `POST /api/jobs/reminders` with `Authorization: Bearer $CRON_SECRET`.

`pnpm remind` emails anyone who has ever locked, followed, or been followed in a league about an upcoming matchweek closing within 24 hours, if they have not yet made this week's independent Weekly Lock. Each user is reminded at most once per matchweek (tracked in `lock_reminders`). Sending requires `RESEND_API_KEY`; `RESEND_FROM_EMAIL` defaults to Resend's unverified-domain test sender, which only delivers to Resend's own test addresses, so set a verified sender before relying on this in production.

To apply a provider score correction after settlement, first synchronize the corrected fixture and then call:

~~~bash
curl -X PATCH http://localhost:3000/api/jobs/settlement/PICK_ID \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Provider corrected the final score"}'
~~~

See DEVELOPER_HANDBOOK.md for the detailed project workflow and spec.md for product behavior.
