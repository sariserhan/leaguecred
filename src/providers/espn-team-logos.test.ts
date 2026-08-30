import { describe, expect, it } from "vitest";

import type { EspnTeam } from "@/providers/espn-team-logos";
import { matchEspnTeam } from "@/services/team-logo-sync";

const teams: EspnTeam[] = [
  { id: "1", displayName: "RCD Espanyol", shortDisplayName: "Espanyol", logoUrl: "https://example.com/1.png" },
  { id: "2", displayName: "Atlanta United FC", shortDisplayName: "Atlanta United", logoUrl: "https://example.com/2.png" },
  { id: "3", displayName: "Example Women", shortDisplayName: "Example", logoUrl: null },
];

describe("matchEspnTeam", () => {
  it("matches known aliases and short names", () => {
    expect(matchEspnTeam("Espanol", teams)?.id).toBe("1");
    expect(matchEspnTeam("Atlanta Utd", teams)?.id).toBe("2");
  });

  it("does not return teams without a logo", () => {
    expect(matchEspnTeam("Example", teams)).toBeNull();
  });
});
