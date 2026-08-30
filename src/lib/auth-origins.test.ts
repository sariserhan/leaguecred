import { describe, expect, it } from "vitest";

import { resolveTrustedOrigins } from "@/lib/auth-origins";

describe("resolveTrustedOrigins", () => {
  // The production failure: the site is served at www, BETTER_AUTH_URL is the apex.
  it("pairs an apex base url with its www host", () => {
    const origins = resolveTrustedOrigins({ baseUrl: "https://leaguecred.com" });
    expect(origins).toContain("https://leaguecred.com");
    expect(origins).toContain("https://www.leaguecred.com");
  });

  it("pairs a www base url back to the apex", () => {
    const origins = resolveTrustedOrigins({ baseUrl: "https://www.leaguecred.com" });
    expect(origins).toContain("https://www.leaguecred.com");
    expect(origins).toContain("https://leaguecred.com");
  });

  it("keeps localhost with its port intact and invents no www sibling for it", () => {
    expect(resolveTrustedOrigins({ baseUrl: "http://localhost:3000" }))
      .toEqual(["http://localhost:3000"]);
  });

  it("accepts a bare vercel host and gives it a scheme", () => {
    expect(resolveTrustedOrigins({
      baseUrl: "https://www.leaguecred.com",
      vercelUrl: "leaguecred-abc123-ssari.vercel.app",
    })).toContain("https://leaguecred-abc123-ssari.vercel.app");
  });

  // A preview host is already three labels deep; widening it would trust a
  // sibling deployment that is not this project.
  it("does not invent a sibling for a deeper subdomain", () => {
    const origins = resolveTrustedOrigins({ baseUrl: "https://leaguecred-abc.ssari.vercel.app" });
    expect(origins).toEqual(["https://leaguecred-abc.ssari.vercel.app"]);
  });

  it("ignores an unparseable value instead of throwing", () => {
    expect(resolveTrustedOrigins({ baseUrl: "https://www.leaguecred.com", vercelUrl: "::::" }))
      .toContain("https://www.leaguecred.com");
  });

  it("returns each origin once", () => {
    const origins = resolveTrustedOrigins({
      baseUrl: "https://www.leaguecred.com",
      vercelProductionUrl: "www.leaguecred.com",
    });
    expect(origins.length).toBe(new Set(origins).size);
  });
});
