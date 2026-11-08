import { afterEach, describe, expect, it, vi } from "vitest";

import { ESPN_EVENT_LIMIT, ESPN_FIXTURE_COMPETITIONS, EspnFixtureProvider, espnMonths, espnSportPath, mapEspnEvent, normalizeEspnStatus } from "@/providers/espn-fixtures";

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

describe("reading a window from ESPN", () => {
  afterEach(() => vi.unstubAllGlobals());

  const event = (id: string, date: string) => ({
    id, date,
    competitions: [{
      status: { type: { name: "STATUS_SCHEDULED", state: "pre" as const, completed: false } },
      competitors: [
        { homeAway: "home" as const, team: { id: "1", displayName: "Arsenal" } },
        { homeAway: "away" as const, team: { id: "2", displayName: "Chelsea" } },
      ],
    }],
  });

  it("lists every month a window touches", () => {
    expect(espnMonths("2026-08-15", "2026-11-08")).toEqual(["202608", "202609", "202610", "202611"]);
    expect(espnMonths("2026-12-30", "2027-01-02")).toEqual(["202612", "202701"]);
    expect(espnMonths("2026-11-08", "2026-11-08")).toEqual(["202611"]);
  });

  // ESPN answers a date range with a 400 since September 2026; a month still works.
  it("asks a month at a time, never a range, and keeps only the window's dates", async () => {
    const asked: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: URL) => {
      const month = url.searchParams.get("dates")!;
      asked.push(month);
      const events = month === "202610"
        ? [event("a", "2026-10-01T19:00Z"), event("b", "2026-10-30T19:00Z")]
        : [event("c", "2026-11-05T19:00Z"), event("d", "2026-11-20T19:00Z"), event("b", "2026-10-30T19:00Z")];
      return Response.json({ events });
    }));
    const batch = await new EspnFixtureProvider().fetchFixtures({ leagueExternalId: "eng.1", season: "2026", from: "2026-10-15", to: "2026-11-10" });
    expect(asked).toEqual(["202610", "202611"]);
    expect(batch.fixtures.map((fixture) => fixture.externalId).sort()).toEqual(["b", "c"]);
    expect(batch.requestCount).toBe(2);
  });

  it("fails loudly when ESPN cuts a month short", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({
      events: Array.from({ length: ESPN_EVENT_LIMIT }, (_, index) => event(String(index), "2026-09-10T19:00Z")),
    })));
    await expect(new EspnFixtureProvider().fetchFixtures({ leagueExternalId: "mlb", season: "2026", from: "2026-09-01", to: "2026-09-30" }))
      .rejects.toThrow(/cut short/);
  });
});
