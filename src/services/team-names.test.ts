import { describe, expect, it } from "vitest";

import { teamNamesMatch } from "@/services/team-names";

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
