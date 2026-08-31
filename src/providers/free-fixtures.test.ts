import { describe, expect, it } from "vitest";

import { mapFootballDataMatch, normalizeFootballDataStatus } from "@/providers/football-data-org";
import { mapFootballDataUkRow, parseCsv } from "@/providers/football-data-uk";

describe("Football-Data.co.uk provider", () => {
  it("parses quoted CSV values and the UTF-8 BOM", () => {
    const rows = parseCsv('\uFEFFDiv,HomeTeam,AwayTeam\r\nE0,"Brighton, Hove",Arsenal\r\n');
    expect(rows).toEqual([{ Div: "E0", HomeTeam: "Brighton, Hove", AwayTeam: "Arsenal" }]);
  });

  it("normalizes a finished result in Europe/London time", () => {
    const fixture = mapFootballDataUkRow({
      Div: "E0", Date: "29/08/2026", Time: "15:00", HomeTeam: "Arsenal", AwayTeam: "Chelsea",
      FTHG: "2", FTAG: "1", FTR: "H",
    }, "E0", "2026");

    expect(fixture).toMatchObject({
      kickoffAt: "2026-08-29T14:00:00.000Z",
      status: "finished",
      homeScore: 2,
      awayScore: 1,
      winnerExternalId: "E0:arsenal",
    });
  });
});

describe("football-data.org provider", () => {
  it("normalizes statuses and Champions League matches", () => {
    expect(normalizeFootballDataStatus("TIMED")).toBe("scheduled");
    expect(normalizeFootballDataStatus("FINISHED")).toBe("finished");
    const fixture = mapFootballDataMatch({
      id: 42,
      utcDate: "2026-09-15T19:00:00Z",
      status: "FINISHED",
      stage: "LEAGUE_STAGE",
      matchday: 1,
      homeTeam: { id: 1, name: "Arsenal FC", shortName: "ARS", crest: "https://example.com/arsenal.svg" },
      awayTeam: { id: 2, name: "Galatasaray SK", shortName: "GAL", crest: "https://example.com/galatasaray.svg" },
      score: { winner: "HOME_TEAM", fullTime: { home: 2, away: 0 } },
    }, "CL");

    expect(fixture).toMatchObject({
      externalId: "42",
      round: "football-data-org:CL:Matchday 1",
      status: "finished",
      winnerExternalId: "1",
    });
  });

  // The failure this guards: every competition's round used to read "CL"
  // regardless of which league the match was actually in, since the label was
  // hardcoded rather than taken from the competition being fetched.
  it("labels the round with the competition actually being fetched, not always CL", () => {
    const fixture = mapFootballDataMatch({
      id: 99,
      utcDate: "2026-09-15T19:00:00Z",
      status: "SCHEDULED",
      stage: "REGULAR_SEASON",
      matchday: 3,
      homeTeam: { id: 3, name: "Bayern Munich", shortName: "FCB", crest: null },
      awayTeam: { id: 4, name: "Union Berlin", shortName: "FCU", crest: null },
      score: { winner: null, fullTime: { home: null, away: null } },
    }, "BL1");

    expect(fixture.round).toBe("football-data-org:BL1:Matchday 3");
  });
});
