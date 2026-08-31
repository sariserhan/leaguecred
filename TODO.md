# Project Tasks

## In Progress

None.

## Next

- [ ] Check any SUSPECT pair `pnpm teams:dedupe` reports and add an alias where
      the two really are one club. Nothing to act on today: the only pair is Boca
      Juniors beside Atlético Junior, which is the rule working, not a fault.
- [ ] Set the founding-season rank threshold in the admin panel. It ships at the
      standard 10, which nobody can reach for 10 gameweeks; 4 opens Follow after
      about a month. Raise it back once a cohort has cleared it.
- [ ] Rotate the Neon database password and update Vercel and .env.local
- [ ] Design a real brand mark. `icon.tsx`/`apple-icon.tsx` currently generate
      an "LC" monogram from the theme colors as a placeholder - swap in a
      real logo when one exists. `opengraph-image` and a web manifest still
      have nothing to build from.

## Blocked

None.

## Later

- [ ] Additional launch leagues with current provider mappings
- [ ] Leagues outside football-data.org's free-tier list (Liga MX, MLS,
      Saudi Pro League, Argentina, and the rest not in FOOTBALL_DATA_ORG_
      COMPETITIONS) rely on ESPN alone. football-data-uk covers 12 of them
      but is deliberately unwired (it never added a match ESPN didn't
      already have). Decide whether ESPN-only is acceptable for those
      leagues or a real second source is worth adding for them specifically.
- [ ] Product/web analytics (deferred; PostHog is the marketplace pick when this is picked up)
- [ ] Decide whether expertise is scoped to clubs as well as leagues
- [ ] Consider live in-UI feedback (toast or similar) when another user's
      action is relevant right now - e.g. a followed specialist locking while
      you're on the page. Today the notification bell only updates on the
      next page load; nothing pushes while you're already looking at a page.

## Completed

- [x] Add account settings for profile, password, league, network, and notification controls
- [x] Add founding-season and provisional specialist discovery states
- [x] Add management views for upcoming fixtures, recent accounts, and provisional records
- [x] Add dedicated loading and recovery states for network and settings
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
- [x] Resolve the last clubs catalogued twice under names that disagree
- [x] Match clubs numbered by founding order to their plain spelling
- [x] Make the rank threshold a setting, so a founding season can open at a lower bar
- [x] Refuse to run migrations that the database can no longer reach
- [x] Block disposable-email signups and surface shared-address abuse signals to admins
