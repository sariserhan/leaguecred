import { describe, expect, it } from "vitest";

import { ESPN_FIXTURE_COMPETITIONS, espnSportPath, mapEspnEvent, normalizeEspnStatus } from "@/providers/espn-fixtures";

const scheduledFixture = {
  date: "2026-09-06T16:00:00Z",
  season: { slug: "2026-27-danish-superliga" },
};

describe("ESPN fixture provider", () => {
  it("covers every enabled competition", () => {
    expect(ESPN_FIXTURE_COMPETITIONS).toHaveLength(27);
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).toContain("denmark-superliga");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).toContain("premier-league");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).toContain("efl-championship");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).not.toContain("switzerland-super-league");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).not.toContain("czech-republic-czech-liga");
  });

  describe("espnSportPath", () => {
    // ESPN files every competition under a sport, and the response shape is the
    // same for all of them. Football is left implicit because it is nearly all
    // of the catalogue; anything else has to say so, or its requests quietly go
    // to the soccer endpoint and come back empty.
    it("defaults a competition to football", () => {
      expect(espnSportPath("eng.1")).toBe("soccer");
      expect(espnSportPath("uefa.champions")).toBe("soccer");
    });

    it("reads the path off a competition that declares one", () => {
      expect(espnSportPath("nba")).toBe("basketball");
      expect(espnSportPath("mlb")).toBe("baseball");
      expect(espnSportPath("nhl")).toBe("hockey");
    });

    // The trap this exists to catch: ESPN files the NFL under "football",
    // which is this product's word for what ESPN calls "soccer".
    it("sends the NFL to ESPN's football, which is not our football", () => {
      expect(espnSportPath("nfl")).toBe("football");
      expect(espnSportPath("eng.1")).toBe("soccer");
    });

    it("falls back to football for an id it has never heard of", () => {
      expect(espnSportPath("not-a-competition")).toBe("soccer");
    });
  });

  it("maps scheduled and finished matches", () => {
    const scheduled = mapEspnEvent({
      id: "401",
      ...scheduledFixture,
      competitions: [{
        status: { type: { name: "STATUS_SCHEDULED", state: "pre", completed: false } },
        competitors: [
          { homeAway: "home", score: "0", team: { id: "1", displayName: "Brøndby IF", abbreviation: "BIF", logo: "https://example.com/1.png" } },
          { homeAway: "away", score: "0", team: { id: "2", displayName: "Randers FC", abbreviation: "RAN", logo: "https://example.com/2.png" } },
        ],
      }],
    }, "den.1");
    expect(scheduled).toMatchObject({
      externalId: "401",
      status: "scheduled",
      homeScore: null,
      awayScore: null,
      winnerExternalId: null,
    });

    const finished = mapEspnEvent({
      id: "402",
      ...scheduledFixture,
      competitions: [{
        status: { type: { name: "STATUS_FULL_TIME", state: "post", completed: true } },
        competitors: [
          { homeAway: "home", winner: true, score: "2", team: { id: "1", displayName: "Brøndby IF" } },
          { homeAway: "away", winner: false, score: "1", team: { id: "2", displayName: "Randers FC" } },
        ],
      }],
    }, "den.1");
    expect(finished).toMatchObject({
      status: "finished",
      homeScore: 2,
      awayScore: 1,
      winnerExternalId: "1",
    });
  });

  it("normalizes exceptional statuses", () => {
    expect(normalizeEspnStatus({ name: "STATUS_POSTPONED", state: "pre" })).toBe("postponed");
    expect(normalizeEspnStatus({ name: "STATUS_CANCELED", state: "post" })).toBe("cancelled");
    expect(normalizeEspnStatus({ name: "STATUS_IN_PROGRESS", state: "in" })).toBe("live");
  });
});
