import { describe, expect, it } from "vitest";

import { isSameOrigin, readSportsIntelDashboard, snapshotResponse, triggerSportsIntelRun } from "@/services/sports-intel-dashboard";

function github(runs: Array<{ status: string }>, dispatchStatus = 204) {
  const calls: Array<{ url: string; method: string }> = [];
  const request = (async (url: string, init?: RequestInit) => {
    calls.push({ url, method: init?.method ?? "GET" });
    if (url.endsWith("/dispatches")) return new Response(null, { status: dispatchStatus });
    return Response.json({ workflow_runs: runs });
  }) as typeof fetch;
  return { calls, request };
}

describe("the Sports Intel dashboard", () => {
  it("serves the newest page, never cached, indexed or framed", async () => {
    const response = snapshotResponse({ state: "ready", html: "<p>page</p>", builtAt: new Date() });

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("<p>page</p>");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("content-security-policy")).toContain("img-src https://r2.thesportsdb.com");
  });

  it("says why there is nothing to show", async () => {
    const response = snapshotResponse({ state: "empty" });

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("No snapshot yet");
  });

  it("does not connect anywhere without its own login", async () => {
    expect(await readSportsIntelDashboard(undefined)).toEqual({ state: "unconfigured" });
  });

  it("starts a run only when none is going or queued", async () => {
    const idle = github([{ status: "completed" }]);
    expect(await triggerSportsIntelRun("token", idle.request)).toBe("started");
    expect(idle.calls.map((call) => call.method)).toEqual(["GET", "POST"]);

    const queued = github([{ status: "queued" }, { status: "completed" }]);
    expect(await triggerSportsIntelRun("token", queued.request)).toBe("busy");
    expect(queued.calls.some((call) => call.method === "POST")).toBe(false);

    expect(await triggerSportsIntelRun("token", github([], 403).request)).toBe("failed");
    expect(await triggerSportsIntelRun(undefined, idle.request)).toBe("unconfigured");
  });

  it("takes a form post only from this site", () => {
    expect(isSameOrigin(new Headers({ origin: "https://www.leaguecred.com", host: "www.leaguecred.com" }))).toBe(true);
    expect(isSameOrigin(new Headers({ origin: "https://evil.example", host: "www.leaguecred.com" }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: "www.leaguecred.com" }))).toBe(false);
  });
});
