import { describe, expect, it } from "vitest";

import { disabledLeagueSlugs } from "@/db/expanded-catalog";

describe("expanded league catalog", () => {
  it("keeps the intentionally unsupported leagues disabled", () => {
    expect([...disabledLeagueSlugs]).toEqual([
      "switzerland-super-league",
      "czech-republic-czech-liga",
    ]);
  });
});
