import { describe, expect, it } from "vitest";

import {
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
