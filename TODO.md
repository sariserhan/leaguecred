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
- [ ] Show the visit count in the admin funnel. Cloudflare Web Analytics now
      collects visits, but only in Cloudflare's own dashboard; the funnel in
      `src/data/distribution.ts` still hardcodes `visits: null`, so the UI keeps
      saying “Not tracked”. Filling it in means calling Cloudflare's GraphQL
      Analytics API, which needs an account API token held as a real secret —
      unlike the beacon token, which is public.
- [ ] Drop a switched-off feature's URL from sitemap.xml without a deploy.
      `src/app/sitemap.ts` now filters /challenges and /live-locks by their
      flags, but the route is prerendered at build, so the filter reflects the
      flags as they stood at deploy time. Toggling a flag afterwards leaves the
      old URL listed until the next build. Fixing it properly means making the
      sitemap dynamic, which puts its league, team and specialist queries on
      every crawl.
- [ ] Decide whether expertise is scoped to clubs as well as leagues

## Completed

- [x] Group the admin page into tabs, and report what a result pull found —
      including when it found nothing, which is the usual answer between
      matchdays and read as a dead button.
- [x] Pull results on demand from the admin panel, for one league or all of
      them, with the outcome reported rather than left silent.
- [x] Pull match results hourly without re-syncing the schedule. `/api/jobs/results`
      reads the fixtures already waiting on a result, asks only the leagues that
      played and only for those days, updates scores in place, and settles the
      picks they decide. No inserts, no matchweeks, no logos, and no request at
      all on a quiet hour.

- [x] Put the Community Challenge and the global active-locks board behind
      admin feature flags. Both default to on, so nothing changes until an admin
      turns one off in the panel; off means the pages 404, every link into them
      disappears from the header, footer, mobile bar, league pages and member
      home, the server actions refuse writes, and the URLs leave the sitemap.

- [x] Say in the Cookie Notice and Privacy page that analytics now run, and
      what they store. Written from the visitorping tracker source rather than
      guessed: local storage, no cookies.
- [x] Settle the two-analytics question: keep both. visitorping is our own
      product, not a third-party vendor, so it does not duplicate the Cloudflare
      beacon so much as sit beside it. Both are now gated to production by one
      `isProduction` in `src/app/layout.tsx`, so neither counts our own building
      and reviewing as visitor traffic.
- [x] Add privacy-conscious visitor analytics with a production-only Cloudflare
      Web Analytics beacon
- [x] Add club identity, founding roles, referral attribution and activation, Community Challenges, public weekly recaps, post-lock invitation prompts, league density states, and admin distribution analytics
- [x] Design and implement the Tactical Hex Radar brand mark across icon.tsx, apple-icon.tsx, opengraph-image.tsx, web manifest, and site header/footer
- [x] Add live in-UI notification feedback for followed specialist locks,
      settled results, unread counts, and direct navigation
- [x] Add Weekly Lock timelines, dashboard activity, milestones, record sharing, global search, grouped notifications, and comparison UI
- [x] Add the notification inbox, season archive, matchweek calendar, activation checklist, mobile member navigation, share-card tools, and UI regression coverage
- [x] Add command navigation, dashboard customization, performance charts, richer comparisons, calendar exports, profile presentation controls, and responsive history tools
- [x] Add persisted profile customization, a contextual product tour, network activity feed, loading transitions, and automated accessibility coverage
- [x] Add avatar upload and cropping, anchored onboarding guidance, post-match reviews, and zoom/high-contrast accessibility regressions
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
- [x] Replace the drawn hero pitch with a photograph of a real one
- [x] Drop the square button frame from around the round header avatar
- [x] Create a member from the admin panel and record their locks on matches already played
- [x] Filter the performance trend by every league a specialist has played, not only the recent few
- [x] Stop two providers filing the same match twice, and clear the duplicates already stored
- [x] Split the Liga Portugal week that had swallowed two others
- [x] Close a lock on its own kickoff, so a week stays callable after its first match
- [x] Choose a team for several days and lock them in one go
- [x] Add a board of every league's fixtures by day, with voting, discussion and locking
- [x] Answer 404 for a page that does not exist, instead of 200 with a not-found screen
- [x] Redirect the old /teams/<name>-<id> links to the canonical team slug
- [x] Keep members-only routes out of the sitemap and the index
- [x] Give the light theme a page tone, so white cards read as raised
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
