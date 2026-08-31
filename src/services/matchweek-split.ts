export type SplittableFixture = { id: string; kickoffAt: Date | string };

export type MatchweekRound = {
  /** Fixture ids in kickoff order. */
  fixtureIds: string[];
  startAt: Date;
  endAt: Date;
};

const HOUR = 60 * 60 * 1000;

/**
 * The rounds inside a matchweek that holds more than one.
 *
 * A round is a cluster of kickoffs a few days wide, and consecutive rounds are
 * separated by a clear gap, so the rounds are the clusters and the boundaries
 * are the gaps wider than a round plausibly is.
 *
 * This is the repair for a week that swallowed its neighbours. fixture-sync lets
 * a round join a week another provider opened and then widens that week to
 * cover it; each widening made the week a larger target for the next round, and
 * Liga Portugal ended up with one thirteen-day week holding two gameweeks while
 * the league had no Week 4 at all.
 *
 * Clusters rather than a single split point, because a week can absorb more
 * than one neighbour and because the widest gap is not always unique: that week
 * had a Monday leftover four days before the next round and four days after the
 * one before it, and picking either gap alone would have been arbitrary.
 *
 * Returns one round for almost every week, which is the answer that means
 * nothing is wrong and the reason this is safe to run across a whole league.
 */
export function planMatchweekRounds(
  fixtures: SplittableFixture[],
  { minGapHours = 72 }: { minGapHours?: number } = {},
): MatchweekRound[] {
  const ordered = [...fixtures]
    .map((fixture) => ({ id: fixture.id, kickoff: new Date(fixture.kickoffAt) }))
    .sort((left, right) => left.kickoff.getTime() - right.kickoff.getTime());
  if (ordered.length === 0) return [];

  const rounds: Array<Array<(typeof ordered)[number]>> = [[ordered[0]]];
  for (let index = 1; index < ordered.length; index += 1) {
    const gap = ordered[index].kickoff.getTime() - ordered[index - 1].kickoff.getTime();
    if (gap >= minGapHours * HOUR) rounds.push([]);
    rounds[rounds.length - 1].push(ordered[index]);
  }

  return rounds.map((round) => ({
    fixtureIds: round.map((fixture) => fixture.id),
    startAt: round[0].kickoff,
    endAt: round[round.length - 1].kickoff,
  }));
}
