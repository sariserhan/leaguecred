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
~~~

The catalog seed idempotently loads the 25 competitions currently supported by the product, including the major European domestic leagues and UEFA competitions, selected leagues in the Americas and Middle East, and Copa Libertadores. It seeds league metadata from API-Football and 290 team records with badges from TheSportsDB. The 298 league/team memberships are deliberately marked partial because TheSportsDB's free league endpoint is capped and cup membership is inferred from a limited event sample; the UI communicates that status rather than presenting the lists as complete rosters.

Fixture synchronization requires `API_FOOTBALL_KEY` and upserts team names and logos from returned fixtures. `FOOTBALL_DATA_API_KEY` is reserved for the football-data.org integration: its registered free tier can provide complete teams, crests, schedules, and delayed results for 10 of our selected competitions, at 10 requests per minute. It cannot cover all 25 competitions on the free plan.

HTTP schedulers can call `POST /api/jobs/fixtures` and `POST /api/jobs/settlement` with `Authorization: Bearer $CRON_SECRET`.

To apply a provider score correction after settlement, first synchronize the corrected fixture and then call:

~~~bash
curl -X PATCH http://localhost:3000/api/jobs/settlement/PICK_ID \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Provider corrected the final score"}'
~~~

See DEVELOPER_HANDBOOK.md for the detailed project workflow and spec.md for product behavior.
