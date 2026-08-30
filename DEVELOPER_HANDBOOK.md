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
- an admin role with a 404-guarded dashboard for site controls and diagnostics
- database-backed maintenance mode, site banner, and feature flags

## Repository structure

~~~text
src/app/                    Pages, server actions, auth, and protected job routes
src/app/admin/              Admin dashboard page and its server actions
src/components/             Product UI and shadcn source components
src/components/admin/       Site controls, feature flags, and diagnostics panels
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

Every script in `package.json`, grouped by purpose. Run all of them from the repository root.

### First run

~~~bash
pnpm install
cp .env.example .env.local
pnpm db:up          # start PostgreSQL on port 54329
pnpm db:migrate     # apply committed migrations
pnpm db:seed        # idempotent local leagues, fixtures, and specialists
pnpm dev            # http://localhost:3000
~~~

### Everyday development

| Command | What it does |
|---|---|
| `pnpm dev` | Starts the Next.js development server on port 3000. |
| `pnpm build` | Produces the production build. Also the last step of `pnpm check`. |
| `pnpm start` | Serves an existing production build. Run `pnpm build` first. |
| `pnpm lint` | Runs ESLint across the repository. |
| `pnpm typecheck` | Runs `tsc --noEmit` in strict mode. |

Serving a production build on another port, which is the reliable way to check real
HTTP status codes and server-side errors:

~~~bash
pnpm build
BETTER_AUTH_URL=http://localhost:3100 pnpm start -p 3100
~~~

### Database

| Command | What it does |
|---|---|
| `pnpm db:up` | Starts the development PostgreSQL container on port 54329. |
| `pnpm db:down` | Stops the Compose services. |
| `pnpm db:migrate` | Applies every committed migration in `drizzle/`. |
| `pnpm db:migrate:deploy` | The deploy-time migration, with its production and configured-database guards. |
| `pnpm db:generate` | Generates a migration after editing `src/db/schema.ts`. |
| `pnpm db:seed` | Loads idempotent local leagues, fixtures, and specialists. |
| `pnpm db:seed:catalog` | Loads the 25-competition catalog and team badges. |
| `pnpm db:reset` | Destroys the volume, then recreates, migrates, and seeds. |
| `pnpm db:test:up` | Starts the isolated test database on port 54330. |
| `pnpm db:test:down` | Stops the test database. |

Changing the schema is always two steps, and the generated SQL is reviewed before it is
committed:

~~~bash
# 1. edit src/db/schema.ts, then
pnpm db:generate            # writes drizzle/NNNN_name.sql and its snapshot
# 2. read the generated SQL, then
pnpm db:migrate
~~~

`pnpm db:reset` deletes all local data. It is for a corrupted development database, never
for anything shared.

### Jobs and operations

| Command | What it does |
|---|---|
| `pnpm fixtures:sync` | Syncs recent results and the next 14 days from the free fixture sources. |
| `pnpm settle` | Settles every eligible pending independent pick. |
| `pnpm teams:logos` | Backfills missing team badges. |
| `pnpm admin:grant EMAIL` | Grants the admin role. Add `--revoke` to remove it. |

~~~bash
pnpm fixtures:sync
pnpm settle

pnpm admin:grant you@example.com              # promote an existing account
pnpm admin:grant you@example.com --revoke     # demote back to member
~~~

The account has to exist before it can be promoted, so sign up in the application first.
`pnpm admin:grant` is the only way to create the first administrator; there is deliberately
no in-product promotion path. Email matching is case-insensitive.

The same jobs run over HTTP for a scheduler, authorized with `CRON_SECRET`:

~~~bash
curl -X POST http://localhost:3000/api/jobs/fixtures \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST http://localhost:3000/api/jobs/settlement \
  -H "Authorization: Bearer $CRON_SECRET"

# apply a provider score correction after the fixture is re-synchronized
curl -X PATCH http://localhost:3000/api/jobs/settlement/PICK_ID \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Provider corrected the final score"}'
~~~

### Testing

| Command | What it does |
|---|---|
| `pnpm test` | Runs the deterministic unit tests. |
| `pnpm test:watch` | Runs Vitest in watch mode. |
| `pnpm test:integration` | Starts the test database, migrates, seeds, and runs the PostgreSQL tests. |

`pnpm test:integration` manages its own database on port 54330 and hard-codes that URL, so it
never touches the development data on 54329.

