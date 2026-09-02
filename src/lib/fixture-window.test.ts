import { describe, expect, it } from "vitest";

import { fixtureWindowStart } from "@/lib/fixture-window";

const now = new Date("2026-09-02T20:00:00Z");

describe("fixtureWindowStart", () => {
  it("reads a football season from its start, which is how a late edit gets repaired", () => {
    expect(fixtureWindowStart({ sport: "football", seasonStartDate: "2026-08-01", now })).toBe("2026-08-01");
  });

  // The bug this exists for: baseball plays about fifteen games a night, so a
  // window opening in March fills ESPN's 200-event response with April and
  // never reaches today.
  it("rolls the window forward for a league that plays every day", () => {
    expect(fixtureWindowStart({ sport: "baseball", seasonStartDate: "2026-03-25", now })).toBe("2026-08-26");
  });

  it.each(["basketball", "ice-hockey", "american-football"])("rolls it for %s too", (sport) => {
    expect(fixtureWindowStart({ sport, seasonStartDate: "2026-03-25", now })).toBe("2026-08-26");
  });

  it("never opens before the season did", () => {
    expect(fixtureWindowStart({ sport: "ice-hockey", seasonStartDate: "2026-10-01", now })).toBe("2026-10-01");
  });

  it("takes a wider lookback when asked", () => {
    expect(fixtureWindowStart({ sport: "baseball", seasonStartDate: "2026-03-25", now, lookbackDays: 30 })).toBe("2026-08-03");
  });
});
