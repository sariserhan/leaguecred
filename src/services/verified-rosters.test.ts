import { describe, expect, it } from "vitest";

import { FOOTBALL_DATA_UK_ROSTER_COMPETITIONS } from "@/providers/football-data-uk-rosters";
import { VERIFIED_WEB_ROSTERS } from "@/services/verified-rosters";

describe("verified current rosters", () => {
  it("has unique teams and the declared official count", () => {
    for (const roster of VERIFIED_WEB_ROSTERS) {
      expect(new Set(roster.teams.map((team) => team.name)).size, roster.leagueSlug)
        .toBe(roster.expectedTeamCount);
      expect(roster.teams).toHaveLength(roster.expectedTeamCount);
    }
  });

  it("covers every incomplete competition outside the free domestic files", () => {
    expect(Object.fromEntries(VERIFIED_WEB_ROSTERS.map((roster) => [
      roster.leagueSlug,
      roster.expectedTeamCount,
    ]))).toEqual({
      "saudi-arabia-pro-league": 18,
      "europa-league": 36,
      "uefa-conference-league": 36,
      "copa-libertadores": 32,
    });
  });

  it("declares the expected sizes of all free domestic rosters", () => {
    const counts = Object.fromEntries(FOOTBALL_DATA_UK_ROSTER_COMPETITIONS.map((competition) => [
      competition.leagueSlug,
      competition.expectedTeamCount,
    ]));
    expect(counts["efl-championship"]).toBe(24);
    expect(counts["super-league-greece"]).toBe(12);
    expect(counts["brasileirao-serie-a"]).toBe(20);
    expect(counts["liga-profesional-argentina"]).toBe(30);
    expect(counts["major-league-soccer"]).toBe(30);
  });
});
