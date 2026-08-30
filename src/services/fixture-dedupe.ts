/**
 * Decides which fixture rows describe the same match.
 *
 * A fixture is keyed by (provider, provider_external_id), and several providers
 * cover the same leagues, so each recorded its own copy of every match. Both
 * copies then counted in the standings, which is why played, points and goal
 * difference all read roughly double.
 *
 * `synchronizeFixtures` no longer creates these. This is the repair for rows
 * already stored, kept apart from the writes in `src/jobs/dedupe-fixtures.ts`
 * because the choice of which row survives is the part worth testing.
 */

export type DedupeFixture = {
  id: string;
  /** league, season, both teams and the kickoff day — one real match. */
  matchKey: string;
  provider: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  pickCount: number;
  createdAt: number;
};

export type FixtureMerge<F extends DedupeFixture> = { canonical: F; duplicates: F[] };

/** Providers that own a league, best first. Anything unlisted sorts last. */
const PROVIDER_PRIORITY = ["espn-web", "football-data-uk", "football-data-org"];

function providerRank(provider: string) {
  const index = PROVIDER_PRIORITY.indexOf(provider);
  return index === -1 ? PROVIDER_PRIORITY.length : index;
}

/** A finished row carrying both scores is the one worth keeping. */
function completeness(fixture: DedupeFixture) {
  if (fixture.status !== "finished") return 0;
  return fixture.homeScore !== null && fixture.awayScore !== null ? 2 : 1;
}

export function pickCanonicalFixture<F extends DedupeFixture>(group: F[]) {
  return [...group].sort((left, right) =>
    right.pickCount - left.pickCount ||
    completeness(right) - completeness(left) ||
    providerRank(left.provider) - providerRank(right.provider) ||
    left.createdAt - right.createdAt)[0];
}

/**
 * Groups rows by the match they describe. A group where a row that is not the
 * survivor carries picks is held back rather than merged: the pick is tied to
 * its own matchweek, and moving it silently would put a Weekly Lock in a week
 * the player did not choose.
 */
export function planFixtureMerges<F extends DedupeFixture>(fixtures: F[]) {
  const byMatch = new Map<string, F[]>();
  for (const fixture of fixtures) {
    byMatch.set(fixture.matchKey, [...(byMatch.get(fixture.matchKey) ?? []), fixture]);
  }

  const merges: FixtureMerge<F>[] = [];
  const withPicks: F[][] = [];
  const ambiguous: F[][] = [];

  for (const group of byMatch.values()) {
    if (group.length < 2) continue;

    // The duplication comes from separate providers each recording the same
    // match, so two rows from one provider are two different matches that only
    // look alike — a provider cannot duplicate its own external id. Unresolved
    // ties do exactly this: several playoff fixtures share placeholder teams on
    // one date, and merging them would delete real matches.
    const providers = new Set(group.map((fixture) => fixture.provider));
    if (providers.size !== group.length) {
      ambiguous.push(group);
      continue;
    }

    const canonical = pickCanonicalFixture(group);
    const duplicates = group.filter((fixture) => fixture.id !== canonical.id);

    if (duplicates.some((fixture) => fixture.pickCount > 0)) {
      withPicks.push(group);
      continue;
    }
    merges.push({ canonical, duplicates });
  }

  return { merges, withPicks, ambiguous };
}
