import { describe, expect, it } from "vitest";

import { isDuplicateOfCatalogued, isSameClub, namesCouldBeOneClub, pickCanonical, planTeamMerges, type DedupeTeam } from "@/services/team-dedupe";

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
  ])("rejects %s and %s, leaving them for review", (left, right) => {
    expect(namesCouldBeOneClub(left, right)).toBe(false);
  });

  it("accepts a pair once an alias records what the fixtures proved", () => {
    // Only "athletic" agreed, which is too generic to merge on. The fixtures
    // settled it, and the alias now carries that answer.
    expect(namesCouldBeOneClub("Athletic Club", "Athletic Bilbao")).toBe(true);
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

describe("isSameClub with one side missing a country", () => {
  it("absorbs a stub whose country the surviving row simply does not record", () => {
    // Both Slavia Prague rows: one carries the league, the other the country.
    const withLeague = team({ id: "sk-slavia-praha", name: "SK Slavia Praha", regions: ["Europe"], memberships: 1 });
    const stub = team({ id: "slavia-prague", name: "Slavia Prague", country_id: "country-czechia" });

    expect(isSameClub(withLeague, stub)).toBe(true);
  });

  it("reads a confederation as no country, so Europe never contradicts Germany", () => {
    // Bayer 04 Leverkusen came in through a continental competition, which files
    // it under Europe. Comparing that with Germany as though both were countries
    // called one club two and duplicated every fixture it played.
    const domestic = team({ id: "bayer-leverkusen", name: "Bayer Leverkusen", country_id: "country-germany", regions: ["Europe"], memberships: 2 });
    const continental = team({ id: "bayer-04-leverkusen", name: "Bayer 04 Leverkusen", country_id: "region-europe", country_is_region: true, regions: ["Europe"], memberships: 1 });

    expect(isSameClub(domestic, continental)).toBe(true);
  });

  it("still refuses when the two countries disagree", () => {
    const spain = team({ id: "a", name: "Cordoba", country_id: "country-spain", memberships: 1 });
    const argentina = team({ id: "b", name: "Cordoba", country_id: "country-argentina" });

    expect(isSameClub(spain, argentina)).toBe(false);
  });

  it("still refuses a club that plays in a league of its own", () => {
    const barcelona = team({ id: "barcelona", name: "Barcelona", country_id: "country-spain", regions: ["Europe"], memberships: 1 });
    const ecuador = team({ id: "barcelona-sc", name: "Barcelona SC", regions: ["Americas"], memberships: 1 });

    expect(isSameClub(barcelona, ecuador)).toBe(false);
  });
});

describe("isDuplicateOfCatalogued", () => {
  const played = (name: string, fixtures = 5) => ({ name, fixtures });
  const stub = (name: string) => ({ name, fixtures: 0 });

  it.each([
    ["Genk", "Racing Genk"],
    ["Sturm", "SK Sturm Graz"],
  ])("flags the unplayed %s beside %s for review", (candidate, catalogued) => {
    expect(isDuplicateOfCatalogued(stub(candidate), played(catalogued))).toBe(true);
  });

  it.each([
    // Why this only ever flags, and never merges: both halves of a real
    // rivalry can nest, and one of them may simply not be synced yet.
    ["LAFC", "LA Galaxy"],
    ["Paris Saint-Germain", "Paris FC"],
    ["Atlético Junior", "Boca Juniors"],
    ["Universidad Católica", "Universidad Católica (Quito)"],
  ])("cannot tell %s from %s once both play, so it stays quiet", (left, right) => {
    expect(isDuplicateOfCatalogued(played(left, 14), played(right, 15))).toBe(false);
    expect(isDuplicateOfCatalogued(played(right, 15), played(left, 14))).toBe(false);
  });

  it("will not pair one empty entry with another", () => {
    expect(isDuplicateOfCatalogued(stub("Genk"), stub("Racing Genk"))).toBe(false);
  });

  it("needs the names to nest, not merely to be unplayed", () => {
    expect(isDuplicateOfCatalogued(stub("Everton"), played("Liverpool"))).toBe(false);
  });

  it("says nothing about a pair an alias already settles", () => {
    // Aliased pairs match by name outright and never reach this rule.
    expect(isDuplicateOfCatalogued(stub("Altach"), played("SC Rheindorf Altach"))).toBe(false);
  });
});

describe("a country the two rows disagree on", () => {
  it("keeps Santos of Brazil out of Santos Laguna of Mexico", () => {
    // The Brazilian club had picked up a stray Liga MX membership, so both sat
    // in one competition and both are filed under the Americas.
    const brazil = team({
      id: "santos", name: "Santos", country_id: "country-brazil",
      regions: ["Americas"], memberships: 2, domestic_memberships: 2,
    });
    const mexico = team({ id: "santos-laguna", name: "Santos Laguna", country_id: "country-mexico", regions: ["Americas"], memberships: 1 });

    expect(isSameClub(brazil, mexico)).toBe(false);
    expect(planTeamMerges([brazil, mexico], [["santos", "santos-laguna"]]).merges).toHaveLength(0);
  });

  it("still merges when the two countries agree", () => {
    const a = team({ id: "a", name: "Altach", country_id: "country-austria", regions: ["Europe"], memberships: 1 });
    const b = team({ id: "b", name: "SC Rheindorf Altach", country_id: "country-austria", regions: ["Europe"], memberships: 1 });

    expect(isSameClub(a, b)).toBe(true);
  });

  it("still falls through to the region when only one country is known", () => {
    const ucl = team({ id: "ucl", name: "Real Madrid", regions: ["Europe"], memberships: 1 });
    const laLiga = team({ id: "la-liga", name: "Real Madrid", country_id: SPAIN, regions: ["Europe"], memberships: 1, domestic_memberships: 1 });

    expect(isSameClub(laLiga, ucl)).toBe(true);
  });
});
