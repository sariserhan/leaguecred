import { describe, expect, it } from "vitest";

import { ESPN_FIXTURE_COMPETITIONS, mapEspnEvent, normalizeEspnStatus } from "@/providers/espn-fixtures";

const scheduledFixture = {
  date: "2026-09-06T16:00:00Z",
  season: { slug: "2026-27-danish-superliga" },
};

describe("ESPN fixture provider", () => {
  it("covers every enabled competition", () => {
    expect(ESPN_FIXTURE_COMPETITIONS).toHaveLength(23);
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).toContain("denmark-superliga");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).toContain("premier-league");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).toContain("efl-championship");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).not.toContain("switzerland-super-league");
    expect(ESPN_FIXTURE_COMPETITIONS.map((entry) => entry.leagueSlug)).not.toContain("czech-republic-czech-liga");
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
