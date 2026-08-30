# LeagueCred — Product & Engineering Specification

## 1. Product Summary

**LeagueCred** is a global league-expertise network where users prove which domestic football leagues they understand and share one highest-confidence match winner from those leagues each matchweek.

The core principle is:

> A person can be an Expert in Serie A and a Rookie in La Liga.

Users do not have one global football rating. They maintain an independent, accuracy-based record for every league in which they make original predictions.

Each matchweek, a user may make exactly **one Weekly Lock per league**: the single team they are most confident will win. Choosing the easiest or most obvious fixture is valid. The challenge is simply to be correct consistently.

Correct and incorrect picks build a permanent win/loss record and league-specific accuracy. Over time, users establish credibility, appear on league-specific leaderboards, gain followers for particular leagues, and help people who do not know those leagues.

The network exchange is:

> I share my strongest pick from the league I know. I discover the strongest pick from proven specialists in a league I do not know.

LeagueCred does not rank picks by betting odds, potential payout, profitability, or risk-adjusted return. It asks only whether the selected team won.

LeagueCred is not initially positioned as a betting or gambling product.

Primary positioning:

> **Know one league. Discover the people who know the others.**

---

# 2. Core Product Goals

LeagueCred should answer four questions:

### For competitors

> In which leagues has my prediction record earned trust?

### For visitors

> Who actually knows this league?

### For discovery

> What single team are the most proven specialists in this league most confident will win this week?

### For exchange

> What can I contribute from a league I know, and whose knowledge can I trust in a league I do not know?

The product must make football knowledge measurable through a permanent pre-match prediction record and make that verified knowledge useful to other people.

---

# 3. Initial Scope

## Sport

Football / soccer only.

Do not build support for basketball, NFL, baseball, hockey, cricket, etc. in V1.

The data model should avoid unnecessary football-specific assumptions where practical, but multi-sport support is not an MVP requirement.

---

# 4. Supported Competitions

Support only major top-flight domestic leagues.

Examples:

* England — Premier League
* Spain — La Liga
* Italy — Serie A
* Germany — Bundesliga
* France — Ligue 1
* Türkiye — Süper Lig
* Portugal — Primeira Liga
* Netherlands — Eredivisie
* Belgium — Pro League
* Scotland — Premiership
* Greece — Super League
* Austria — Bundesliga
* Switzerland — Super League
* Denmark — Superliga
* Norway — Eliteserien
* Sweden — Allsvenskan
* Poland — Ekstraklasa
* Czechia — First League
* Croatia — HNL
* Serbia — SuperLiga
* Romania — Liga I
* Brazil — Série A
* Argentina — Primera División
* Colombia — Primera A
* Chile — Primera División
* Uruguay — Primera División
* Mexico — Liga MX
* USA/Canada — MLS
* Canada — Canadian Premier League
* Japan — J1 League
* South Korea — K League 1
* Saudi Arabia — Saudi Pro League
* Australia — A-League
* selected additional top divisions

Do not include lower divisions such as:

* Serie B
* Championship
* 2. Bundesliga
* Ligue 2
* Turkish 1. Lig

Competitions must be controlled by an internal `enabled` flag.

Adding or removing a supported league should not require code changes.

---

# 5. Core User Flow

The primary loop is:

```text
Create account
↓
Choose leagues you know and leagues you want to follow
↓
Open a league you know
↓
Select ONE highest-confidence team as an independent Weekly Lock
↓
Submit
↓
Pick becomes immutable
↓
Independent pick unlocks this league's specialist picks
↓
Follow specialists in leagues you do not know
↓
Optionally follow one of their Weekly Locks
↓
Matches occur
↓
Result settles automatically
↓
Independent accuracy and specialist credibility update
↓
Leaderboard updates
↓
Repeat next matchweek
```

---

# 6. Weekly Lock

A **Weekly Lock** is the user's single highest-confidence predicted winner for a league's current official matchweek.

Example:

```text
Süper Lig — Matchweek 8

Galatasaray vs Kasımpaşa
Fenerbahçe vs Antalyaspor
Beşiktaş vs Konyaspor
Trabzonspor vs Rizespor

Choose the ONE team you believe is most likely to win.
```

User selects one team from one fixture.

The user is predicting only:

> selected team wins the match

Users are free to select the strongest favorite or easiest-looking fixture. LeagueCred does not award extra credit for difficult, rare, or high-odds selections. A win is a win and a loss is a loss.

"Weekly Lock" means the user's strongest personal conviction, not a guaranteed outcome. Product copy must never claim that any football result is certain or nearly guaranteed.

The user does not predict:

