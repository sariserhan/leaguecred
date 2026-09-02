export const NO_FILTER = "all";

export type FixtureFilters = { league: string; date: string };

export const emptyFixtureFilters: FixtureFilters = { league: NO_FILTER, date: NO_FILTER };

type FilterableFixture = { leagueSlug: string; leagueName: string };
type FilterableDay<Fixture extends FilterableFixture> = { date: string; fixtures: Fixture[] };

/**
 * The board narrowed to one league, one day, or both.
 *
 * Filtering here rather than in a query: the board is a fortnight of fixtures
 * the page already holds, so narrowing it is hiding rows rather than fetching
 * them. A day left with nothing is dropped, so a filtered board is a list of
 * matchdays rather than a run of empty headings.
 */
export function filterFixtureDays<Fixture extends FilterableFixture, Day extends FilterableDay<Fixture>>(
  days: Day[],
  filters: FixtureFilters,
): Day[] {
  return days
    .filter((day) => filters.date === NO_FILTER || day.date === filters.date)
    .map((day) => ({
      ...day,
      fixtures: day.fixtures.filter((fixture) => filters.league === NO_FILTER || fixture.leagueSlug === filters.league),
    }))
    .filter((day) => day.fixtures.length > 0);
}

/** Every league and day the board actually holds, so a filter can never name
 * one with nothing behind it. */
export function fixtureFilterOptions<Fixture extends FilterableFixture, Day extends FilterableDay<Fixture>>(days: Day[]) {
  const leagues = new Map<string, string>();

  for (const day of days) {
    for (const fixture of day.fixtures) leagues.set(fixture.leagueSlug, fixture.leagueName);
  }

  return {
    leagues: [...leagues].map(([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name)),
    days: days.map((day) => day.date),
  };
}

export function countFixtures<Fixture extends FilterableFixture, Day extends FilterableDay<Fixture>>(days: Day[]) {
  return days.reduce((total, day) => total + day.fixtures.length, 0);
}
