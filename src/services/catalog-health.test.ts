import { describe, expect, it } from "vitest";

import { isHealthy } from "@/services/catalog-health";

const clean = {
  duplicateClubNames: 0,
  duplicateMatches: 0,
  splitGameweeks: 0,
  orphanedClubs: 0,
  malformedSlugs: 0,
  clubsNamedDifferentlyByEspn: 0,
  clubsSpanningRegions: 0,
};

describe("isHealthy", () => {
  it("passes a clean catalog", () => {
    expect(isHealthy(clean)).toBe(true);
  });

  it.each(Object.keys(clean) as Array<keyof typeof clean>)("fails on %s", (key) => {
    expect(isHealthy({ ...clean, [key]: 1 })).toBe(false);
  });

  it("never tolerates a club spanning two confederations", () => {
    // There is no legitimate reason for one: it always means two clubs were
    // merged into one row.
    expect(isHealthy({ ...clean, clubsSpanningRegions: 1 }, { clubsSpanningRegions: 0 })).toBe(false);
  });

  it("allows the faults that are not faults", () => {
    // Two clubs really are called Liverpool, and an undecided playoff tie
    // really does appear twice under placeholder names.
    const known = { ...clean, duplicateClubNames: 1, duplicateMatches: 2 };
    expect(isHealthy(known)).toBe(false);
    expect(isHealthy(known, { duplicateClubNames: 1, duplicateMatches: 2 })).toBe(true);
  });

  it("still fails when a tolerated count is exceeded", () => {
    expect(isHealthy({ ...clean, duplicateMatches: 3 }, { duplicateMatches: 2 })).toBe(false);
  });
});
