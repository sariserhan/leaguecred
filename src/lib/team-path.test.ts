import { describe, expect, it } from "vitest";

import { teamSlug } from "@/lib/team-path";

describe("teamSlug", () => {
  it.each([
    // Letters with a combining mark: NFD strips these on its own.
    ["Fenerbahçe", "fenerbahce"],
    ["Göztepe", "goztepe"],
    ["Beşiktaş", "besiktas"],
    ["Grêmio", "gremio"],
    ["Borussia Mönchengladbach", "borussia-monchengladbach"],
  ])("folds %s to %s", (name, expected) => {
    expect(teamSlug(name)).toBe(expected);
  });

  it.each([
    // Letters that carry no combining mark, which NFD leaves untouched. Each
    // of these used to become a hyphen.
    ["Kasımpaşa", "kasimpasa"],
    ["Malmö FF", "malmo-ff"],
    ["Bodø/Glimt", "bodo-glimt"],
    ["Preußen Münster", "preussen-munster"],
    ["Łódź", "lodz"],
    ["Brøndby", "brondby"],
    ["Aalborg BK", "aalborg-bk"],
  ])("folds the undecomposed %s to %s", (name, expected) => {
    expect(teamSlug(name)).toBe(expected);
  });

  it("never returns an empty slug", () => {
    expect(teamSlug("—")).toBe("team");
    expect(teamSlug("")).toBe("team");
  });

  it("does not leave a leading or trailing hyphen", () => {
    expect(teamSlug("  Çorum FK  ")).toBe("corum-fk");
  });
});
