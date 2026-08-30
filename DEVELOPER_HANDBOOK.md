# LeagueCred Developer Handbook

## Purpose

LeagueCred lets users prove expertise in one domestic football league through an immutable independent prediction record and follow proven specialists in leagues they do not understand.

The project-specific product source of truth is spec.md. AI_WEB_APP_DEVELOPMENT_ROADMAP.md is a reference checklist and must not expand product scope.

## Current architecture

The current implementation is a frontend vertical slice:

- Next.js 16 App Router
- React 19 and TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui with Base UI primitives
- static Server Components by default
- focused Client Components for search, filtering, and Prove-or-Follow interactions
- deterministic seeded data in src/lib/league-data.ts
- domain calculations in src/lib/reputation.ts

Planned backend architecture from the specification:

- PostgreSQL on Neon
- Drizzle ORM
- Clerk or equivalent authentication
- API-Football behind a provider abstraction
- scheduled synchronization and idempotent settlement jobs

Do not add backend placeholders or fake credentials before that implementation phase begins.

## Repository structure

~~~text
src/app/                    App Router pages and route states
src/components/ui/          shadcn source components
src/components/home/        Homepage product UI
src/components/leagues/     League discovery and league workflow
src/lib/league-data.ts      Deterministic prototype data
src/lib/reputation.ts       Accuracy and confidence calculations
docs/design/                Accepted visual concepts
spec.md                     Product and engineering specification
TODO.md                     Active implementation tasks
~~~

## Prerequisites

- Node.js 24
- pnpm 11

The supported versions should remain aligned with package.json and the lockfile.

## Commands

| Command | Purpose |
|---|---|
| pnpm dev | Starts the local Next.js development server. |
| pnpm build | Creates a production build and runs Next.js route validation. |
| pnpm start | Runs the previously built production application. |
| pnpm lint | Runs ESLint across the repository. |
| pnpm typecheck | Runs TypeScript without emitting files. |
| pnpm test | Runs deterministic Vitest tests once. |
| pnpm test:watch | Runs Vitest continuously while files change. |
| pnpm check | Runs lint, typecheck, tests, and the production build. |

## Environment variables

The current frontend prototype requires no environment variables.

When provider, database, or authentication work begins:

- add names and safe descriptions to .env.example
- validate required variables server-side
- never prefix secrets with NEXT_PUBLIC_
- keep preview and production credentials separate
- never commit real values

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

Unit tests currently cover accuracy, sample-size eligibility, and confidence-adjusted ranking.

When persistence is introduced, integration tests must use an isolated disposable PostgreSQL container. Tests must fail closed rather than connect to development, preview, or production data.

## Operational constraints

- Independent and followed picks must never share reputation effects.
- Viewing specialist picks must block a later independent pick for that league and matchweek.
- Server time will be authoritative when backend work begins.
- Pick immutability and settlement corrections require database transactions.
- Provider data must be synchronized server-side rather than fetched during page requests.
