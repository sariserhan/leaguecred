import { describe, expect, it } from "vitest";

import { catalogEntries } from "@/db/catalog-data";
import { disabledLeagueSlugs } from "@/db/expanded-catalog";

describe("expanded league catalog", () => {
  it("seeds no league in a switched-off state", () => {
    // The Swiss and Czech competitions were the only two, and they are gone
    // from the catalog now rather than sitting in it disabled.
    expect([...disabledLeagueSlugs]).toEqual([]);
  });

  it("no longer carries the dropped competitions", () => {
    const slugs = new Set(catalogEntries.map((entry) => entry.slug));
    expect(slugs.has("switzerland-super-league")).toBe(false);
    expect(slugs.has("czech-republic-czech-liga")).toBe(false);
  });
});
