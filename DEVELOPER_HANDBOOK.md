# LeagueCred Developer Handbook

## Purpose

LeagueCred lets users prove expertise in one domestic football league through an immutable independent prediction record and follow proven specialists in leagues they do not understand.

The project-specific product source of truth is spec.md. AI_WEB_APP_DEVELOPMENT_ROADMAP.md is a reference checklist and must not expand product scope.

## Current architecture

- Next.js 16 App Router, React 19, and strict TypeScript
- Tailwind CSS v4 and shadcn/ui with Base UI primitives
- PostgreSQL accessed through Drizzle ORM and Postgres.js
- Better Auth email/password authentication with database sessions
- server actions for lock, reveal, and follow transactions
- API-Football behind a normalized fixture-provider interface
- protected fixture-sync and settlement route handlers for schedulers
- immutable settlement events with a separate active-effect projection
- static marketing UI and dynamic database-backed league routes

## Repository structure

~~~text
src/app/                    Pages, server actions, auth, and protected job routes
src/components/             Product UI and shadcn source components
src/data/                   Database-backed page queries
src/db/                     Schema, migration runner, seed, and integration tests
src/providers/              Normalized football provider interface and API-Football
src/services/               Fixture synchronization and settlement transactions
src/jobs/                   Command-line job entry points
drizzle/                    Versioned SQL migrations and metadata
docs/design/                Accepted visual concepts
spec.md                     Product and engineering specification
TODO.md                     Active implementation tasks
~~~

## Prerequisites

- Node.js 24
- pnpm 11
- Docker with Compose

The supported versions should remain aligned with package.json and the lockfile.

## Commands

| Command | Purpose |
|---|---|
| pnpm dev | Starts the local Next.js development server. |
| pnpm db:up | Starts the development PostgreSQL service. |
| pnpm db:migrate | Applies committed Drizzle migrations. |
| pnpm db:seed | Adds idempotent local league and specialist data. |
| pnpm db:generate | Generates a migration after a schema change. |
| pnpm fixtures:sync | Synchronizes recent results and the next 14 days from the free fixture sources. |
| pnpm settle | Settles every eligible pending independent pick. |
| pnpm test | Runs deterministic unit tests. |
| pnpm test:integration | Migrates, seeds, and tests isolated PostgreSQL on port 54330. |
| pnpm check | Runs lint, typecheck, unit tests, and production build. |
| pnpm check:full | Runs the standard gate plus PostgreSQL integration tests. |

## Environment variables

Copy `.env.example` to `.env.local`. The application uses:

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: high-entropy session-signing secret
- `BETTER_AUTH_URL`: canonical application origin
- `API_FOOTBALL_KEY`: server-only API-Football credential
- `API_FOOTBALL_BASE_URL`: provider endpoint override
- `FOOTBALL_DATA_API_KEY`: free football-data.org token for Champions League fixtures
- `FOOTBALL_DATA_BASE_URL`: football-data.org endpoint override
- `CRON_SECRET`: bearer secret for protected job routes

Never prefix these secrets with `NEXT_PUBLIC_`, commit real values, or reuse development credentials in production.

## Development workflow

1. Read spec.md and TODO.md.
2. Inspect git status and preserve unrelated work.
3. Read the relevant installed skills and bundled Next.js documentation.
4. Implement the smallest complete product slice.
5. Add or update deterministic tests.
6. Run pnpm lint, pnpm typecheck, pnpm test, and pnpm build.
7. Verify desktop and mobile behavior in a real browser.
8. Inspect the final diff and security boundaries.
9. Update TODO.md and this handbook when architecture or scripts change.
10. Create a focused local commit. Never push without explicit user permission.

## Design workflow

Accepted concepts live under docs/design.

The active visual system is:

- true-white background
- deep navy foreground
- grass-lime primary accent
- Barlow Condensed editorial headings
- Inter UI and body text
- thin dark rules and minimal radius
- open tables and lists instead of default card grids
- no odds, payout language, casino styling, or guaranteed-win claims

New screens should extend this system and be checked against the existing concepts at desktop and mobile sizes.

## Testing

Unit tests cover accuracy, sample-size eligibility, and confidence-adjusted ranking. PostgreSQL integration tests prove lock immutability, followed/independent separation, idempotent correction events, and frozen matchweek eligibility. The integration database is a separate Docker service with temporary storage and a hard-coded test URL.

Browser QA should cover two accounts: one creates and reloads an independent lock; the second reveals specialists, accepts the attribution warning, follows a pick, reloads, and confirms independent fixtures remain disabled.

## Operations

- Vercel invokes `GET /api/jobs/fixtures` daily at 04:00 UTC; manual schedulers may use GET or POST with `Authorization: Bearer $CRON_SECRET`.
- Fixture sync fetches recent results plus a 14-day domestic window and a 35-day Champions League window, recording request counts and failures in `api_sync_runs`.
- Football-Data.co.uk is fetched as one fixture CSV and one in-memory season ZIP for all 12 domestic leagues; raw files are discarded after parsing.
- After participation or status change freezes a matchweek, provider sync may update scores/statuses but not add eligible fixtures or move kickoffs.
- Corrections require the provider fixture to be synchronized first, followed by `PATCH /api/jobs/settlement/:pickId` with a non-empty JSON `reason`.
- Correction events are append-only. Never edit or delete settlement history directly.
- Use a managed PostgreSQL service in production and run `pnpm db:migrate` during deployment.

## Operational constraints

- Independent and followed picks never share reputation effects.
- Revealing specialist picks permanently blocks a later independent pick for that matchweek.
- Server time is authoritative for reveal and lock deadlines.
- Lock, follow, settlement, and correction state changes run in database transactions.
- Provider data is synchronized server-side rather than fetched during page requests.
- No interface or ranking should imply certainty, guaranteed wins, betting odds, or profit optimization.
