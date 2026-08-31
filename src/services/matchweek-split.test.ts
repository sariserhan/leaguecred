import { describe, expect, it } from "vitest";

import { planMatchweekRounds } from "@/services/matchweek-split";

const at = (iso: string) => ({ id: iso, kickoffAt: `${iso}T18:00:00Z` });
const ids = (rounds: ReturnType<typeof planMatchweekRounds>) => rounds.map((round) => round.fixtureIds);

describe("planMatchweekRounds", () => {
  it("finds the rounds inside the Liga Portugal week that swallowed its neighbours", () => {
    // The real shape in production: a Monday leftover, a Friday-to-Monday round,
    // then the next round after a four-day gap.
    expect(ids(planMatchweekRounds([
      at("2026-08-24"), at("2026-08-28"), at("2026-08-29"), at("2026-08-30"), at("2026-08-31"),
      at("2026-09-04"), at("2026-09-05"), at("2026-09-06"),
    ]))).toEqual([
      ["2026-08-24"],
      ["2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31"],
      ["2026-09-04", "2026-09-05", "2026-09-06"],
    ]);
  });

  it("leaves a single round whole, however long its weekend runs", () => {
    const rounds = planMatchweekRounds([
      at("2026-08-28"), at("2026-08-29"), at("2026-08-30"), at("2026-08-31"),
    ]);

    expect(rounds).toHaveLength(1);
    expect(rounds[0].startAt.toISOString()).toContain("2026-08-28");
    expect(rounds[0].endAt.toISOString()).toContain("2026-08-31");
  });

  it("keeps a midweek game with the weekend it belongs to", () => {
    // Two days is a normal spread within one round, not a boundary.
    expect(planMatchweekRounds([at("2026-08-29"), at("2026-08-31")])).toHaveLength(1);
    expect(planMatchweekRounds([at("2026-08-29"), at("2026-09-02")])).toHaveLength(2);
  });

  it("says nothing about an empty week", () => {
    expect(planMatchweekRounds([])).toEqual([]);
  });

  it("orders by kickoff rather than trusting the order it was given", () => {
    expect(ids(planMatchweekRounds([
      at("2026-09-05"), at("2026-08-29"), at("2026-09-06"), at("2026-08-30"),
    ]))).toEqual([["2026-08-29", "2026-08-30"], ["2026-09-05", "2026-09-06"]]);
  });
});
