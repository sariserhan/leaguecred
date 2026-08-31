/**
 * Guards against an upstream feed changing shape underneath us.
 *
 * These endpoints are undocumented. Nothing obliges ESPN to keep calling a draw
 * a "tie", to keep the competitors under `competitions[0]`, or to keep a league
 * table at the top level rather than under `children`. The parsers are written
 * defensively — an event they cannot read is skipped, a table they cannot read
 * comes back empty — and that is the danger: a renamed field does not raise
 * anything, it just yields nothing, and a sync reports success having stored no
 * fixtures at all.
 *
 * So the parsers count what arrived against what they understood, and this turns
 * a silent nothing into a failure with a name on it. The nightly chain records
 * a failed step and carries on with the others, which is the right outcome: loud
 * in the diagnostics, and not load-bearing on the rest of the night.
 */

/** Some rows are legitimately unreadable — a fixture with no opponent decided
 * yet, a table row for a withdrawn club — so a handful of misses is normal and
 * only a wholesale failure means the shape moved. */
const UNDERSTOOD_FRACTION = 0.5;

export class UpstreamShapeError extends Error {
  constructor(source: string, received: number, understood: number) {
    super(
      `${source} returned ${received} record(s) and only ${understood} could be read. ` +
      "The response shape has probably changed; the parser needs updating before this data is trusted.",
    );
    this.name = "UpstreamShapeError";
  }
}

/**
 * @param received rows the feed sent
 * @param understood rows the parser turned into something usable
 * @throws UpstreamShapeError when too few were understood to be a coincidence
 */
export function assertUnderstood(source: string, received: number, understood: number) {
  // Nothing sent is a legitimate answer: a league between rounds, or a date
  // window with no matches in it.
  if (received === 0) return;
  if (understood >= Math.ceil(received * UNDERSTOOD_FRACTION)) return;
  throw new UpstreamShapeError(source, received, understood);
}
