# Project Tasks

## In Progress

None.

## Next

- [ ] Confirm the three crons in `vercel.json` are actually running on their
      stated schedules. Hobby allows two and runs them about once a day whatever
      the expression says, so on Hobby the hourly `/api/jobs/results` pull
      quietly becomes a daily one and an evening match waits for the 04:00
      chain — the delay that job exists to remove. Vercel's Cron Jobs tab
      against `vercel.json` settles it.
- [ ] Set `RESEND_FROM_EMAIL` in Vercel, or confirm it is already set. Unset, it
      falls back to Resend's test sender, which only delivers to Resend's own
      addresses — so the lock reminders and specialist-lock notifications, the
      two things that create a reason to come back daily, reach nobody and say
      nothing about it. `ALERT_EMAIL` is worth setting at the same time.
- [ ] Finish the Cache Components migration. The flag is off; a trial run
      showed the mechanical part is removing 24 `force-dynamic` exports, and the
      real work is that the root layout reads the session outside a `<Suspense>`
      boundary, so nothing in the app can prerender. It needs the header, slip
      dock and member nav moved behind boundaries with a neutral fallback (not a
      signed-out one, which would flash the wrong state), `use cache` plus
      `cacheTag` on leagues, flags and settings, and `updateTag` from the admin
      actions. It also turns on PPR and `<Activity>` navigation app-wide, which
      preserves component state across navigations — dialogs and dropdowns need
      a look. Wait until CI has run green at least once; that is the net this
      was sequenced behind.
- [ ] Check any SUSPECT pair the admin Duplicate clubs panel reports (same
      report as `pnpm teams:dedupe`) and add an alias where the two really are
      one club. Boca Juniors beside Atlético Junior is the rule working, not a
      fault.
- [ ] Set the founding-season rank threshold in the admin panel. It ships at the
      standard 10, which nobody can reach for 10 gameweeks; 4 opens Follow after
      about a month. Raise it back once a cohort has cleared it.
- [ ] Rotate the Neon database password and update Vercel and .env.local

## Blocked


## Later

- [ ] Verify the installed app on real devices. The manifest, the four icon
      sizes and the offline page were checked over HTTP, but the service worker
      itself — install, precache, offline navigation, the update toast — was
      never exercised in a browser: Chromium will not launch in this dev
      container (`libatk-1.0.so.0` missing), so the whole Playwright suite is
      unrunnable here. Test on a preview deploy with Chrome DevTools
      (Application > Service Workers, then Network > Offline) and by adding it
      to an iPhone home screen.
- [ ] Decide whether web push is worth it now the app installs. It would reach
      members on the lock reminder and settle paths that only email covers
      today, but it needs VAPID keys as real secrets, a table of subscriptions
      per device, and a sending path alongside `send-lock-reminders`. iOS only
      delivers it to an app added to the home screen, which is the piece that
      was missing until now.
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
- [ ] A tested restore, not just Neon's retention. The product promise is that
      a Daily Lock record is permanent and cannot be rebuilt, which is load
      bearing enough to deserve a restore somebody has actually performed once.
- [ ] Move the production Neon credentials out of `.env.local`. Rotating the
      password (above) fixes the exposure; keeping ten `PROD_*` keys on a laptop
      recreates it. `vercel env pull` on demand, or a read-only role for the
      scratch scripts.
- [ ] A real Content-Security-Policy. The other four security headers now ship;
      a script-src does not, because the theme script in the root layout runs
      inline before first paint and a correct CSP needs a per-request nonce.
      Written without one it would either break the page or be loose enough to
      be theatre.
- [ ] Add the trigram indexes when the catalogue justifies them. Measured at
      20,000 synthetic clubs the GIN index takes global search from 9.1ms to
      1.4ms, but Postgres declines to use it at the current 504, so shipping it
      now would add an unused index and a `pg_trgm` extension for nothing.
- [ ] Decide whether expertise is scoped to clubs as well as leagues

## Completed

- [x] Run the quality gates on push: a CI workflow with lint, typecheck, unit
      tests and build; the integration suite against a Postgres service
      container; and Playwright against a real build, including the browser
      coverage no container without the system libraries could run. New e2e
      specs cover sign-up, the `/admin` 404, and the offline path — the device
      check the PWA work left open. Their first CI run is what proves them.
- [x] Report the failures nobody was going to be told about: every server error
      Next.js catches, with the digest the browser shows, and every failed cron
      step, both on one greppable token, plus an optional `ALERT_EMAIL`.
- [x] Stop the open endpoints costing more than they need to: global search is
      rate limited and debounced, and the notification poll backs off when
      nothing is happening.
- [x] Make the site installable and survive a dropped connection: a full
      manifest with maskable icons and shortcuts, a service worker that caches
      shared assets but never a page, an /offline fallback, an install button in
      the footer with Safari's Share-sheet instructions, and a toast offering
      the new version when a deploy lands under an open app.
- [x] Give the leaderboards a page of their own — one table across every league
      and one per league — linked from the navigation, and mark the league page's
      own section tabs against the section actually on screen rather than always
      the first.

- [x] Filter the fixtures board by league and by day, in the browser, with a day
      left empty by a filter dropped rather than shown as a bare heading.

- [x] Point every internal profile link at the handle rather than the id, so no
      click inside the product pays for a redirect. The remaining id links are
      the admin panel's and the deliberate /u/<id> alias.

- [x] Give every member a handle, and let display names repeat again. The
      handle identifies and addresses a member — /specialists/<handle>, with
      ids permanently redirecting — while the display name goes back to being
      what someone is called. Backfilled from existing names; chosen at sign-up
      and changeable in settings.

- [x] Offer the slip wherever a match is shown — the global board, the fixtures
      board, a league's matchweek and a club's upcoming games — and have every
      lock and every addition land in the docks without a page change.

- [x] Dock the locks beside the slip on every page, with nothing on them that
      removes anything, and put a warning in front of every lock: the fixtures
      board could lock several calls in one press with no confirmation at all.

- [x] Make the live board usable at sixty locks: filter by league, member and
      matchday, vote a call up or down, follow the member, set a match aside on
      your slip, and see your own locked games — all from a card compact enough
      to scan. A slip is the shortlist, kept in a dock beside every page rather
      than on a route of its own; the lock is made from it there.

- [x] Read the duplicate-club report and merge from the admin panel, rather than
      only from `pnpm teams:dedupe` with a production database URL to hand. The
      evidence and the merge itself are shared with the job, so the two cannot
      come to different conclusions about what is one club.

- [x] Keep what a job run did. Every run — the hourly and nightly crons and the
      admin buttons alike — now stores its own counts on `api_sync_runs.details`
      and Diagnostics reads them back, so "what did that run see" is answerable
      afterwards instead of only while the panel that reported it is on screen.

- [x] Score the fixtures a retired provider recorded. Only ESPN syncs now, and
      both jobs matched a row by ESPN's own id alone, so a row written by
      football-data.org or football-data-uk was never updated: it stayed
      "scheduled" for ever, never settled, and showed nowhere, since a team page
      lists a past match only once it has finished. Both jobs now fall back to
      matching on the two clubs and the day.

- [x] Never lose a played match. A fixture arriving into a week that has already
      locked or taken picks is now recorded rather than dropped, and a played
      match in a week that is still open shows its result immediately instead of
      waiting for the whole week to finish. Süper Lig's Beşiktaş 6–2 Çorum FK on
      Monday 2026-08-31 was the case that surfaced both.

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
