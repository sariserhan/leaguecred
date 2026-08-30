# LeagueCred

LeagueCred is a league-expertise network for football supporters.

Users make one independent highest-confidence Weekly Lock in a domestic league they know. That permanent record establishes league-specific credibility. In leagues they do not know, they can follow proven specialists without presenting copied picks as independent expertise.

## Current vertical slice

The repository contains a working, responsive Prove-or-Follow application with:

- Better Auth email/password accounts and persistent sessions
- PostgreSQL and Drizzle-backed leagues, matchweeks, picks, follows, and records
- one immutable independent Weekly Lock per league and matchweek
- specialist reveal and attributed follow mode kept outside independent accuracy
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

The catalog seed idempotently loads the prioritized 2026 domestic league directory and API-Football league logos. Fixture synchronization requires `API_FOOTBALL_KEY`; it also upserts team names and logos from each returned fixture. API-Football's free plan does not expose current-season bulk team membership, so do not treat an older season's `/teams` response as the current roster.

HTTP schedulers can call `POST /api/jobs/fixtures` and `POST /api/jobs/settlement` with `Authorization: Bearer $CRON_SECRET`.

To apply a provider score correction after settlement, first synchronize the corrected fixture and then call:

~~~bash
curl -X PATCH http://localhost:3000/api/jobs/settlement/PICK_ID \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Provider corrected the final score"}'
~~~

See DEVELOPER_HANDBOOK.md for the detailed project workflow and spec.md for product behavior.
