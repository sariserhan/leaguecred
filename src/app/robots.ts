import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/settings", "/slip", "/network", "/onboarding", "/auth", "/api"],
    },
    sitemap: "https://leaguecred.com/sitemap.xml",
  };
}
