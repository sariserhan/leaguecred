import { describe, expect, it } from "vitest";

import type { EspnTeam } from "@/providers/espn-team-logos";
import { matchEspnTeam } from "@/services/team-logo-sync";

const teams: EspnTeam[] = [
  { id: "1", displayName: "RCD Espanyol", shortDisplayName: "Espanyol", logoUrl: "https://example.com/1.png" },
  { id: "2", displayName: "Atlanta United FC", shortDisplayName: "Atlanta United", logoUrl: "https://example.com/2.png" },
  { id: "3", displayName: "Example Women", shortDisplayName: "Example", logoUrl: null },
  { id: "8", displayName: "Estudiantes de La Plata", shortDisplayName: "Estudiantes", logoUrl: "https://example.com/8.png" },
  { id: "19685", displayName: "Estudiantes de Río Cuarto", shortDisplayName: "Estudiantes RC", logoUrl: "https://example.com/19685.png" },
];

describe("matchEspnTeam", () => {
  it("matches known aliases and short names", () => {
    expect(matchEspnTeam("Espanol", teams)?.id).toBe("1");
    expect(matchEspnTeam("Atlanta Utd", teams)?.id).toBe("2");
  });

  it("does not return teams without a logo", () => {
    expect(matchEspnTeam("Example", teams)).toBeNull();
  });

  it("does not confuse the two Estudiantes clubs", () => {
    expect(matchEspnTeam("Estudiantes L.P.", teams)?.id).toBe("8");
    expect(matchEspnTeam("Estudiantes Rio Cuarto", teams)?.id).toBe("19685");
  });
});
