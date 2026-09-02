import { describe, expect, it } from "vitest";

import {
  NO_FILTER,
  countFixtures,
  filterFixtureDays,
  fixtureFilterOptions,
} from "@/lib/fixture-filters";

const days = [
  {
    date: "2026-09-05",
    fixtures: [
      { leagueSlug: "super-lig", leagueName: "Süper Lig" },
      { leagueSlug: "premier-league", leagueName: "Premier League" },
    ],
  },
  {
    date: "2026-09-06",
    fixtures: [{ leagueSlug: "premier-league", leagueName: "Premier League" }],
  },
];

describe("filterFixtureDays", () => {
  it("returns the whole board when nothing is chosen", () => {
    expect(countFixtures(filterFixtureDays(days, { league: NO_FILTER, date: NO_FILTER }))).toBe(3);
  });

  it("narrows by league and by day together", () => {
    const filtered = filterFixtureDays(days, { league: "premier-league", date: "2026-09-06" });

    expect(filtered).toHaveLength(1);
    expect(countFixtures(filtered)).toBe(1);
  });

  // A heading with nothing under it reads as a bug rather than as a filter.
  it("drops a day left with no match", () => {
    const filtered = filterFixtureDays(days, { league: "super-lig", date: NO_FILTER });

    expect(filtered.map((day) => day.date)).toEqual(["2026-09-05"]);
  });

  it("can narrow to nothing rather than falling back to everything", () => {
    expect(filterFixtureDays(days, { league: "super-lig", date: "2026-09-06" })).toEqual([]);
  });
});

describe("fixtureFilterOptions", () => {
  it("offers only the leagues and days the board holds", () => {
    const options = fixtureFilterOptions(days);

    expect(options.leagues.map((league) => league.slug)).toEqual(["premier-league", "super-lig"]);
    expect(options.days).toEqual(["2026-09-05", "2026-09-06"]);
  });
});
