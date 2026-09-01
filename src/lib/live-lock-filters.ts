export type LockFilters = { league: string; member: string; date: string };

export const NO_FILTER = "all";

export const emptyLockFilters: LockFilters = { league: NO_FILTER, member: NO_FILTER, date: NO_FILTER };

type FilterableLock = {
  username: string;
  kickoffAt: string;
  league: { slug: string };
};

/** The kickoff day a lock belongs to, in UTC, as the board labels it. */
export function lockDay(lock: FilterableLock) {
  return lock.kickoffAt.slice(0, 10);
}

/**
 * Filtering happens here rather than in a query: the board loads one bounded
 * page of active locks, so narrowing it is a matter of hiding rows the reader
 * already has, and a round trip per keystroke would only make it slower.
 */
export function filterLocks<Lock extends FilterableLock>(locks: Lock[], filters: LockFilters) {
  return locks.filter((lock) => {
    if (filters.league !== NO_FILTER && lock.league.slug !== filters.league) return false;
    if (filters.member !== NO_FILTER && lock.username !== filters.member) return false;
    if (filters.date !== NO_FILTER && lockDay(lock) !== filters.date) return false;
    return true;
  });
}

/** Every value present in the locks themselves, so a filter can never name a
 * league or a member the board is not showing. */
export function lockFilterOptions<Lock extends FilterableLock>(locks: Lock[]) {
  const leagues = new Map<string, string>();
  const members = new Set<string>();
  const days = new Set<string>();

  for (const lock of locks) {
    leagues.set(lock.league.slug, (lock as Lock & { league: { name?: string } }).league.name ?? lock.league.slug);
    members.add(lock.username);
    days.add(lockDay(lock));
  }

  return {
    leagues: [...leagues].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name)),
    members: [...members].sort((a, b) => a.localeCompare(b)),
    days: [...days].sort(),
  };
}
