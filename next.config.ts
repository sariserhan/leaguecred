import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Data is dynamic by default and caching is opted into per function with
  // `use cache`, which is what lets the signed-out shell of a page prerender
  // while the viewer's own half streams in behind a boundary.
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.api-sports.io",
      },
      {
        protocol: "https",
        hostname: "r2.thesportsdb.com",
      },
      {
        protocol: "https",
        hostname: "www.thesportsdb.com",
      },
      {
        protocol: "https",
        hostname: "crests.football-data.org",
      },
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "a.espncdn.com",
      },
    ],
  },
  async headers() {
    return [
      {
        // Applied everywhere. None of these are a Content-Security-Policy:
        // the theme script in the root layout runs inline to set the class
        // before first paint, so a real script-src needs a per-request nonce,
        // and a CSP written without one would either break the page or be
        // loose enough to be theatre. That is its own piece of work.
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Nothing here is meant to be framed, and a record that can be framed
          // can be framed next to a betting slip.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
      {
        // The worker is the one file that must never be served from the
        // browser's HTTP cache: a stale copy pins every visitor to the deploy
        // that installed it, and it is the file that decides what else caches.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
