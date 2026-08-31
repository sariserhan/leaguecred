import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * LeagueCred Favicon (32x32) — Tactical Hex Radar brand mark.
 */
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
          borderRadius: "6px",
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Outer Hexagon Shield */}
          <polygon
            points="32,4 58,19 58,45 32,60 6,45 6,19"
            fill="#050d1c"
            stroke="#b2df00"
            strokeWidth="4"
          />
          {/* Pitch Halfway Line */}
          <line
            x1="8"
            y1="32"
            x2="56"
            y2="32"
            stroke="#b2df00"
            strokeWidth="3"
          />
          {/* Center Kickoff Circle */}
          <circle
            cx="32"
            cy="32"
            r="10"
            fill="none"
            stroke="#b2df00"
            strokeWidth="3"
          />
          {/* Center Spot */}
          <circle cx="32" cy="32" r="3.5" fill="#b2df00" />
          {/* Top Penalty Area */}
          <path
            d="M 21 14 L 43 14 L 43 23 L 21 23 Z"
            fill="none"
            stroke="#b2df00"
            strokeWidth="2.5"
          />
          {/* Bottom Penalty Area */}
          <path
            d="M 21 50 L 43 50 L 43 41 L 21 41 Z"
            fill="none"
            stroke="#b2df00"
            strokeWidth="2.5"
          />
        </svg>
      </div>
    ),
    size,
  );
}
