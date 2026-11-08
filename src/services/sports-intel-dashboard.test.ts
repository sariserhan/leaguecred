import { describe, expect, it } from "vitest";

import { readSportsIntelDashboard, snapshotResponse } from "@/services/sports-intel-dashboard";

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
});
