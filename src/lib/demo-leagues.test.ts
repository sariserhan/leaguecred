import { describe, expect, it } from "vitest";

import { pickDemoLeagues } from "@/lib/demo-leagues";

const league = (slug: string, sport: string) => ({ slug, sport });

describe("pickDemoLeagues", () => {
  it("leads with the strongest leagues in order", () => {
    const picked = pickDemoLeagues([
      league("premier-league", "football"), league("ucl", "football"),
      league("la-liga", "football"), league("serie-a", "football"),
      league("nba", "basketball"),
    ]);
    expect(picked.map((l) => l.slug)).toEqual(["premier-league", "ucl", "la-liga", "nba"]);
  });

  it("leaves the shortlist alone when it already spans two sports", () => {
    const picked = pickDemoLeagues([
      league("premier-league", "football"), league("nba", "basketball"),
      league("la-liga", "football"), league("serie-a", "football"),
      league("nfl", "american-football"),
    ]);
    expect(picked.map((l) => l.slug)).toEqual(["premier-league", "nba", "la-liga", "serie-a"]);
  });

  it("gives the slot back to football when there is no other sport", () => {
    const picked = pickDemoLeagues([
      league("premier-league", "football"), league("ucl", "football"),
      league("la-liga", "football"), league("serie-a", "football"),
      league("bundesliga", "football"),
    ]);
    expect(picked.map((l) => l.slug)).toEqual(["premier-league", "ucl", "la-liga", "serie-a"]);
  });

  it("returns a short catalogue untouched", () => {
    const picked = pickDemoLeagues([league("premier-league", "football"), league("ucl", "football")]);
    expect(picked).toHaveLength(2);
  });
});
