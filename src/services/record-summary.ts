import { MINIMUM_SETTLED_PICKS_FOR_RANK, wilsonLowerBound } from "@/lib/reputation";

export type SettledResult = "win" | "loss" | "void";

export type RecordSummary = {
  wins: number;
  losses: number;
  voids: number;
  settledPicks: number;
  currentWinStreak: number;
  bestWinStreak: number;
  tier: "Provisional" | "Established";
  confidenceAdjustedAccuracy: string;
};

export function calculateRecordSummary(
  results: readonly SettledResult[],
  /** Defaults to the standard bar so callers with no settings to hand — tests,
   * and anything summarising a record outside a request — still work. */
  minimumSettledPicks = MINIMUM_SETTLED_PICKS_FOR_RANK,
): RecordSummary {
  let wins = 0;
  let losses = 0;
  let voids = 0;
  let currentWinStreak = 0;
  let bestWinStreak = 0;

  for (const result of results) {
    if (result === "win") {
      wins += 1;
      currentWinStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
    } else if (result === "loss") {
      losses += 1;
      currentWinStreak = 0;
    } else {
      voids += 1;
    }
  }

  const settledPicks = wins + losses;
  return {
    wins,
    losses,
    voids,
    settledPicks,
    currentWinStreak,
    bestWinStreak,
    tier: settledPicks < minimumSettledPicks ? "Provisional" : "Established",
    confidenceAdjustedAccuracy: wilsonLowerBound(wins, losses).toFixed(6),
  };
}