* score
* draw
* handicap
* over/under
* first goalscorer
* cards
* corners
* betting odds

---

# 7. Weekly Lock Rules

Each user may have:

```text
maximum 1 pick
per user
per league
per matchweek
```

Enforce at database level.

Conceptually:

```sql
UNIQUE(user_id, league_id, matchweek_id)
```

Users may choose not to participate in a matchweek.

No explicit "PASS" record is required in V1 unless useful for analytics.

---

# 8. Pick Deadline

For fairness, all picks for a league's matchweek close when the **first fixture of that official matchweek begins**.

Example:

```text
Matchweek begins:
Friday 19:00

All Weekly Locks must be submitted before:
Friday 19:00
```

Users must not be allowed to wait until later matches in the weekend after observing earlier results.

Calculate:

```text
matchweek.lockAt =
earliest kickoff time
among eligible fixtures in that matchweek
```

Once `lockAt` passes:

* new picks cannot be submitted
* existing picks cannot be edited
* existing picks cannot be deleted

Server time is authoritative.

Never trust the user's client clock.

---

# 9. Pick Immutability

A submitted Weekly Lock becomes permanently attached to the user's record.

Before the league deadline, product policy may allow changing the pick if desired, but preferred V1 behavior is:

> Once submitted, the pick is locked immediately.

This creates a stronger integrity story and simpler implementation.

Recommended V1:

```text
Submit Weekly Lock
→ confirmation
→ permanent immediately
```

No editing.

No deleting.

No hiding losses.

---

# 10. Prediction Visibility and Knowledge Exchange

Users choose how they participate in each league for the current matchweek.

### Prove Your Knowledge

Before making an independent Weekly Lock, current specialist picks and consensus remain hidden. After submitting an immutable independent Weekly Lock, specialist picks are revealed and the user's pick counts toward independent accuracy, tier, and leaderboard position.

### Follow Experts

Instead of making an independent pick, a user may view specialist picks before the deadline and follow one specialist's Weekly Lock.

A followed selection:

* is attributed to the original specialist
* does not count toward the follower's independent accuracy, tier, or leaderboard position
* may be tracked separately as a network-assisted result

Once a user views current specialist picks for a league, that user cannot submit an independent rated pick in that league for that matchweek.

After the league deadline, picks become visible regardless of participation mode.

~~~text
PROVE YOUR KNOWLEDGE
Make your own pick before seeing specialists.
This builds your independent league record.

FOLLOW EXPERTS
See the strongest picks from proven specialists.
This does not build your independent league record.
~~~

Purpose:

Allow useful information sharing while preventing copied picks from being presented as proof of independent expertise.

---

# 11. Pick Settlement

Supported statuses:

```text
pending
win
loss
void
```

Settlement rules:

### WIN

Selected team wins the match.

### LOSS

Selected team:

* loses
* draws

A draw counts as a failed winner prediction.

### VOID

Use when the fixture cannot reasonably be scored.

Examples:

* cancelled
* abandoned without official final result
* competition removes match
* data-provider correction requires neutral settlement

VOID picks:

* do not add a win
* do not add a loss
* do not count toward accuracy
* remain visible in history

---

# 12. Postponed Matches

If a match is postponed after the Weekly Lock deadline:

Preferred behavior:

The pick remains attached to that fixture and settles when the rescheduled fixture is eventually completed.

If a fixture is permanently cancelled:

```text
result = void
```

Administrative override must exist.

---

# 13. Reputation Philosophy

Each user has a separate prediction record for each league. There is no global football score and no Elo-style rating.

~~~text
Serhan

Süper Lig
78.3% — 47 picks — Expert

Serie A
65.0% — 20 picks — Contender

Canadian Premier League
Follow mode — no independent record
~~~

The record represents demonstrated consistency specifically within that competition.

---

# 14. Initial Accuracy Model

V1 uses:

~~~text
Accuracy = wins / (wins + losses)
~~~

VOID results are excluded. Every eligible match has equal weight: a correct Weekly Lock is one win and an incorrect Weekly Lock is one loss.

Users may select the easiest-looking fixture or strongest favorite. LeagueCred does not reward difficulty, rarity, betting odds, payout, or profitability.

Display raw accuracy and win-loss record prominently.

For leaderboard ordering, use a confidence-adjusted calculation such as a Wilson lower bound so a 5–0 user does not automatically outrank a proven 42–8 specialist. This is an evidence adjustment, not a separate public rating.

Keep the calculation behind a service abstraction so its parameters can be tested and changed.

---

# 15. Career and Season Records

Maintain both career and current-season records per league.

Career accuracy is permanent proof of long-term consistency. Season accuracy creates a fresh competition and allows current specialists to emerge without erasing history.

