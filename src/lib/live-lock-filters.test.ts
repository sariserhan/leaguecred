import { describe, expect, it } from "vitest";

import { NO_FILTER, filterLocks, lockDay, lockFilterOptions } from "@/lib/live-lock-filters";

const locks = [
  { userId: "ada", username: "Ada", kickoffAt: "2026-09-05T17:00:00.000Z", league: { slug: "super-lig", name: "Süper Lig" } },
  { userId: "bo", username: "Bo", kickoffAt: "2026-09-05T19:30:00.000Z", league: { slug: "premier-league", name: "Premier League" } },
  { userId: "ada", username: "Ada", kickoffAt: "2026-09-06T14:00:00.000Z", league: { slug: "super-lig", name: "Süper Lig" } },
];

describe("filterLocks", () => {
  it("returns everything when nothing is chosen", () => {
    expect(filterLocks(locks, { league: NO_FILTER, member: NO_FILTER, date: NO_FILTER })).toHaveLength(3);
  });

  it("narrows by league, member and day together", () => {
    const filtered = filterLocks(locks, { league: "super-lig", member: "ada", date: "2026-09-05" });

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.kickoffAt).toBe("2026-09-05T17:00:00.000Z");
  });

  it("can narrow to nothing rather than falling back to everything", () => {
    expect(filterLocks(locks, { league: "premier-league", member: "ada", date: NO_FILTER })).toHaveLength(0);
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
    expect(options.members.map((member) => member.label)).toEqual(["Ada", "Bo"]);
    expect(options.days).toEqual(["2026-09-05", "2026-09-06"]);
  });

  // Display names are not unique, so two members can present the same one. The
  // filter still has to tell them apart, or picking one silently returns both.
  it("keeps two members with the same display name apart", () => {
    const shared = [
      { userId: "one", handle: "kaan_bjk", username: "Kaan", kickoffAt: "2026-09-05T17:00:00.000Z", league: { slug: "super-lig", name: "Süper Lig" } },
      { userId: "two", handle: "kaan_fb", username: "Kaan", kickoffAt: "2026-09-05T19:30:00.000Z", league: { slug: "super-lig", name: "Süper Lig" } },
    ];

    const options = lockFilterOptions(shared);

    expect(options.members.map((member) => member.label)).toEqual(["Kaan @kaan_bjk", "Kaan @kaan_fb"]);
    expect(filterLocks(shared, { league: NO_FILTER, member: "one", date: NO_FILTER })).toHaveLength(1);
  });
});