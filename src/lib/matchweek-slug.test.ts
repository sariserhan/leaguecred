import { describe, expect, it } from "vitest";

import { isMatchweekId, isMatchweekSlug, matchweekSlugAt, matchweekSlugBase } from "@/lib/matchweek-slug";

describe("matchweekSlugBase", () => {
  it("is the UTC day the week starts", () => {
    expect(matchweekSlugBase("2026-08-15T18:30:00Z")).toBe("2026-08-15");
    expect(matchweekSlugBase(new Date("2026-01-02T00:00:00Z"))).toBe("2026-01-02");
  });

  // A kickoff late on the 15th UTC must not become the 16th somewhere else.
  it("does not drift with the local clock", () => {
    expect(matchweekSlugBase("2026-08-15T23:59:00Z")).toBe("2026-08-15");
  });
});

describe("matchweekSlugAt", () => {
  it("leaves the first week of a day unsuffixed", () => {
    expect(matchweekSlugAt("2026-08-15T18:30:00Z", 1)).toBe("2026-08-15");
  });

  // La Liga really does hold two weeks starting 2026-08-15.
  it("suffixes a genuine collision", () => {
    expect(matchweekSlugAt("2026-08-15T18:30:00Z", 2)).toBe("2026-08-15-2");
    expect(matchweekSlugAt("2026-08-15T18:30:00Z", 3)).toBe("2026-08-15-3");
  });
});

describe("recognising an address", () => {
  it.each(["2026-08-15", "2026-08-15-2", "2026-12-31-10"])("accepts the slug %s", (value) => {
    expect(isMatchweekSlug(value)).toBe(true);
    expect(isMatchweekId(value)).toBe(false);
  });

  it.each(["2026-8-15", "week-5", "", "2026-08-15-", "../secrets"])("rejects %s", (value) => {
    expect(isMatchweekSlug(value)).toBe(false);
  });

  it("still recognises the old uuid address", () => {
    const id = "5eabdf1c-7be2-4a55-ba34-bbc5c7a8df70";
    expect(isMatchweekId(id)).toBe(true);
    expect(isMatchweekSlug(id)).toBe(false);
  });
});
