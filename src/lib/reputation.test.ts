import { describe, expect, it } from "vitest";

import {
  MINIMUM_SETTLED_PICKS_FOR_RANK,
  calculateAccuracy,
  isLeaderboardEligible,
  wilsonLowerBound,
} from "./reputation";

describe("calculateAccuracy", () => {
  it("calculates wins divided by settled non-void picks", () => {
    expect(calculateAccuracy(36, 10)).toBeCloseTo(0.7826, 4);
  });

  it("returns zero before a user has settled picks", () => {
    expect(calculateAccuracy(0, 0)).toBe(0);
  });
});

describe("wilsonLowerBound", () => {
  it("rewards a proven record over a tiny perfect sample", () => {
    expect(wilsonLowerBound(42, 8)).toBeGreaterThan(
      wilsonLowerBound(5, 0),
    );
  });

  it("returns zero for an empty record", () => {
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });
});

describe("isLeaderboardEligible", () => {
  it("requires ten settled independent picks by default", () => {
    expect(isLeaderboardEligible(8, 1)).toBe(false);
    expect(isLeaderboardEligible(8, 2)).toBe(true);
  });

  it("rejects invalid records", () => {
    expect(() => calculateAccuracy(-1, 2)).toThrow(RangeError);
    expect(() => wilsonLowerBound(2.5, 1)).toThrow(RangeError);
  });
});

describe("MINIMUM_SETTLED_PICKS_FOR_RANK", () => {
  it("is the spec section 20 eligibility threshold", () => {
    expect(MINIMUM_SETTLED_PICKS_FOR_RANK).toBe(10);
  });

  // Guards against the threshold drifting apart from the eligibility check
  // again, the way it had been duplicated across the SQL and the UI copy.
  it("is the default boundary used by isLeaderboardEligible", () => {
    expect(isLeaderboardEligible(MINIMUM_SETTLED_PICKS_FOR_RANK - 1, 0)).toBe(false);
    expect(isLeaderboardEligible(MINIMUM_SETTLED_PICKS_FOR_RANK, 0)).toBe(true);
    expect(isLeaderboardEligible(0, MINIMUM_SETTLED_PICKS_FOR_RANK)).toBe(true);
  });
});
