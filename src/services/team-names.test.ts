import { describe, expect, it } from "vitest";

import { normalizeTeamName, teamNamesMatch } from "@/services/team-names";

describe("teamNamesMatch", () => {
  it.each([
    ["Besiktas", "Beşiktaş"],
    ["Ath Bilbao", "Athletic Bilbao"],
    ["Man City", "Manchester City FC"],
    ["Milan", "AC Milan"],
    ["Dortmund", "Borussia Dortmund"],
    ["Paris SG", "Paris Saint-Germain FC"],
    ["Birmingham", "Birmingham City"],
    ["AEK", "AEK Athens"],
    ["Tirol", "WSG Tirol"],
    ["Atletico-MG", "Atlético Mineiro"],
    ["Atlanta Utd", "Atlanta United"],
    ["Guadalajara Chivas", "CD Guadalajara"],
    ["Nordsjaelland", "FC Nordsjælland"],
    ["Salzburg", "Red Bull Salzburg"],
    ["Club Brugge", "Club Brugge KV"],
    ["Internazionale", "FC Internazionale Milano"],
    ["Sporting CP", "Sporting Clube de Portugal"],
    ["Red Bull Bragantino", "Bragantino"],
    ["Guadalajara", "CD Guadalajara"],
    ["Belgrano (Córdoba)", "Belgrano"],
    ["WSG Swarovski Tirol", "WSG Tirol"],
    ["F.C. København", "FC Copenhagen"],
  ])("matches %s to %s", (left, right) => {
    expect(teamNamesMatch(left, right)).toBe(true);
  });

  it("does not merge different clubs", () => {
    expect(teamNamesMatch("Manchester City", "Manchester United")).toBe(false);
  });
});

describe("names the fixtures proved are one club", () => {
  it.each([
    ["Athletic Club", "Athletic Bilbao"],
    ["Stade Rennais", "Rennes"],
    ["Deportivo", "Deportivo de A Coruña"],
    ["SK Slavia Praha", "Slavia Prague"],
  ])("matches %s with %s", (left, right) => {
    expect(teamNamesMatch(left, right)).toBe(true);
  });

  it("still keeps clubs that merely share a first word apart", () => {
    expect(teamNamesMatch("Real Madrid", "Real Sociedad")).toBe(false);
    expect(teamNamesMatch("Deportivo Alavés", "Deportivo de A Coruña")).toBe(false);
  });
});

describe("clubs both providers wrote differently on either side of one match", () => {
  it.each([
    ["SV Elversberg", "Elversberg"],
    ["Bayer Leverkusen", "Leverkusen"],
    ["TSG Hoffenheim", "Hoffenheim"],
    ["FC Cologne", "FC Koln"],
  ])("matches %s with %s", (left, right) => {
    expect(teamNamesMatch(left, right)).toBe(true);
  });

  it("keeps clubs that merely share a city or a word apart", () => {
    expect(teamNamesMatch("Paris Saint-Germain", "Paris FC")).toBe(false);
    expect(teamNamesMatch("LAFC", "LA Galaxy")).toBe(false);
    expect(teamNamesMatch("Atlético Junior", "Boca Juniors")).toBe(false);
    expect(teamNamesMatch("Borussia Dortmund", "Borussia Mönchengladbach")).toBe(false);
  });
});

describe("a club beside a leftover entry naming it", () => {
  it.each([
    ["Altach", "SC Rheindorf Altach"],
    ["Hartberg", "TSV Hartberg"],
    ["SK Rapid", "Rapid Vienna"],
    ["Viborg", "Viborg FF"],
    ["Celje", "NK Celje"],
    ["Mjällby", "Mjällby AIF"],
    ["Omonia", "Omonia Nicosia"],
    ["Hapoel Be'er", "Hapoel Be'er Sheva"],
    ["Jagiellonia", "Jagiellonia Bialystok"],
    ["NEOM Sports Club", "Neom SC"],
    ["Instituto", "Instituto (Córdoba)"],
    ["Argentinos Jrs", "Argentinos Juniors"],
  ])("matches %s with %s", (left, right) => {
    expect(teamNamesMatch(left, right)).toBe(true);
  });

  it("leaves the pairs that only look alike", () => {
    expect(teamNamesMatch("Atlético Junior", "Boca Juniors")).toBe(false);
    expect(teamNamesMatch("Atlético Junior", "Argentinos Juniors")).toBe(false);
    expect(teamNamesMatch("Santos", "Santos Laguna")).toBe(false);
    expect(teamNamesMatch("Universidad Católica", "Universidad Católica (Quito)")).toBe(false);
  });
});

describe("clubs numbered by founding order", () => {
  it.each([
    ["1. FC Köln", "FC Cologne"],
    ["1. FC Union Berlin", "Union Berlin"],
    ["1. FSV Mainz 05", "Mainz"],
  ])("matches %s with %s", (left, right) => {
    expect(teamNamesMatch(left, right)).toBe(true);
  });

  it("keeps a number that is part of the name", () => {
    // The period is what marks an ordinal. These have none.
    expect(normalizeTeamName("2 de Mayo")).toBe("2demayo");
    expect(normalizeTeamName("1860 Munich")).toBe("1860munich");
    expect(teamNamesMatch("2 de Mayo", "de Mayo")).toBe(false);
  });
});
