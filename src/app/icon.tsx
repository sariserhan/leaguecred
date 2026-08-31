import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// ponytail: brand mark generated from the theme's own colors (globals.css
// --foreground / --primary) rather than a designed logo file, since none
// exists yet. Swap for a real mark if one gets designed.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050d1c",
          color: "#b2df00",
          fontSize: 20,
          fontWeight: 800,
        }}
      >
        LC
      </div>
    ),
    size,
  );
}
