import { describe, expect, it } from "vitest";

import { evaluateWindow, RATE_LIMITS } from "@/lib/rate-limit";

const policy = { limit: 3, windowSeconds: 60 };
const now = new Date("2026-08-31T12:00:00Z");
const secondsAgo = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe("evaluateWindow", () => {
  it("allows a first attempt and opens a window", () => {
    expect(evaluateWindow(policy, now, null, 0)).toEqual({ allowed: true, resetWindow: true, attempts: 1 });
  });

  it("counts attempts inside an open window", () => {
    expect(evaluateWindow(policy, now, secondsAgo(10), 1))
      .toEqual({ allowed: true, resetWindow: false, attempts: 2 });
  });

  it("refuses once the limit is reached", () => {
    expect(evaluateWindow(policy, now, secondsAgo(10), 3))
      .toEqual({ allowed: false, resetWindow: false, attempts: 3 });
  });

  it("opens a fresh window once the old one has passed", () => {
    expect(evaluateWindow(policy, now, secondsAgo(60), 3))
      .toEqual({ allowed: true, resetWindow: true, attempts: 1 });
  });

  it("does not let an expired window keep refusing", () => {
    // The failure that matters: a blocked actor staying blocked forever.
    expect(evaluateWindow(policy, now, secondsAgo(3600), 999).allowed).toBe(true);
  });

  it("treats the boundary as a new window rather than the old one", () => {
    expect(evaluateWindow(policy, now, secondsAgo(59), 3).allowed).toBe(false);
    expect(evaluateWindow(policy, now, secondsAgo(61), 3).allowed).toBe(true);
  });
});

describe("the policies themselves", () => {
  it("leaves room for ordinary use of every action", () => {
    // A limit anyone can reach by using the product is a bug, not a defence.
    for (const [action, { limit, windowSeconds }] of Object.entries(RATE_LIMITS)) {
      expect(limit, action).toBeGreaterThanOrEqual(5);
      expect(windowSeconds, action).toBeGreaterThan(0);
    }
  });

  it("is strictest on the action that calls someone else's API", () => {
    expect(RATE_LIMITS.refreshLeagueFixtures.limit)
      .toBeLessThan(RATE_LIMITS.submitDailyLock.limit);
  });
});
