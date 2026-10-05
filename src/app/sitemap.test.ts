import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({
  sqlClient: async () => [{ slug: "arsenal", updated_at: "2026-09-01 12:00:00+00" }],
}));
vi.mock("@/data/leagues", () => ({ getLeagueDirectory: async () => [{ slug: "premier-league" }] }));
vi.mock("@/data/specialists", () => ({
  getSpecialistDirectory: async () => [{ handle: "keeper", id: "a" }, { handle: null, id: "b" }],
}));
// Every flag on, so the flag-gated routes are checked too.
vi.mock("@/services/site-settings", () => ({
  getFeatureFlags: async () =>
    ["community_challenge", "live_locks", "league_leaderboard"].map((key) => ({ key, enabled: true })),
}));

import robots from "./robots";
import sitemap from "./sitemap";

// leaguecred.com 308-redirects to www. An apex URL in the sitemap is a redirect
// Google will not index, so every address we publish must already be www.
describe("published URLs", () => {
  it("lists every sitemap entry on the www host", async () => {
    const entries = await sitemap();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) expect(entry.url).toMatch(/^https:\/\/www\.leaguecred\.com(\/|$)/);
  });

  it("points robots.txt at the www sitemap", () => {
    expect(robots().sitemap).toBe("https://www.leaguecred.com/sitemap.xml");
  });
});
