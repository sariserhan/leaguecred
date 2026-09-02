/**
 * The sports a league can be played in, and what to call them.
 *
 * The stored value is a slug so it can be filtered and indexed; the label is
 * what a supporter reads. They are kept apart mainly because of one of them:
 * ESPN files the NFL under "football", and so would anyone typing quickly, but
 * in this product that word already means the sport the other twenty-three
 * leagues play.
 */
export const SPORT_LABELS: Record<string, string> = {
  football: "Football",
  "american-football": "American football",
  basketball: "Basketball",
  baseball: "Baseball",
  "ice-hockey": "Ice hockey",
};

/** Falls back to the slug rather than to nothing: a sport added to the
 *  database before it is added here should still be readable. */
export function sportLabel(sport: string): string {
  return SPORT_LABELS[sport] ?? sport;
}

/**
 * The sports present in a set of leagues, in the order the labels list them, so
 * a filter built from live data is still stable rather than ordered by whatever
 * the catalogue happened to return.
 */
export function sportsPresent(sports: string[]): string[] {
  const seen = new Set(sports);
  const known = Object.keys(SPORT_LABELS).filter((sport) => seen.has(sport));
  const unknown = [...seen].filter((sport) => !(sport in SPORT_LABELS)).sort();
  return [...known, ...unknown];
}
