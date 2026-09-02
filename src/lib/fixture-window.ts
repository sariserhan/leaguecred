/**
 * Where a fixture sync should start reading.
 *
 * ESPN answers a scoreboard request with at most 200 events, and the window has
 * always begun at the season start — which is right for football, where a
 * league plays a few hundred matches spread over nine months, and where
 * re-reading the season each night is what repairs a row somebody edited or a
 * result that arrived late.
 *
 * It is wrong for a league that plays every day. Baseball runs about fifteen
 * games a night, so two weeks of a season fills the whole response: the sync
 * would fetch the same opening fortnight of April every night and never reach
 * today's game. Those leagues read a rolling window instead, anchored near now,
 * and give up the nightly re-read of the whole season to do it.
 */
export const DEFAULT_LOOKBACK_DAYS = 7;

/** The sport whose seasons are sparse enough to read whole. */
const SEASON_WIDE_SPORT = "football";

export function fixtureWindowStart(input: {
  sport: string;
  seasonStartDate: string;
  now: Date;
  lookbackDays?: number;
}): string {
  if (input.sport === SEASON_WIDE_SPORT) return input.seasonStartDate;

  const floor = new Date(input.now);
  floor.setUTCDate(floor.getUTCDate() - (input.lookbackDays ?? DEFAULT_LOOKBACK_DAYS));
  const rolling = floor.toISOString().slice(0, 10);

  // Never before the season began: a window that opens earlier only spends the
  // response on games from a season that has finished.
  return rolling < input.seasonStartDate ? input.seasonStartDate : rolling;
}