Leaderboards should support season and career views.

---

# 16. Provisional Period

A user's first 10 settled non-void independent picks in a league are provisional.

~~~text
UNRANKED
6 / 10 qualifying picks completed
~~~

During placement:

* show win-loss record and raw accuracy
* exclude the user from the primary specialist leaderboard
* do not assign a public expertise tier
* never count followed picks

---

# 17. Expertise Tiers

Use:

~~~text
UNRANKED
ROOKIE
CONTENDER
SCOUT
ANALYST
PUNDIT
EXPERT
AUTHORITY
~~~

Tiers depend on both accuracy and minimum sample size. Do not finalize thresholds until historical simulations and initial data show realistic accuracy distributions when users can select the easiest fixture.

A tier never implies certainty or guarantees that a future pick will win.

---

# 18. Expertise Integrity

High accuracy with a small sample is not equivalent to proven expertise.

Tier and leaderboard calculations consider:

* independent wins and losses
* settled non-void sample size
* career versus current-season scope
* confidence-adjusted accuracy

Followed or previously viewed picks never build independent expertise. Always show the underlying evidence:

~~~text
78.3%
36 wins — 10 losses
46 settled picks
~~~

---

# 19. User League Statistics

Maintain independent career and season statistics:

~~~text
careerWins
careerLosses
careerVoids
careerSettledPicks

seasonWins
seasonLosses
seasonVoids
seasonSettledPicks

currentWinStreak
bestWinStreak
tier
leagueRank
leagueFollowerCount
~~~

Maintain followed-pick wins, losses, voids, and accuracy separately.

Accuracy is derived as wins divided by wins plus losses. VOID does not affect accuracy.

---

# 20. Leaderboards

Every supported league gets an independent specialist leaderboard.

~~~text
Süper Lig Specialists

#1 Aylin
84.2% — 48–9
57 independent picks
1,284 Süper Lig followers

#2 Serhan
81.6% — 40–9
49 independent picks
936 Süper Lig followers
~~~

Eligibility requires at least 10 settled non-void independent picks.

Order by confidence-adjusted accuracy, then raw accuracy, settled-pick count, and earlier achievement timestamp.

Always display raw accuracy and sample size. Do not present confidence adjustment as a mysterious public point score.

---

# 21. Ranking Scope

Leaderboards and follows are league-specific. A user can be trusted and followed for one league without being treated as an expert in every league.

Support current-season, career, followed-specialist, and most-followed specialist views as data becomes sufficient.

---

# 22. User Profile

The public profile contains identity information followed by league cards:

~~~text
Süper Lig

78.3% accuracy
36–10
46 independent picks

EXPERT
Season rank #14
Current streak: 5
1,240 league followers
~~~

Clearly distinguish:

* Leagues I Know
* Leagues I Follow

Following is league-specific, for example: Follow Serhan for Süper Lig.

---

# 23. League-Specific History

Expose immutable independent predictions. Losses can never disappear.

Followed selections appear in a separate attributed history:

~~~text
Canadian Premier League
Followed Liam's Forge FC pick
WIN
~~~

A followed result never appears as the follower's independent prediction.

---

# 24. Settlement and Correction Ledger

Never store only aggregate totals. Maintain an immutable settlement-event ledger containing the user, league, pick, season, event type, result, optional superseded event, reason, and timestamp.

Supported event types include:

~~~text
initial_settlement
reversal
correction
administrative_void
~~~

Do not enforce one ledger row per pick because corrected results require reversal and correction events. Instead, enforce that each pick has exactly one current active settlement effect.

The ledger supports auditing, rebuilding accuracy and streaks, provider corrections, and anti-cheat investigation.

---

# 25. Homepage

The homepage should communicate the exchange immediately.

~~~text
LEAGUECRED

Know one league.
Discover the people who know the others.

Share your strongest pick.
Follow proven specialists elsewhere.
~~~

Primary CTA:

~~~text
PROVE YOUR LEAGUE
~~~

Secondary CTA:

~~~text
FIND A LEAGUE SPECIALIST
~~~

Show active leagues and proven specialists only when enough evidence exists. Never describe a pick as guaranteed.

---

# 26. League Page

Route: /leagues/[slug]

Page sections:

* league header
* current matchweek
* Prove Your Knowledge or Follow Experts choice
* current user's independent accuracy, record, tier, and rank
* followed specialists for this league
* eligible specialist picks when revealed
* community consensus when revealed
* specialist leaderboard
* recent settled results

Before revealing picks, explain that following guidance forfeits an independent rated pick for that league and matchweek.

