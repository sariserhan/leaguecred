# LeagueCred

LeagueCred is a league-expertise network for football supporters.

Users make one independent highest-confidence Weekly Lock in a domestic league they know. That permanent record establishes league-specific credibility. In leagues they do not know, they can follow proven specialists without presenting copied picks as independent expertise.

## Current vertical slice

The repository currently contains a polished, responsive frontend prototype with:

- homepage and product explanation
- searchable and filterable league discovery
- dynamic league routes
- interactive Süper Lig Prove-or-Follow flow
- independent team selection and lock confirmation
- specialist-pick reveal and attributed following
- branded loading, not-found, and error states
- seeded deterministic data
- accuracy and Wilson-score tests

No database, authentication, or football-data provider is connected yet.

## Quick start

~~~bash
pnpm install
pnpm dev
~~~

Open http://localhost:3000.

## Quality checks

~~~bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
~~~

See DEVELOPER_HANDBOOK.md for the detailed project workflow and spec.md for product behavior.
