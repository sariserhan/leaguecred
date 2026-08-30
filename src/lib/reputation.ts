/**
 * Spec section 20: eligibility requires at least this many settled non-void
 * independent picks. The tier label, the leaderboard filters, the specialist
 * counts, and the on-screen copy all read this one value.
 */
export const MINIMUM_SETTLED_PICKS_FOR_RANK = 10;

export function calculateAccuracy(wins: number, losses: number) {
  assertRecord(wins, losses);

  const settled = wins + losses;
  return settled === 0 ? 0 : wins / settled;
}

export function wilsonLowerBound(
  wins: number,
  losses: number,
  zScore = 1.96,
) {
  assertRecord(wins, losses);

  if (!Number.isFinite(zScore) || zScore <= 0) {
    throw new RangeError("zScore must be a positive finite number");
  }

  const sampleSize = wins + losses;
  if (sampleSize === 0) return 0;

  const observedAccuracy = wins / sampleSize;
  const zSquared = zScore * zScore;
  const adjustedCenter =
    observedAccuracy + zSquared / (2 * sampleSize);
  const adjustedSpread =
    zScore *
    Math.sqrt(
      (observedAccuracy * (1 - observedAccuracy) +
        zSquared / (4 * sampleSize)) /
        sampleSize,
    );
  const denominator = 1 + zSquared / sampleSize;

  return (adjustedCenter - adjustedSpread) / denominator;
}

export function isLeaderboardEligible(
  wins: number,
  losses: number,
  minimumSettledPicks = MINIMUM_SETTLED_PICKS_FOR_RANK,
) {
  assertRecord(wins, losses);

  if (!Number.isInteger(minimumSettledPicks) || minimumSettledPicks < 1) {
    throw new RangeError("minimumSettledPicks must be a positive integer");
  }

  return wins + losses >= minimumSettledPicks;
}

function assertRecord(wins: number, losses: number) {
  for (const [label, value] of [
    ["wins", wins],
    ["losses", losses],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new RangeError(label + " must be a non-negative integer");
    }
  }
}