---

# 27. Participation Choice and Pick UI

The user first chooses:

~~~text
PROVE YOUR KNOWLEDGE
Make one independent pick before seeing specialists.

FOLLOW EXPERTS
See one highest-confidence pick from proven league specialists.
~~~

In independent mode, each fixture displays both selectable teams. Selecting a team highlights it and enables:

~~~text
LOCK GALATASARAY
~~~

Confirmation:

~~~text
Lock Galatasaray as your independent Süper Lig Week 8 pick?

This prediction cannot be changed.
After submitting, specialist picks will be revealed.
~~~

In follow mode, show each specialist's accuracy, sample size, tier, selected team, and immutable submission time. A user may attribute a followed selection with:

~~~text
FOLLOW LIAM'S PICK
~~~

---

# 28. Current Pick UI

Independent pick:

~~~text
YOUR INDEPENDENT WEEKLY LOCK

Galatasaray
vs Kasımpaşa

LOCKED
Counts toward your Süper Lig record
~~~

Followed pick:

~~~text
FOLLOWING LIAM'S WEEKLY LOCK

Forge FC
vs Cavalry FC

Does not count toward your Canadian Premier League expertise
~~~

Always show lock/follow timestamp and attribution.

---

# 29. Matchweek Representation

Do not assume every league uses simple integer round numbers perfectly.

Internal matchweek:

```text
id
leagueId
seasonId

providerRoundName
displayName

startAt
lockAt
endAt

status
```

Examples provider round names may be:

```text
Regular Season - 8
Clausura - 4
Opening - 3
Round 11
```

Normalize for display, but preserve provider value.

---

# 30. Seasons

Every league belongs to seasons.

```text
season
id
leagueId
providerSeason
name
startDate
endDate
isCurrent
```

Examples:

```text
2026
2026/27
2026 Clausura
```

Do not assume European calendar structure.

---

# 31. Football Data Provider

Initial provider:

**API-Football**

Use initially for:

* countries
* leagues
* seasons
* teams
* fixtures
* fixture statuses
* kickoff times
* final scores/results
* matchweek/round information

Do not use betting odds.

---

# 32. Provider Abstraction

Do not expose API-Football response structures outside integration layer.

Create interface conceptually:

```ts
interface FootballProvider {
  getSupportedLeagues(): Promise<ProviderLeague[]>
  getCurrentSeason(leagueExternalId: string): Promise<ProviderSeason>
  getFixtures(params): Promise<ProviderFixture[]>
  getFixture(id: string): Promise<ProviderFixture>
}
```

Implementation:

```text
ApiFootballProvider
```

Internal domain objects must use internal IDs.

Store API-Football identifiers as:

```text
provider
providerExternalId
```

This allows provider replacement later.

---

# 33. Database Technology

Use:

**PostgreSQL**

Recommended hosting:

**Neon Postgres**

ORM:

**Drizzle ORM**

Do not use Convex as primary database.

---

# 34. Application Stack

Recommended:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui

PostgreSQL / Neon
Drizzle ORM

Clerk or equivalent authentication

Vercel

API-Football

Sentry
PostHog
```

Exact auth provider may change without affecting domain architecture.

---

# 35. Core Database Tables

## users

```text
id
authProviderId

username
displayName
avatarUrl

createdAt
updatedAt
```

Username unique and case-insensitive.

---

## countries

```text
id
name
code
flagUrl
createdAt
```

---

## leagues

```text
id

provider
providerExternalId

countryId

name
slug
logoUrl

enabled
priority

createdAt
updatedAt
```

Unique:

```text
provider + providerExternalId
```

---

## seasons

```text
id
leagueId

providerSeason

name

startDate
endDate

isCurrent

createdAt
updatedAt
```

---

## teams

```text
id

provider
providerExternalId

name
shortName
logoUrl

countryId

createdAt
updatedAt
```

---

## fixtures

```text
id

provider
providerExternalId

leagueId
seasonId
matchweekId

homeTeamId
awayTeamId

kickoffAt

status

homeScore
awayScore

winnerTeamId nullable

lastSyncedAt

createdAt
updatedAt
```

Status should map provider statuses into normalized internal values.

---

## matchweeks

```text
id

leagueId
seasonId

providerRoundName
displayName

startAt
lockAt
endAt

status

