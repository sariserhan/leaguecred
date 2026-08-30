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
  ])("matches %s to %s", (left, right) => {
    expect(teamNamesMatch(left, right)).toBe(true);
  });

  it("does not merge different clubs", () => {
    expect(teamNamesMatch("Manchester City", "Manchester United")).toBe(false);
  });
});
