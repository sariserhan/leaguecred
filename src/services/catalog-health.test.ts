import { describe, expect, it } from "vitest";

import { TOLERATED_CATALOG_FAULTS, isHealthy } from "@/services/catalog-health";

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

describe("TOLERATED_CATALOG_FAULTS", () => {
  it("allows only the faults that are genuinely expected", () => {
    // Anything not named here has an allowance of zero, so a new kind of fault
    // is reported the first time it appears rather than silently permitted.
    expect(Object.keys(TOLERATED_CATALOG_FAULTS).toSorted()).toEqual([
      "duplicateClubNames",
      "duplicateMatches",
    ]);
  });

  it("reports the duplicate matches that went unseen, and stays quiet at the expected two", () => {
    const counts = {
      duplicateClubNames: 0,
      duplicateMatches: 2,
      splitGameweeks: 0,
      orphanedClubs: 0,
      malformedSlugs: 0,
      clubsNamedDifferentlyByEspn: 0,
      clubsSpanningRegions: 0,
    };

    expect(isHealthy(counts, TOLERATED_CATALOG_FAULTS)).toBe(true);
    expect(isHealthy({ ...counts, duplicateMatches: 289 }, TOLERATED_CATALOG_FAULTS)).toBe(false);
  });
});