createdAt
updatedAt
```

---

## picks

~~~text
id
userId
leagueId
seasonId
matchweekId
fixtureId
selectedTeamId
result
submittedAt
lockedAt
settledAt nullable
createdAt
updatedAt
~~~

Picks in this table are independent predictions. Unique on user, league, and matchweek.

---

## matchweekParticipation

Records whether a user chose to prove independent knowledge or view expert guidance.

~~~text
id
userId
leagueId
matchweekId
mode: independent | follow
expertPicksRevealedAt nullable
createdAt
~~~

Unique on user, league, and matchweek. Once mode becomes follow or expert picks are revealed, it cannot become independent for that matchweek.

---

## leagueFollows

~~~text
id
followerUserId
specialistUserId
leagueId
createdAt
~~~

Unique on follower, specialist, and league. A user cannot follow themselves.

---

## followedPicks

~~~text
id
followerUserId
sourcePickId
leagueId
seasonId
matchweekId
result
followedAt
settledAt nullable
createdAt
~~~

Unique on follower, league, and matchweek. The source pick remains the authoritative attribution.

---

## userLeagueRecords

Career aggregate per user and league:

~~~text
id
userId
leagueId
wins
losses
voids
settledPicks
currentWinStreak
bestWinStreak
tier
confidenceAdjustedAccuracy nullable
lastSettledAt
createdAt
updatedAt
~~~

Unique on user and league.

---

## userLeagueSeasonRecords

Season aggregate per user, league, and season with the same win/loss, streak, tier, and confidence fields.

Unique on user, league, and season.

---

## settlementEvents

~~~text
id
userId
leagueId
seasonId
pickId
eventType
result
supersedesEventId nullable
reason nullable
createdAt
~~~

A pick may have multiple immutable events after a correction, but exactly one current active settlement effect.

---

# 36. Derived Accuracy

Avoid storing accuracy if unnecessary.

Calculate:

```text
wins / (wins + losses)
```

If cached for performance, treat it as derived data.

---

# 37. Fixture Synchronization

Do not query API-Football on page requests.

All provider data must be synced server-side into PostgreSQL.

Frontend reads only from our database.

Flow:

```text
API-Football
↓
sync job
↓
Postgres
↓
LeagueCred application
```

---

# 38. Fixture Sync Schedule

Run a scheduled fixture synchronization.

Recommended:

```text
Once daily:
sync upcoming fixtures for enabled leagues
```

Fetch a reasonable future range such as:

```text
next 7–14 days
```

Near active matchweeks, optionally increase frequency.

Do not waste API calls continuously syncing inactive leagues.

---

# 39. Result Synchronization

LeagueCred does not require live scores.

We only need final results for settlement.

Use kickoff-aware polling.

Example:

```text
fixture kickoff
+
approximately 2 hours
↓
check status
```

If not finished:

```text
retry later
```

Preferred strategy:

Query active league/date batches where API supports it instead of individual fixture requests.

---

# 40. API Usage Budget

Initial API-Football free limit:

```text
100 calls/day
```

Design for:

* top domestic divisions only
* no odds
* cached fixtures
* scheduled result checks
* no live-score polling

Maintain internal daily API request monitoring.

Admin dashboard should eventually display:

```text
calls used today
calls remaining
last successful sync
sync failures
```

---

# 41. Fixture Status Normalization

Normalize API statuses.

Example internal states:

```text
scheduled
live
finished
postponed
cancelled
abandoned
suspended
unknown
```

Settlement logic operates on internal status, not raw provider strings.

---

# 42. Settlement Job

Settlement must be idempotent.

~~~text
Find independent picks with result = pending
where fixture is finished

for each pick:
  determine selected team's result
  create immutable settlement event
  update career and season league records
  update pick result and settledAt
  settle attributed followed-pick records

execute transaction atomically
~~~

Never allow duplicate active settlement effects or double-count aggregate statistics.

---

# 43. Database Transactions

Settlement must occur inside a PostgreSQL transaction. Pick state, settlement event, independent aggregates, streaks, and followed-pick results must succeed together or roll back.

---

# 44. Data Corrections

For provider corrections, an admin resettle operation must:

1. create an immutable reversal event
2. recalculate the fixture outcome
3. create a correction event
4. rebuild affected career and season aggregates
5. update attributed followed-pick outcomes

Never silently mutate historical settlement events.

---

# 45. Authentication

Anonymous users may:

* browse homepage
* browse leagues
* view unlocked historical picks
* view leaderboards
* view profiles

Authentication required to:

* submit Weekly Lock
* access personal dashboard
* manage profile

---

# 46. Username Rules

Require unique public username.

Suggested:

```text
3–20 characters
letters
numbers
underscore
```

Store normalized lowercase version for uniqueness.

Display casing can remain separate if desired.

---

# 47. Dashboard

The authenticated dashboard has two primary areas.

### Leagues I Know

~~~text
Süper Lig
78.3% · 36–10 · Expert
This week's independent lock: Galatasaray
Season rank #14
~~~

Prioritize leagues where the user has not yet made an independent Weekly Lock.

### Leagues I Follow

~~~text
Canadian Premier League
Following Liam and Maya
Liam's lock: Forge FC
Maya has not locked yet
~~~

Prioritize new specialist picks, followed-pick results, and leagues where the user wants guidance.

The dashboard should make the exchange visible: contribute knowledge where the user is proven and discover knowledge where the user is not.

---

# 48. Explore Page

Route:

```text
/leagues
```

Display enabled top leagues grouped by:

* Popular
* Europe
* Americas
* Asia
* Africa
* Oceania

Search:

```text
league
country
```

---

# 49. Search

MVP search can support:

* leagues
* users

No need for teams unless useful for navigation.

---

# 50. Community Consensus

Consensus counts independent Weekly Locks, not followed selections or generic votes.

It is revealed after the user submits independently, chooses Follow Experts, or the deadline passes.

Show only after a minimum such as five independent picks; otherwise display Not enough picks yet.

Consensus is descriptive. It does not represent odds, expected profit, or certainty.

---

# 51. Specialist Picks

Specialist discovery and league-specific following are core MVP capabilities.

A specialist card must show:

* league-specific raw accuracy
* independent win-loss record
* settled sample size
* tier or provisional status
* current immutable Weekly Lock and submission time when revealed
* league-specific follower count

Default specialist eligibility should require 10 settled non-void independent picks. Do not weight selections by odds or profitability.

---

# 52. Integrity and Anti-Copying

Critical requirements:

* server timestamps all picks and reveal events
* independent picks are hidden from the current user until submission or a follow-mode choice
* viewing current specialist picks permanently sets follow mode for that league and matchweek
* followed picks never count toward independent accuracy
* source attribution cannot be rewritten
* no edits or deletion after submission
* database uniqueness constraints enforce participation rules
* server validates deadlines, fixtures, and selected teams
* frontend cannot settle results or control statistics
* historical losses cannot be deleted

This is product-integrity enforcement, not a claim that determined users can never learn a pick outside LeagueCred.

---

# 53. Pick and Reveal Validation

Before accepting an independent pick, the server verifies authentication, enabled league, current season, active matchweek, server-side deadline, fixture membership, selected-team membership, no existing pick, and no prior expert-pick reveal or follow-mode selection.

Before revealing specialist picks, atomically record follow mode or confirm that the user already submitted independently.

---

# 54. Admin Dashboard

Build a focused internal admin area for:

* leagues, seasons, teams, and fixtures
* provider IDs, sync state, failures, and API usage
* independent and followed picks
* matchweek participation and reveal audit
* settlement, voids, corrections, and record rebuilds
* specialist eligibility and suspicious activity
* league-specific follows and attribution

Avoid unrelated payment, affiliate, or marketing administration in MVP.

---

# 55. Analytics

Track:

~~~text
signup_completed
league_viewed
independent_lock_started
independent_lock_submitted
follow_mode_selected
specialist_picks_revealed
specialist_followed
specialist_pick_followed
pick_settled
placement_completed
tier_changed
leaderboard_viewed
profile_viewed
~~~

Activation should measure users who complete at least one meaningful side of the network: submit an independent Weekly Lock or follow a specialist pick.

The stronger network activation metric is the percentage who both contribute in a league they know and consume a specialist pick in another league.

Retention measures repeated independent contributions, repeated followed-pick consumption, and retained league-specific follows.

---

# 56. Notifications

After the core MVP, support:

* independent Weekly Lock deadline reminder
* a followed specialist submitted a Weekly Lock
* independent or followed pick result
* placement completed
* tier or leaderboard milestone
* new matchweek open

Notifications must clearly distinguish independent and followed picks.

---

# 57. SEO

Public league pages should be indexable.

Examples:

```text
/super-lig-predictions
/serie-a-experts
/premier-league-picks
```

However, product routes should remain clean.

Recommended canonical structure:

```text
/leagues/super-lig
/leagues/serie-a
/leagues/premier-league
```

Metadata can target prediction/expert terminology.

---

# 58. Legal/Product Positioning

LeagueCred is a league-expertise and sports-prediction network, not a sportsbook.

Do not include sportsbook links, betting affiliates, wagering, deposits, betting slips, bookmaker branding, odds, payout claims, profitability rankings, or guaranteed-win language.

Use prediction, highest-confidence pick, Weekly Lock, independent record, league expertise, specialist, follower, reputation, leaderboard, and accuracy.

Disclaimer:

> LeagueCred is a sports prediction and entertainment platform. Predictions are opinions, outcomes are uncertain, and LeagueCred does not accept wagers or operate a sportsbook.

---

# 59. Design Direction

LeagueCred should feel competitive, sports-native, social, clean, modern, and credible.

Prioritize league badges, team crests, accuracy, sample size, specialist identity, league-specific follows, streaks, attribution, and clean result history.

Avoid casino aesthetics, odds tables, payout language, and generic social-feed clutter.

---

# 60. Expertise Milestone UX

Wins, losses, placement completion, tier changes, streaks, and leaderboard movement should feel meaningful without showing artificial rating points.

~~~text
WIN

Galatasaray defeated Kasımpaşa

Record: 36–10
Accuracy: 78.3%

PROMOTED
Analyst → Pundit
~~~

Never hide losses or demotions.

---

# 61. Accuracy History

Not required for initial MVP. The settlement ledger should support future career and season accuracy-over-time charts per league.

---

# 62. League-Specific Follow System

This is part of MVP.

Users follow a person for a specific league, not automatically for every league.

Support specialist discovery, follow/unfollow, a Leagues I Follow dashboard, attributed followed picks, and clear separation from independent expertise.

A general-purpose social feed, comments, reactions, and direct messages remain out of scope.

---

# 63. Social Boundaries

Do not build DMs, comments, forums, chat, reactions, or user posts for MVP.

The initial social graph consists of league-specific specialist follows and attributed Weekly Locks.

---

# 64. Monetization

Monetization is not part of MVP validation. Do not gate basic independent participation, specialist discovery, or league-specific following behind payment.

Potential later models must preserve the integrity of specialist rankings and avoid pay-for-placement.

---

# 65. MVP Pages

Required:

```text
/
Homepage

