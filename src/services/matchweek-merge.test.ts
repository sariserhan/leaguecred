import { describe, expect, it } from "vitest";

import { clusterByOverlap, planMatchweekMerges, type MergeableMatchweek } from "@/services/matchweek-merge";

const DAY = 24 * 60 * 60 * 1000;
const week = (day: number) => day * DAY;

function matchweek(overrides: Partial<MergeableMatchweek> & { id: string }): MergeableMatchweek {
  return {
    leagueId: "league",
    seasonId: "season",
    startAt: week(0),
    endAt: week(2),
    fixtureCount: 1,
    pickCount: 0,
    participationCount: 0,
    status: "upcoming",
    scheme: "espn-web",
    ...overrides,
  };
}

describe("clusterByOverlap", () => {
  it("keeps consecutive gameweeks apart when they only touch at a boundary", () => {
    // Sunday's last kickoff ends where the next round's window opens; those are
    // two rounds, not one, and merging them would swallow a whole gameweek.
    const clusters = clusterByOverlap([
      matchweek({ id: "week-1", startAt: week(0), endAt: week(3) }),
      matchweek({ id: "week-2", startAt: week(3), endAt: week(6) }),
    ]);

    expect(clusters.map((c) => c.length)).toEqual([1, 1]);
  });

  it("groups two providers' halves of one gameweek", () => {
    const clusters = clusterByOverlap([
      matchweek({ id: "espn", startAt: week(0), endAt: week(3) }),
      matchweek({ id: "fdu", startAt: week(1), endAt: week(2), scheme: "football-data-uk" }),
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });

  it("never groups across leagues", () => {
    const clusters = clusterByOverlap([
      matchweek({ id: "a", leagueId: "league-a" }),
      matchweek({ id: "b", leagueId: "league-b" }),
    ]);

    expect(clusters.map((c) => c.length)).toEqual([1, 1]);
  });
});

describe("planMatchweekMerges", () => {
  it("keeps the week holding more fixtures and absorbs the other", () => {
    const { merges, committed } = planMatchweekMerges([
      matchweek({ id: "espn", startAt: week(0), endAt: week(3), fixtureCount: 10 }),
      matchweek({ id: "fdu", startAt: week(1), endAt: week(2), fixtureCount: 4, scheme: "football-data-uk" }),
    ]);

    expect(committed).toHaveLength(0);
    expect(merges).toHaveLength(1);
    expect(merges[0].canonical.id).toBe("espn");
    expect(merges[0].absorbed.map((w) => w.id)).toEqual(["fdu"]);
  });

  it("keeps the week a player has already locked, even with fewer fixtures", () => {
    const { merges } = planMatchweekMerges([
      matchweek({ id: "big", startAt: week(0), endAt: week(3), fixtureCount: 10 }),
      matchweek({ id: "locked", startAt: week(1), endAt: week(2), fixtureCount: 2, pickCount: 1, scheme: "football-data-uk" }),
    ]);

    expect(merges[0].canonical.id).toBe("locked");
    expect(merges[0].absorbed.map((w) => w.id)).toEqual(["big"]);
  });

  it("holds back a gameweek locked in more than one place", () => {
    // Merging would put two of one player's Daily Locks in a single week.
    const { merges, committed } = planMatchweekMerges([
      matchweek({ id: "a", startAt: week(0), endAt: week(3), pickCount: 1 }),
      matchweek({ id: "b", startAt: week(1), endAt: week(2), participationCount: 1, scheme: "football-data-uk" }),
    ]);

    expect(merges).toHaveLength(0);
    expect(committed).toHaveLength(1);
  });

  it("treats a week that is no longer upcoming as committed", () => {
    const { merges, committed } = planMatchweekMerges([
      matchweek({ id: "settled", startAt: week(0), endAt: week(3), status: "settled" }),
      matchweek({ id: "locked", startAt: week(1), endAt: week(2), status: "locked", scheme: "football-data-uk" }),
    ]);

    expect(merges).toHaveLength(0);
    expect(committed).toHaveLength(1);
  });

  it("leaves a gameweek that is already whole alone", () => {
    expect(planMatchweekMerges([matchweek({ id: "only" })]).merges).toHaveLength(0);
  });
});

describe("one provider's own gameweeks", () => {
  it("never merges consecutive rounds from the same provider, even when they overlap", () => {
    // A round running Thursday to Monday ends after the next round's window
    // opens. Chaining those would fold a season into one matchweek — which is
    // exactly what an earlier version of this did to the Argentine league.
    const { merges } = planMatchweekMerges([
      matchweek({ id: "round-1", startAt: week(0), endAt: week(5), fixtureCount: 13 }),
      matchweek({ id: "round-2", startAt: week(4), endAt: week(9), fixtureCount: 23 }),
      matchweek({ id: "round-3", startAt: week(8), endAt: week(13), fixtureCount: 18 }),
    ]);

    expect(merges).toHaveLength(0);
  });

  it("takes only one week per provider into a cluster", () => {
    const clusters = clusterByOverlap([
      matchweek({ id: "espn-1", startAt: week(0), endAt: week(5) }),
      matchweek({ id: "fdu", startAt: week(1), endAt: week(3), scheme: "football-data-uk" }),
      matchweek({ id: "espn-2", startAt: week(4), endAt: week(9) }),
    ]);

    expect(clusters[0].map((w) => w.id)).toEqual(["espn-1", "fdu"]);
    expect(clusters[1].map((w) => w.id)).toEqual(["espn-2"]);
  });
});
