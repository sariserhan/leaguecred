import { describe, expect, it } from "vitest";

import { sportLabel, sportsPresent } from "@/lib/sports";

describe("sportLabel", () => {
  it("names the sports the catalogue carries", () => {
    expect(sportLabel("football")).toBe("Football");
    expect(sportLabel("ice-hockey")).toBe("Ice hockey");
  });

  // The distinction the whole slug exists for.
  it("does not call the NFL football", () => {
    expect(sportLabel("american-football")).toBe("American football");
    expect(sportLabel("american-football")).not.toBe(sportLabel("football"));
  });

  it("falls back to the slug for a sport nobody has labelled yet", () => {
    expect(sportLabel("kabaddi")).toBe("kabaddi");
  });
});

describe("sportsPresent", () => {
  it("keeps a stable order whatever the catalogue returns", () => {
    expect(sportsPresent(["baseball", "football", "basketball"]))
      .toEqual(["football", "basketball", "baseball"]);
  });

  it("collapses duplicates", () => {
    expect(sportsPresent(["football", "football", "baseball"])).toEqual(["football", "baseball"]);
  });

  it("puts an unlabelled sport last rather than dropping it", () => {
    expect(sportsPresent(["kabaddi", "football"])).toEqual(["football", "kabaddi"]);
  });
});
