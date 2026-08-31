import { describe, expect, it } from "vitest";

import { parseEspnStandings } from "@/providers/espn-standings";

function entry(id: string, name: string, stats: Record<string, number>) {
  return {
    team: { id, displayName: name, logos: [{ href: `https://a.espncdn.com/${id}.png` }] },
    stats: Object.entries(stats).map(([statName, value]) => ({ name: statName, value })),
  };
}

const city = entry("382", "Manchester City", {
  rank: 1, gamesPlayed: 2, wins: 2, ties: 0, losses: 0,
  pointsFor: 6, pointsAgainst: 2, points: 6, deductions: 0,
});
const forest = entry("393", "Nottingham Forest", {
  rank: 2, gamesPlayed: 2, wins: 1, ties: 1, losses: 0,
  pointsFor: 3, pointsAgainst: 1, points: 0, deductions: 4,
});

describe("parseEspnStandings", () => {
  it("reads a league table from the top level", () => {
    const rows = parseEspnStandings({ standings: { entries: [city] } });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      teamExternalId: "382",
      name: "Manchester City",
      played: 2,
      wins: 2,
      draws: 0,
      losses: 0,
      goalsFor: 6,
      goalsAgainst: 2,
      points: 6,
    });
  });

  it("keeps a points deduction, which counting fixtures could never show", () => {
    const [row] = parseEspnStandings({ standings: { entries: [forest] } });

    expect(row.deductions).toBe(4);
    expect(row.points).toBe(0);
  });

  it("gathers every group of a cup competition", () => {
    const rows = parseEspnStandings({
      children: [
        { standings: { entries: [city] } },
        { standings: { entries: [forest] } },
      ],
    });

    expect(rows.map((row) => row.teamExternalId)).toEqual(["382", "393"]);
  });

  it("orders by ESPN's own rank rather than the order rows arrive in", () => {
    const rows = parseEspnStandings({ standings: { entries: [forest, city] } });
    expect(rows.map((row) => row.rank)).toEqual([1, 2]);
  });

  it("skips a row with no team, rather than inventing one", () => {
    const rows = parseEspnStandings({ standings: { entries: [{ stats: [] }, city] } });
    expect(rows).toHaveLength(1);
  });

  it("treats a missing statistic as zero", () => {
    const rows = parseEspnStandings({
      standings: { entries: [{ team: { id: "1", displayName: "Thun" }, stats: [] }] },
    });

    expect(rows[0]).toMatchObject({ played: 0, points: 0, goalsFor: 0, logoUrl: null });
  });

  it("returns nothing for a season ESPN does not carry", () => {
    expect(parseEspnStandings({})).toEqual([]);
    expect(parseEspnStandings({ children: [] })).toEqual([]);
  });
});
