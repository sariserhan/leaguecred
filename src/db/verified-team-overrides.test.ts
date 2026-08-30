import { describe, expect, it } from "vitest";

import {
  verifiedTeamImportOverrides,
  verifiedTeamOverrides,
} from "@/db/verified-team-overrides";

describe("verified team catalog overrides", () => {
  it("completes the 12-team Austrian Bundesliga roster", () => {
    expect(verifiedTeamOverrides.map((team) => team.name)).toEqual([
      "Wolfsberger AC",
      "WSG Tirol",
    ]);
    expect(verifiedTeamOverrides.every((team) => team.logoUrl.startsWith("https://"))).toBe(true);
    expect(verifiedTeamImportOverrides).toContainEqual(expect.objectContaining({
      leagueExternalId: "218",
      isComplete: true,
      teamCount: 12,
    }));
  });
});
