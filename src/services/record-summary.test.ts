import { describe, expect, it } from "vitest";

import { calculateRecordSummary } from "@/services/record-summary";

describe("calculateRecordSummary", () => {
  it("does not let voids break a winning streak or count as settled picks", () => {
    expect(calculateRecordSummary(["win", "void", "win", "loss", "void", "win"])).toMatchObject({
      wins: 3,
      losses: 1,
      voids: 2,
      settledPicks: 4,
      currentWinStreak: 1,
      bestWinStreak: 2,
      tier: "Provisional",
    });
  });

  it("becomes established at ten non-void settled picks", () => {
    expect(calculateRecordSummary(["win", "win", "win", "win", "win", "win", "win", "win", "win", "void", "loss"])).toMatchObject({
      settledPicks: 10,
      voids: 1,
      tier: "Established",
    });
  });
});
