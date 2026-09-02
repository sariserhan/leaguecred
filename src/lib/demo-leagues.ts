/**
 * Which leagues the homepage practice lock offers.
 *
 * Ordered by priority, so the strongest football leagues lead — that is what
 * the product is, and the first thing a stranger should recognise. But the
 * pitch beside it is that you might know the NBA and not the Premier League,
 * and a chooser showing four football leagues makes a liar of it. So the last
 * slot is held for a second sport when the catalogue has one, and given back to
 * football when it does not.
 */
export function pickDemoLeagues<T extends { sport?: string }>(leagues: T[], slots = 4): T[] {
  const shortlist = leagues.slice(0, slots);
  if (shortlist.length < slots) return shortlist;

  const leadSport = shortlist[0]?.sport;
  if (shortlist.some((league) => league.sport !== leadSport)) return shortlist;

  const otherSport = leagues.slice(slots).find((league) => league.sport !== leadSport);
  return otherSport ? [...shortlist.slice(0, slots - 1), otherSport] : shortlist;
}
