/**
 * Decides which matchweeks are the same real gameweek.
 *
 * A matchweek was identified by the round name its provider happened to use,
 * and providers name rounds differently, so one gameweek ended up stored once
 * per provider with the fixtures divided between them. A Daily Lock belongs to
 * a matchweek, so a player could lock twice in a single week.
 *
 * `synchronizeFixtures` no longer splits them. This plans the repair for weeks
 * already stored, kept apart from the writes in `src/jobs/merge-matchweeks.ts`
 * because deciding what counts as one week is the part worth testing.
 */

export type MergeableMatchweek = {
  id: string;
  leagueId: string;
  seasonId: string;
  /** Epoch milliseconds, so overlap is plain arithmetic. */
  startAt: number;
  endAt: number;
  fixtureCount: number;
  pickCount: number;
  participationCount: number;
  status: string;
  /** Which provider's naming the round came from. Two weeks from one provider
   * are two rounds, never two halves of the same one. */
  scheme: string;
};

export type MatchweekMerge<M extends MergeableMatchweek> = { canonical: M; absorbed: M[] };

function overlaps(left: MergeableMatchweek, right: MergeableMatchweek) {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

/** Anything a player has already committed to makes a week unsafe to move. */
export function isCommitted(week: MergeableMatchweek) {
  return week.pickCount > 0 || week.participationCount > 0 || week.status !== "upcoming";
}

/**
 * Groups the weeks that describe one gameweek: overlapping in time, and each
 * from a different provider.
 *
 * Overlapping in time is not enough on its own. A round that runs Thursday to
 * Monday ends after the next round's window opens, so one provider's own
 * consecutive gameweeks overlap — chaining those would fold a whole season into
 * a single week. Only one week per provider can belong to a cluster, which is
 * the same rule the fixture repair uses: a provider does not split its own
 * round in two.
 */
export function clusterByOverlap<M extends MergeableMatchweek>(weeks: M[]) {
  const byLeagueSeason = new Map<string, M[]>();
  for (const week of weeks) {
    const key = `${week.leagueId}|${week.seasonId}`;
    byLeagueSeason.set(key, [...(byLeagueSeason.get(key) ?? []), week]);
  }

  const clusters: M[][] = [];
  for (const group of byLeagueSeason.values()) {
    const ordered = [...group].sort((left, right) => left.startAt - right.startAt);
    let current: M[] = [];
    for (const week of ordered) {
      const joins = current.length > 0
        && current.some((member) => overlaps(member, week))
        && current.every((member) => member.scheme !== week.scheme);
      if (joins) {
        current.push(week);
        continue;
      }
      if (current.length > 0) clusters.push(current);
      current = [week];
    }
    if (current.length > 0) clusters.push(current);
  }
  return clusters;
}

/**
 * Plans one survivor per gameweek. A cluster where more than one week has been
 * committed to is left alone: merging would put two Daily Locks from one
 * player in the same week, which the schema forbids and the product should not
 * decide on their behalf.
 */
export function planMatchweekMerges<M extends MergeableMatchweek>(weeks: M[]) {
  const merges: MatchweekMerge<M>[] = [];
  const committed: M[][] = [];

  for (const cluster of clusterByOverlap(weeks)) {
    if (cluster.length < 2) continue;

    if (cluster.filter(isCommitted).length > 1) {
      committed.push(cluster);
      continue;
    }

    // A week someone has committed to must be the one that survives, so their
    // lock keeps pointing at the week they chose.
    const canonical = [...cluster].sort((left, right) =>
      Number(isCommitted(right)) - Number(isCommitted(left)) ||
      right.fixtureCount - left.fixtureCount ||
      left.startAt - right.startAt)[0];

    merges.push({ canonical, absorbed: cluster.filter((week) => week.id !== canonical.id) });
  }

  return { merges, committed };
}