~~~bash
pnpm test                          # everything except *.integration.test.ts
pnpm test src/lib/reputation       # a single suite by path fragment
pnpm test:integration
~~~

### Quality gates

| Command | What it does |
|---|---|
| `pnpm check` | Runs lint, typecheck, unit tests, and the production build. |
| `pnpm check:full` | Runs `pnpm check` plus the PostgreSQL integration tests. |

`pnpm check` is the gate for a normal change and `pnpm check:full` for anything touching the
schema, settlement, or a query. Neither one runs the application, so neither can catch a
runtime fault in code they compile successfully — see Verification below.

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
- `RESEND_API_KEY`: Resend credential for verification and password-reset email
- `RESEND_FROM_EMAIL`: optional override for every sender identity, for use while the domain is unverified

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
- one optional admin banner strip above the header, in info, warning, or critical tone

New screens should extend this system and be checked against the existing concepts at desktop and mobile sizes.

## Test coverage

Unit tests cover accuracy, sample-size eligibility, confidence-adjusted ranking, record
summaries, site settings and feature-flag resolution, and timestamp normalization.

PostgreSQL integration tests prove lock immutability, followed/independent separation,
idempotent correction events, and frozen matchweek eligibility. The integration database is a
separate Docker service with temporary storage and a hard-coded test URL, so it never touches
development data.

Pure logic belongs in `src/lib` so it can be tested without a database. Anything that reaches
Postgres is proven by an integration test or by running the application, not by a unit test
with a mocked driver.

## Verification

Lint, typecheck, and build only prove the code compiles. They cannot catch a value whose
runtime shape differs from its type annotation, and the raw SQL layer is full of those: a
row type in `sqlClient<Array<{ ... }>>` is a hand-written claim the driver never checks.

A dashboard once rendered completely blank because a timestamp column was annotated `Date`
while Postgres.js returned a string, and `.toISOString()` threw. Every gate passed. Only
loading the page found it, which is why `src/lib/timestamps.ts` exists and why any timestamp
read goes through it.

So anything touching a query, a server action, or a page is also checked by running it:

~~~bash
pnpm build && BETTER_AUTH_URL=http://localhost:3100 pnpm start -p 3100
~~~

A production server gives real status codes and logs server-side exceptions that a streamed
error boundary hides in the browser. Two behaviours to know when reading a response by hand:

- `redirect()` inside a streaming render emits a client-side `<meta http-equiv="refresh">`
  rather than a 307, so `curl` reports 200 and does not follow it. Check for the meta tag,
  and confirm the guarded content is genuinely absent from the body.
- React separates interpolated values with `<!-- -->`, so a fixed-string search for copy that
  contains an expression fails. Strip the comments first: `sed 's/<!-- -->//g'`.

Browser QA should still cover two accounts: one creates and reloads an independent lock; the
second reveals specialists, accepts the attribution warning, follows a pick, reloads, and
confirms independent fixtures remain disabled. For admin work, check both roles: a member
must get a 404 at `/admin`, and an admin must keep browsing the site while maintenance is on.

## Operations

- Vercel runs two cron jobs, both by `GET` with `Authorization: Bearer $CRON_SECRET`:
  `GET /api/jobs/daily` at 04:00 UTC and `GET /api/jobs/reminders` at 09:00 UTC.
- `/api/jobs/daily` chains fixture sync, then settlement, then team-logo backfill. The order is
  the point: settlement reads final scores, so it has to run after the sync rather than beside
  it. Steps are independent, so one failure is recorded and the rest still run, and every step
  is idempotent, so the next night recovers whatever failed.
- Two cron entries is also the limit on a Hobby project, which is why the nightly work is one
  chained route rather than three separate schedules.
- The individual routes stay for manual runs: `/api/jobs/fixtures`, `/api/jobs/settlement`,
  `/api/jobs/team-logos`, `/api/jobs/reminders`. All accept GET or POST with the same bearer.
- The daily route answers 500 when any step failed, so a silent nightly failure shows up in the
  Vercel cron log rather than only in the admin diagnostics.
