import type { MetadataRoute } from "next";

/**
 * Two kinds of path are kept out of the index.
 *
 * The first is anything behind a session — an admin panel, a member's own slip,
 * settings. A crawler reaching those gets the sign-in page, so indexing them
 * would fill results with the same login screen under a dozen titles.
 *
 * The second is paths that only ever redirect. /u and /r resolve to somewhere
 * else by design, and a redirect is not a page worth listing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/settings",
        "/slip",
        "/network",
        "/onboarding",
        "/auth",
        "/api",
        "/calendar",
        "/invite",
        "/notifications",
        "/seasons",
        "/maintenance",
        "/u/",
        "/r/",
      ],
    },
    sitemap: "https://leaguecred.com/sitemap.xml",
  };
}