/leagues
Explore leagues

/leagues/[slug]
League page

/dashboard
Authenticated dashboard

/u/[username]
Public profile

/settings
Profile/account settings

/admin
Internal admin
```

Authentication routes as required by provider.

---

# 66. MVP API / Server Functions

Conceptual functions:

~~~text
getEnabledLeagues
getLeague
getCurrentMatchweek
getMatchweekFixtures

chooseIndependentMode
submitWeeklyLock
chooseFollowMode
revealSpecialistPicks
followLeagueSpecialist
unfollowLeagueSpecialist
followSpecialistPick

getLeagueConsensus
getLeagueSpecialists
getLeagueLeaderboard
getUserLeagueRecord
getUserIndependentHistory
getUserFollowedHistory

syncLeagues
syncFixtures
syncResults
settleFixture
recalculateFixtureSettlement
~~~

---

# 67. Background Jobs

Required:

```text
daily fixture sync

active-match result sync

pick settlement

matchweek state refresh
```

Preferred scheduling:

Vercel Cron or equivalent.

Jobs must use distributed locking / idempotency so duplicate cron execution is safe.

---

# 68. Matchweek State

Possible internal status:

```text
upcoming
open
locked
completed
```

Definitions:

### Upcoming

Fixtures known but prediction window not yet active if future restrictions exist.

### Open

Users can submit Weekly Locks.

### Locked

First fixture has started.

### Completed

All relevant fixtures resolved or void.

---

# 69. API Failure Handling

If API-Football fails:

* never delete existing fixture data
* retry later
* log error
* show last known data
* do not incorrectly settle matches

If final result cannot be confirmed:

```text
pick remains pending
```

Correctness is more important than immediate settlement.

---

# 70. Time Zones

Store all timestamps in UTC.

Display in user's local timezone.

Matchweek deadline is calculated in UTC from fixture kickoff timestamps.

Never store arbitrary local-time strings as authoritative values.

---

# 71. Team Identity

Teams may participate across leagues/seasons.

Use global internal team identity and league-season relationships as needed.

Do not assume a team belongs permanently to one league.

---

# 72. Provider Data Preservation

Store raw provider payload selectively for debugging if useful.

Example:

```text
providerMetadata JSONB
```

Do not make business logic depend directly on arbitrary JSON.

---

# 73. Testing Requirements

Unit tests:

* pick outcome
* matchweek deadline
* raw accuracy
* confidence-adjusted leaderboard score
* provisional eligibility and tiers
* career and season aggregates
* streak calculation

Integration tests:

* duplicate Weekly Lock rejected
* late and invalid picks rejected
* expert reveal blocks later independent submission
* independent submission permits reveal
* followed pick retains source attribution
* followed pick never changes independent record
* settlement creates one active effect and is idempotent
* correction creates reversal and correction events
* void does not affect accuracy
* win and loss update career and season records correctly

---

# 74. Critical Invariants

~~~text
One independent Weekly Lock per user, league, and matchweek

A user cannot build independent expertise after viewing current specialist picks

Followed picks never count as independent picks

Every followed pick retains its original specialist attribution

A settled pick has exactly one current active settlement effect

Aggregate records can be rebuilt from immutable settlement events

A pick cannot be submitted after the league deadline

A pick cannot be deleted to hide a loss

One league's record never changes another league's record

VOID never affects accuracy

Only verified fixture results settle predictions
~~~

---

# 75. Performance

Most reads should come from PostgreSQL. Index league leaderboards, user league records, matchweek participation, league-specific follows, source-pick attribution, fixture status, pending settlements, provider IDs, and username lookup.

Likely indexes include:

~~~text
userLeagueRecords(leagueId, confidenceAdjustedAccuracy DESC)
userLeagueSeasonRecords(leagueId, seasonId, confidenceAdjustedAccuracy DESC)
picks(userId, leagueId, matchweekId)
picks(fixtureId, result)
matchweekParticipation(userId, leagueId, matchweekId)
leagueFollows(followerUserId, leagueId)
leagueFollows(specialistUserId, leagueId)
followedPicks(sourcePickId)
fixtures(status, kickoffAt)
users(usernameNormalized)
~~~

---

# 76. Leaderboard Pagination

Use cursor pagination with deterministic ordering. Default to 50 specialists per page and show the current user's position separately when eligible.

---

# 77. Initial Launch Strategy

Launch with approximately three to five leagues that already have credible seed participants rather than fifteen empty league networks.

Select leagues based on:

* access to knowledgeable initial specialists
* reliable fixture and round data
* enough weekly fixtures
* likely cross-league exchange between communities

Expand only when a new league can support useful specialist discovery.

---

# 78. Phase 1 — Foundation

Build the Next.js application, PostgreSQL schema, authentication, users, leagues, teams, fixtures, API-Football abstraction, synchronization, enabled-league configuration, and focused admin tools.

---

# 79. Phase 2 — Independent Weekly Locks

Build matchweek normalization, frozen eligibility and deadlines, independent participation mode, immutable submission, fixture UI, and basic dashboard.

---

# 80. Phase 3 — Settlement and Accuracy

Build result synchronization, outcome determination, immutable settlement ledger, correction flow, career and season records, confidence-adjusted ranking, streaks, placement, and tiers.

---

# 81. Phase 4 — Expertise Network

Build league leaderboards, public profiles, histories, specialist discovery, league-specific follows, Prove or Follow choice, reveal enforcement, attributed followed picks, and Leagues I Know / Leagues I Follow dashboard areas.

---

# 82. Phase 5 — Network Intelligence

Build community consensus, followed-specialist agreement, specialist notifications, and improved discovery after enough real data exists. Do not introduce odds or profitability ranking.

---

# 83. Phase 6 — Product Polish

Build SEO, analytics, error and loading states, mobile-responsive layout, admin diagnostics, monitoring, accessibility, and performance optimization.

---

# 84. Do Not Build Yet

Explicitly exclude:

~~~text
betting odds
sportsbook integrations
affiliate betting links
money wagering
profitability rankings
guaranteed-win claims
paid ranking placement
AI predictions
multi-sport support
native apps
DMs
comments
chat
fantasy football
score predictions
parlays
over/under
live score center
complex consensus weighting
~~~

---

# 85. Success Criteria

The first version succeeds if users repeatedly do both sides of the network:

~~~text
Open a league they understand
↓
Submit one independent highest-confidence Weekly Lock
↓
Build a verified league-specific record
↓
Open a league they do not understand
↓
Discover and follow a proven specialist's Weekly Lock
↓
Check both results
↓
Return next matchweek
~~~

Primary product question:

> Will people consistently contribute their strongest knowledge from one league and rely on proven specialists for another?

Secondary questions:

* Do strong independent records produce league-specific followers?
* Do users return because a followed specialist submitted a new pick?
* Does attribution create trust between different league communities?

Everything not supporting this exchange is secondary.

---

# 86. Product Identity

Brand: **LeagueCred**

Domain: **LeagueCred.com**

Core positioning:

> **Know one league. Discover the people who know the others.**

Supporting line:

> Share one highest-confidence Weekly Lock from your league. Follow proven specialists in leagues you do not know.

Proof line:

> One pick. One permanent record. League-specific credibility.

LeagueCred does not promise certain winners. It makes every specialist's confidence inspectable through an immutable accuracy record and sample size.

Core differentiation:

> You are not ranked as a generic football expert. You prove exactly which leagues you understand, and your knowledge becomes useful to people who understand different leagues.
