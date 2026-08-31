# Project Tasks

## In Progress

None.

## Next

- [ ] Three clubs the fixtures say are one but the names do not: Stade Rennais
      and Rennes, Athletic Club and Athletic Bilbao, Deportivo and Deportivo de
      A Coruña. `pnpm teams:dedupe` reports them and leaves them alone.
- [ ] Look at the two clubs the dedupe leaves for review on production: Slavia
      Prague is split across `slavia-prague` (no league) and `sk-slavia-praha`,
      which look like one club but share no evidence the job will act on.
- [ ] Rotate the Neon database password and update Vercel and .env.local

## Blocked

None.

## Later

- [ ] Additional launch leagues with current provider mappings
- [ ] Analytics and abuse monitoring
- [ ] Decide whether expertise is scoped to clubs as well as leagues
- [ ] Plan the first season, when no record clears the rank threshold yet

## Completed

- [x] Define the league-expertise exchange product model
- [x] Build the Next.js and shadcn foundation
- [x] Implement homepage, league discovery, and dynamic league routes
- [x] Implement responsive loading, not-found, and error states
- [x] Add accuracy and confidence-adjusted ranking tests
- [x] Design and migrate the PostgreSQL/Drizzle schema
- [x] Add Better Auth email/password authentication
- [x] Persist independent and followed participation modes
- [x] Enforce immutable Weekly Locks and irreversible specialist reveal
- [x] Replace prototype state with database queries and transactions
- [x] Add API-Football synchronization with frozen matchweek eligibility
- [x] Add idempotent settlement and an append-only correction ledger
- [x] Add isolated Dockerized PostgreSQL integration tests
- [x] Verify the two-user Prove-or-Follow flow in a real browser
- [x] Add current-season and career leaderboard views
- [x] Add an admin role, dashboard, and 404-guarded admin route
- [x] Add admin-controlled maintenance mode and site banner
- [x] Add database-backed feature flags for the leaderboard and team catalog
- [x] Add admin diagnostics for fixture sync runs and settlement corrections
- [x] Add public specialist profiles
- [x] Add personal weekly slip
- [x] Add password reset and email verification
- [x] Send every email through one shared transport and template system
- [x] Schedule fixture sync, settlement, and reminders via Vercel Cron
- [x] Add lock-reminder emails for an unmade Weekly Lock
- [x] Add notifications when a followed specialist locks
- [x] Add production hosting, managed PostgreSQL, and a verified sending domain
- [x] Merge the duplicate profile routes into /specialists
- [x] Apply database migrations during deployment
- [x] Trust the apex and www hosts as authentication origins
- [x] Lead the homepage with the exchange instead of the one-pick rule
- [x] Explain the exchange with named clubs across four countries
- [x] Give the hero one primary action and one credible accuracy range
- [x] Draw the hero pitch backdrop to real proportions, on grass
- [x] Reach any team page from a Teams menu in the header
- [x] Load the header's clubs a league at a time instead of shipping the catalog
- [x] Stop continental competitions creating a second row for a club, and a bogus country with it
- [x] Add an audit trail for admin setting and flag changes
- [x] Reconcile the two branches' migrations so both reach production in order
- [x] Merge the clubs catalogued twice, on dev and production
- [x] Count each match once in the standings, and each gameweek as one matchweek
- [x] Refuse to run migrations that the database can no longer reach
