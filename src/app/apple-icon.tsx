import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// ponytail: same generated mark as icon.tsx, scaled up. iOS applies its own
// corner mask, so this stays full-bleed.
export default function AppleIcon() {
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
          fontSize: 110,
          fontWeight: 800,
        }}
      >
        LC
      </div>
    ),
    size,
  );
}