- Fixture sync fetches recent results plus a 14-day domestic window and the complete current Champions League season, recording request counts and failures in `api_sync_runs`.
- Football-Data.co.uk is fetched as one fixture CSV and one in-memory season ZIP for all 12 domestic leagues; raw files are discarded after parsing.
- After participation or status change freezes a matchweek, provider sync may update scores/statuses but not add eligible fixtures or move kickoffs.
- Corrections require the provider fixture to be synchronized first, followed by `PATCH /api/jobs/settlement/:pickId` with a non-empty JSON `reason`.
- Correction events are append-only. Never edit or delete settlement history directly.
- Use a managed PostgreSQL service in production. Migrations run themselves during deployment:
  Vercel prefers the `vercel-build` script, which applies committed migrations and only then
  builds. Shipping a column and shipping the code that needs it are no longer two separate acts
  someone has to remember to pair, and a failed migration fails the deploy rather than putting
  code live against a schema that cannot serve it.
- Only a production build migrates. `DATABASE_URL` is scoped to Preview as well as Production
  and both point at the same database, so without that guard a preview of an unmerged branch
  would apply its schema to production first. A build with no database configured skips quietly,
  which is why a local `pnpm build` and `pnpm check` never touch one.
- `pnpm db:migrate:deploy` is the same step, for running by hand. `DATABASE_URL_UNPOOLED` is
  preferred when set, since a connection pooler is the wrong place for DDL.
- Bootstrap the first administrator with `pnpm admin:grant you@example.com` after the account exists. There is deliberately no in-product way to promote an account.
- `/admin` controls maintenance mode, the site banner, and feature flags. Every change applies to all visitors on their next request.
- Maintenance mode redirects members and signed-out visitors to `/maintenance`. Admins keep browsing the real site, otherwise maintenance could only be switched off from the database.
- Feature flags are defined in `src/lib/site-settings.ts` and stored in `feature_flags`. A flag with no stored row falls back to the default in its definition, so a fresh database needs no seeding.

### Email

Every message the product sends is built in `src/lib/email-templates.ts` and goes out through
`sendEmail` in `src/lib/email.ts`, which is the only place that talks to Resend. Templates
share one shell, so a new message inherits the branding, the responsive scaffolding, and the
width the others use. Two tests enforce that: all messages must reduce to an identical tag
skeleton, and their rendered sizes must stay within ten percent.

Senders are chosen per message in `src/lib/email-senders.ts`, so the address itself says what
arrived:

| Message | From |
|---|---|
| Password reset | `no-reply@leaguecred.com` |
| Address verification | `welcome@leaguecred.com` |
| Lock reminder | `notification@leaguecred.com` |

Every message sets `Reply-To: support@leaguecred.com`, so a reply from someone who ignores
"no-reply" still reaches a person.

These addresses only work once `leaguecred.com` is verified at
https://resend.com/domains. Until then Resend rejects them with a 403 and `RESEND_FROM_EMAIL`
overrides every identity, which is the way to keep mail working in the meantime.

Anything user-controlled that reaches an email body — a display name above all — must pass
through `escapeHtml`. These templates concatenate strings with no framework escaping for them.

### Account recovery

Verification and password-reset mail go through Resend over its HTTP API; there is no SDK
dependency. `sendEmail` never throws, because Better Auth calls it while creating an account
and a mail outage must not turn into a failed sign-up.

Without `RESEND_API_KEY` the behaviour depends on the environment. Outside production the
message is written to the server log, including the link, so the whole flow can be exercised
locally with no provider at all. In production the failure is logged as an error and nothing
is sent, which means **account recovery is unavailable until the key is set**.

Sign-in is deliberately not gated on a verified address (`requireEmailVerification: false`).
A Weekly Lock record is permanent and cannot be rebuilt, so locking someone out of an account
they can still prove they own does more damage than an unverified address does. Verification
exists to keep the account recoverable, not to police entry. Flip the flag only once mail
delivery is known to be reliable.

Reset links last one hour and are single use. The request endpoint answers with the same
message whether or not the address has an account, so it cannot be used to discover who has
registered.

## Operational constraints

- Independent and followed picks never share reputation effects.
- Revealing specialist picks permanently blocks a later independent pick for that matchweek.
- Server time is authoritative for reveal and lock deadlines.
- Lock, follow, settlement, and correction state changes run in database transactions.
- Provider data is synchronized server-side rather than fetched during page requests.
- No interface or ranking should imply certainty, guaranteed wins, betting odds, or profit optimization.
- `/admin` answers with a 404 rather than a 403 so it never confirms its own existence to a member.
- The admin role is read from the database on every request, so revoking it takes effect immediately rather than at the next sign-in.
- Only flags defined in the application can be toggled; a stored row without a definition is shown as undefined and is read-only.
- Reading site settings fails open. A database problem leaves the banner hidden and maintenance off rather than taking the site down.
