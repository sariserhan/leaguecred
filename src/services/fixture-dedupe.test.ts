import { describe, expect, it } from "vitest";

import { pickCanonicalFixture, planFixtureMerges, type DedupeFixture } from "@/services/fixture-dedupe";

function fixture(overrides: Partial<DedupeFixture> & { id: string }): DedupeFixture {
  return {
    matchKey: "match",
    provider: "espn-web",
    status: "finished",
    homeScore: 1,
    awayScore: 0,
    pickCount: 0,
    createdAt: 0,
    ...overrides,
  };
}

describe("planFixtureMerges", () => {
  it("keeps one row per match and drops the other provider's copy", () => {
    const { merges, withPicks } = planFixtureMerges([
      fixture({ id: "espn" }),
      fixture({ id: "fdu", provider: "football-data-uk" }),
    ]);

    expect(withPicks).toHaveLength(0);
    expect(merges).toHaveLength(1);
    expect(merges[0].canonical.id).toBe("espn");
    expect(merges[0].duplicates.map((f) => f.id)).toEqual(["fdu"]);
  });

  it("leaves a match recorded only once alone", () => {
    expect(planFixtureMerges([fixture({ id: "only" })]).merges).toHaveLength(0);
  });

  it("does not mix two different matches", () => {
    const { merges } = planFixtureMerges([
      fixture({ id: "a", matchKey: "match-a" }),
      fixture({ id: "b", matchKey: "match-b" }),
    ]);
    expect(merges).toHaveLength(0);
  });

  it("holds back a match whose picks are split across both copies", () => {
    // Whichever row survives, the other still carries a Weekly Lock, and
    // moving it would drag that lock into a matchweek nobody chose.
    const { merges, withPicks } = planFixtureMerges([
      fixture({ id: "espn", pickCount: 1 }),
      fixture({ id: "fdu", provider: "football-data-uk", pickCount: 1 }),
    ]);

    expect(merges).toHaveLength(0);
    expect(withPicks).toHaveLength(1);
  });

  it("keeps the row that already carries the picks", () => {
    const { merges } = planFixtureMerges([
      fixture({ id: "espn" }),
      fixture({ id: "fdu", provider: "football-data-uk", pickCount: 2 }),
    ]);

    expect(merges[0].canonical.id).toBe("fdu");
    expect(merges[0].duplicates.map((f) => f.id)).toEqual(["espn"]);
  });
});

describe("pickCanonicalFixture", () => {
  it("prefers a finished row with scores over one without", () => {
    const chosen = pickCanonicalFixture([
      fixture({ id: "bare", provider: "espn-web", status: "scheduled", homeScore: null, awayScore: null }),
      fixture({ id: "played", provider: "football-data-uk" }),
    ]);
    expect(chosen.id).toBe("played");
  });

  it("prefers the owning provider when both rows are equally complete", () => {
    const chosen = pickCanonicalFixture([
      fixture({ id: "fdu", provider: "football-data-uk" }),
      fixture({ id: "espn", provider: "espn-web" }),
    ]);
    expect(chosen.id).toBe("espn");
  });

  it("falls back to the oldest row", () => {
    const chosen = pickCanonicalFixture([
      fixture({ id: "newer", createdAt: 200 }),
      fixture({ id: "older", createdAt: 100 }),
    ]);
    expect(chosen.id).toBe("older");
  });
});
