import { describe, expect, it, vi } from "vitest";

import { runJobSteps } from "@/lib/job-steps";

describe("runJobSteps", () => {
  it("runs every step in order and collects the results", async () => {
    const order: string[] = [];
    const result = await runJobSteps([
      ["first", async () => { order.push("first"); return { done: 1 }; }],
      ["second", async () => { order.push("second"); return { done: 2 }; }],
    ]);

    expect(order).toEqual(["first", "second"]);
    expect(result).toEqual({ ok: true, results: { first: { done: 1 }, second: { done: 2 } } });
  });

  // The reason the daily job chains rather than aborts: a logo provider being
  // down must never stop picks from settling.
  it("keeps running after a step throws and reports the failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ran: string[] = [];
    const result = await runJobSteps([
      ["fixtures", async () => { ran.push("fixtures"); return { synced: 3 }; }],
      ["settlement", async () => { ran.push("settlement"); throw new Error("database is unreachable"); }],
      ["teamLogos", async () => { ran.push("teamLogos"); return { updated: 0 }; }],
    ]);

    expect(ran).toEqual(["fixtures", "settlement", "teamLogos"]);
    expect(result.ok).toBe(false);
    expect(result.results.settlement).toEqual({ error: "database is unreachable" });
    expect(result.results.teamLogos).toEqual({ updated: 0 });
    vi.restoreAllMocks();
  });

  it("reports ok for an empty chain", async () => {
    expect(await runJobSteps([])).toEqual({ ok: true, results: {} });
  });
});
