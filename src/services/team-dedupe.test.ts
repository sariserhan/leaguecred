import { describe, expect, it } from "vitest";

import { namesCouldBeOneClub, pickCanonical, planTeamMerges, type DedupeTeam } from "@/services/team-dedupe";

const SPAIN = "country-spain";
const TURKIYE = "country-turkiye";

function team(overrides: Partial<DedupeTeam> & { id: string; name: string }): DedupeTeam {
  return {
    slug: overrides.id,
    country_id: null,
    regions: [],
    memberships: 0,
    domestic_memberships: 0,
    created_at: 0,
    ...overrides,
  };
}

/** The club as its domestic league catalogued it. */
function domestic(id: string, name: string, country: string | null, region: string) {
  return team({ id, name, country_id: country, regions: [region], memberships: 1, domestic_memberships: 1 });
}

/** The second row a continental competition created for the same club. */
function continental(id: string, name: string, region: string) {
  return team({ id, name, country_id: null, regions: [region], memberships: 1, domestic_memberships: 0 });
}

describe("planTeamMerges", () => {
  it("folds a continental duplicate into the club's domestic row", () => {
    const laLiga = domestic("real-madrid-domestic", "Real Madrid", SPAIN, "Europe");
    const { merges, unresolved } = planTeamMerges([
      continental("real-madrid-ucl", "Real Madrid", "Europe"),
      laLiga,
    ]);

    expect(unresolved).toHaveLength(0);
    expect(merges).toHaveLength(1);
    expect(merges[0].canonical.id).toBe(laLiga.id);
    expect(merges[0].duplicates.map((row) => row.id)).toEqual(["real-madrid-ucl"]);
  });

  it("keeps two clubs that share a name but play in different regions apart", () => {
    const { merges, unresolved } = planTeamMerges([
      domestic("liverpool-england", "Liverpool", "country-england", "Europe"),
      continental("liverpool-montevideo", "Liverpool", "Americas"),
    ]);

    expect(merges).toHaveLength(0);
    expect(unresolved).toHaveLength(1);
  });

  it("keeps Barcelona SC of Ecuador out of Barcelona of Spain", () => {
    // Both normalise to "barcelona", so only the region tells them apart.
    const { merges, unresolved } = planTeamMerges([
      domestic("barcelona", "Barcelona", SPAIN, "Europe"),
      domestic("barcelona-sc", "Barcelona SC", null, "Americas"),
    ]);

    expect(merges).toHaveLength(0);
    expect(unresolved).toHaveLength(1);
  });

  it("merges rows that differ only by an accent when the country agrees", () => {
    const { merges } = planTeamMerges([
      domestic("fenerbahce-accented", "Fenerbahçe", TURKIYE, "Europe"),
      team({ id: "fenerbahce-plain", name: "Fenerbahce", country_id: TURKIYE }),
    ]);

    expect(merges).toHaveLength(1);
    expect(merges[0].duplicates.map((row) => row.id)).toEqual(["fenerbahce-plain"]);
  });

  it("absorbs a stub that belongs to no league and claims no country", () => {
    const { merges } = planTeamMerges([
      domestic("rapid-vienna", "Rapid Vienna", "country-austria", "Europe"),
      team({ id: "rapid-vienna-stub", name: "Rapid Vienna" }),
    ]);

    expect(merges).toHaveLength(1);
    expect(merges[0].canonical.id).toBe("rapid-vienna");
  });

  it("leaves a same-named row alone when its country disagrees", () => {
    const { merges, unresolved } = planTeamMerges([
      domestic("cordoba-spain", "Córdoba", SPAIN, "Europe"),
      team({ id: "cordoba-argentina", name: "Cordoba", country_id: "country-argentina" }),
    ]);

    expect(merges).toHaveLength(0);
    expect(unresolved).toHaveLength(1);
  });

  it("ignores clubs catalogued only once", () => {
    const { merges, unresolved } = planTeamMerges([
      domestic("napoli", "Napoli", "country-italy", "Europe"),
    ]);

    expect(merges).toHaveLength(0);
    expect(unresolved).toHaveLength(0);
  });
});

describe("pickCanonical", () => {
  it("prefers a domestic league membership over a continental one", () => {
    const chosen = pickCanonical([
      continental("continental-row", "Napoli", "Europe"),
      domestic("domestic-row", "Napoli", "country-italy", "Europe"),
    ]);

    expect(chosen.id).toBe("domestic-row");
  });

  it("prefers any membership over an unattached stub", () => {
    const chosen = pickCanonical([
      team({ id: "stub", name: "Alianza Lima" }),
      continental("libertadores-row", "Alianza Lima", "Americas"),
    ]);

    expect(chosen.id).toBe("libertadores-row");
  });

  it("falls back to the oldest row when nothing else separates them", () => {
    const chosen = pickCanonical([
      team({ id: "newer", name: "Carabobo", created_at: 200 }),
      team({ id: "older", name: "Carabobo", created_at: 100 }),
    ]);

    expect(chosen.id).toBe("older");
  });
});

describe("namesCouldBeOneClub", () => {
  it.each([
    ["Newcastle", "Newcastle United"],
    ["Leeds", "Leeds United"],
    ["Ipswich", "Ipswich Town"],
    ["Brighton & Hove Albion", "Brighton"],
    ["OH Leuven", "Oud-Heverlee Leuven"],
    ["1. FC Union Berlin", "Union Berlin"],
    ["Waasland-Beveren", "Beveren"],
  ])("accepts %s and %s", (left, right) => {
    expect(namesCouldBeOneClub(left, right)).toBe(true);
  });

  it("rejects two clubs that merely kicked off at the same minute", () => {
    // A seeded fixture once paired these; nothing in the names agrees.
    expect(namesCouldBeOneClub("Antalyaspor", "Beşiktaş")).toBe(false);
  });

  it.each([
    // "real" names neither club on its own, and half a league is "United".
    ["Real Madrid", "Real Sociedad"],
    ["Newcastle United", "Leeds United"],
    // A real pair, but only a generic word agrees, so it goes to review.
    ["Athletic Club", "Athletic Bilbao"],
  ])("rejects %s and %s, leaving them for review", (left, right) => {
    expect(namesCouldBeOneClub(left, right)).toBe(false);
  });
});

describe("planTeamMerges with fixture evidence", () => {
  it("merges a pair the names alone would never group", () => {
    const newcastle = domestic("newcastle", "Newcastle", "country-england", "Europe");
    const united = domestic("newcastle-united", "Newcastle United", "country-england", "Europe");

    expect(planTeamMerges([newcastle, united]).merges).toHaveLength(0);

    const { merges } = planTeamMerges([newcastle, united], [["newcastle", "newcastle-united"]]);
    expect(merges).toHaveLength(1);
    expect(merges[0].duplicates).toHaveLength(1);
  });

  it("chains evidence so three rows for one club become one group", () => {
    const { merges } = planTeamMerges(
      [
        domestic("a", "Gent", "country-belgium", "Europe"),
        domestic("b", "KAA Gent", "country-belgium", "Europe"),
        domestic("c", "K.A.A. Gent", "country-belgium", "Europe"),
      ],
      [["a", "b"], ["b", "c"]],
    );

    expect(merges).toHaveLength(1);
    expect(merges[0].duplicates).toHaveLength(2);
  });
});
