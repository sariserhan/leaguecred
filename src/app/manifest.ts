import type { MetadataRoute } from "next";

import { pwaIconUrl } from "@/lib/pwa";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // An explicit id keeps an installed copy pointed at the same app if
    // start_url ever moves. Without one the browser derives the identity from
    // start_url, and changing that would install a second, duplicate app.
    id: "/",
    name: "LeagueCred — Football League Expertise",
    short_name: "LeagueCred",
    description:
      "Build a verified record in the football league you know and follow proven specialists everywhere else.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    // No orientation lock. Half of what this app shows is a table — a league
    // table, a fixture list, a leaderboard — and those are the screens a phone
    // is most usefully turned sideways for.
    lang: "en",
    dir: "ltr",
    categories: ["sports", "social"],
    background_color: "#050d1c",
    theme_color: "#050d1c",
    // A second tap on the icon should return to the window already open rather
    // than start the app again on top of it.
    launch_handler: { client_mode: "navigate-existing" },
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png", purpose: "any" },
      { src: pwaIconUrl("any-192"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: pwaIconUrl("any-512"), sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops the icon to the launcher's shape. Listed separately from
      // the "any" pair because the same drawing cannot serve both: one is shown
      // whole, the other loses its corners.
      { src: pwaIconUrl("maskable-192"), sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: pwaIconUrl("maskable-512"), sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
    // Long-press shortcuts. Only routes that are always on belong here: the
    // manifest is built once per deploy, so a shortcut to a feature-flagged
    // page would outlive the flag being switched off and land on a 404.
    shortcuts: [
      {
        name: "Fixtures by day",
        short_name: "Fixtures",
        description: "Every fixture in your leagues, day by day.",
        url: "/fixtures",
      },
      {
        name: "Leagues",
        short_name: "Leagues",
        description: "Pick the league you know and lock a call.",
        url: "/leagues?intent=prove",
      },
      {
        name: "Specialists",
        short_name: "Specialists",
        description: "Follow the people with a proven record.",
        url: "/specialists",
      },
    ],
  };
}
