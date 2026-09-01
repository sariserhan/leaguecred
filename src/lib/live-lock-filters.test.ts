import { describe, expect, it } from "vitest";

import { NO_FILTER, filterLocks, lockDay, lockFilterOptions } from "@/lib/live-lock-filters";

const locks = [
  { username: "Ada", kickoffAt: "2026-09-05T17:00:00.000Z", league: { slug: "super-lig", name: "Süper Lig" } },
  { username: "Bo", kickoffAt: "2026-09-05T19:30:00.000Z", league: { slug: "premier-league", name: "Premier League" } },
  { username: "Ada", kickoffAt: "2026-09-06T14:00:00.000Z", league: { slug: "super-lig", name: "Süper Lig" } },
];

describe("filterLocks", () => {
  it("returns everything when nothing is chosen", () => {
    expect(filterLocks(locks, { league: NO_FILTER, member: NO_FILTER, date: NO_FILTER })).toHaveLength(3);
  });

  it("narrows by league, member and day together", () => {
    const filtered = filterLocks(locks, { league: "super-lig", member: "Ada", date: "2026-09-05" });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kickoffAt).toBe("2026-09-05T17:00:00.000Z");
  });

  it("can narrow to nothing rather than falling back to everything", () => {
    expect(filterLocks(locks, { league: "premier-league", member: "Ada", date: NO_FILTER })).toHaveLength(0);
  });

  // A kickoff at 19:30 UTC is the same matchday as one at 17:00, and a reader
  // filtering by day means the day the match is played.
  it("groups a day by its UTC kickoff date", () => {
    expect(lockDay(locks[1]!)).toBe("2026-09-05");
  });
});

describe("lockFilterOptions", () => {
  it("offers only the leagues, members and days the board is showing", () => {
    const options = lockFilterOptions(locks);

    expect(options.leagues.map((league) => league.slug)).toEqual(["premier-league", "super-lig"]);
    expect(options.members).toEqual(["Ada", "Bo"]);
    expect(options.days).toEqual(["2026-09-05", "2026-09-06"]);
  });
});
