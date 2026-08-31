import { describe, expect, it } from "vitest";

import { chooseDisambiguatingName, chooseDisplayName } from "@/services/team-display-name";
import { normalizeTeamName } from "@/services/team-names";

describe("chooseDisplayName", () => {
  it.each([
    // The names actually wrong in the Süper Lig table, all football-data
    // abbreviations that outlived a merge.
    ["Buyuksehyr", "Istanbul Basaksehir", "Istanbul Basaksehir"],
    ["Goztep", "Goztepe", "Goztepe"],
    ["Amed", "Amed SFK", "Amed SFK"],
    ["Sp Lisbon", "Sporting CP", "Sporting CP"],
  ])("renames %s to ESPN's %s", (current, espn, expected) => {
    expect(chooseDisplayName(current, espn)).toBe(expected);
  });

  it.each([
    // ESPN writes these without their Turkish letters; ours are already right.
    ["Beşiktaş", "Besiktas"],
    ["Fenerbahçe", "Fenerbahce"],
    ["Gençlerbirliği", "Genclerbirligi"],
    ["Çorum FK", "Corum FK"],
    ["Malmö FF", "Malmo FF"],
    ["Borussia Mönchengladbach", "Borussia Monchengladbach"],
  ])("keeps %s rather than take ESPN's stripped %s", (current, espn) => {
    expect(chooseDisplayName(current, espn)).toBeNull();
  });

  it("adopts the accents when ESPN is the one spelling it properly", () => {
    expect(chooseDisplayName("Besiktas", "Beşiktaş")).toBe("Beşiktaş");
  });

  it("leaves a club alone when ESPN agrees", () => {
    expect(chooseDisplayName("Arsenal", "Arsenal")).toBeNull();
  });

  it("leaves a club alone when ESPN has never named it", () => {
    expect(chooseDisplayName("Slavia Prague", null)).toBeNull();
    expect(chooseDisplayName("Slavia Prague", "  ")).toBeNull();
  });

  it("does not treat a fuller name as a stripped one", () => {
    // "Arsenal" and "Arsenal FC" are different names, so ESPN decides.
    expect(chooseDisplayName("Arsenal", "Arsenal FC")).toBe("Arsenal FC");
  });

  it("folds letters that have no decomposed form", () => {
    // Turkish dotless i and German eszett would otherwise read as different
    // names, and the accented spelling would be replaced by the plain one.
    expect(chooseDisplayName("Kasımpaşa", "Kasimpasa")).toBeNull();
    expect(chooseDisplayName("Preußen Münster", "Preussen Munster")).toBeNull();
  });
});

describe("chooseDisambiguatingName", () => {
  const taken = (...names: string[]) => new Set(names.map((n) => n.toLowerCase()));

  it("gives the Mexican club back the name that tells it apart", () => {
    expect(chooseDisambiguatingName("Santos", ["Santos", "Santos Laguna"], taken("santos")))
      .toBe("Santos Laguna");
  });

  it("leaves a club alone when its name is its own", () => {
    expect(chooseDisambiguatingName("Everton", ["Everton FC"], taken("liverpool"))).toBeNull();
  });

  it("returns null when nothing on offer is any clearer", () => {
    expect(chooseDisambiguatingName("Santos", ["Santos"], taken("santos"))).toBeNull();
    expect(chooseDisambiguatingName("Santos", [], taken("santos"))).toBeNull();
  });

  it("never offers a name another club already holds", () => {
    expect(chooseDisambiguatingName("Santos", ["Santos", "Boca Juniors"], taken("santos", "boca juniors")))
      .toBeNull();
  });

  it("prefers the most specific spelling available", () => {
    expect(chooseDisambiguatingName("Rangers", ["Rangers FC", "Queens Park Rangers"], taken("rangers")))
      .toBe("Queens Park Rangers");
  });
});

describe("football-data.org spellings", () => {
  // Each of these had its own club row in production, and with it a duplicate
  // of every fixture the club appeared in.
  it.each([
    ["AZ", "AZ Alkmaar"],
    ["Atalanta BC", "Atalanta"],
    ["Bayer 04 Leverkusen", "Bayer Leverkusen"],
    ["Bologna FC 1909", "Bologna"],
    ["Hamburger SV", "Hamburg SV"],
    ["SS Lazio", "Lazio"],
    ["TSG 1899 Hoffenheim", "TSG Hoffenheim"],
  ])("resolves %s to the same club as %s", (verbose, plain) => {
    expect(normalizeTeamName(verbose)).toBe(normalizeTeamName(plain));
  });
});
