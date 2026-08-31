import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeagueCred — Football League Expertise",
    short_name: "LeagueCred",
    description:
      "Build a verified record in the football league you know and follow proven specialists everywhere else.",
    start_url: "/",
    display: "standalone",
    background_color: "#050d1c",
    theme_color: "#050d1c",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
