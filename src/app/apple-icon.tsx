import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * LeagueCred Apple Touch Icon (180x180) — Tactical Hex Radar brand mark.
 * iOS automatically handles corner masking.
 */
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
        }}
      >
        <svg
          width="136"
          height="136"
          viewBox="0 0 64 64"
          fill="none"
        >
          {/* Outer Hexagon Shield */}
          <polygon
            points="32,4 58,19 58,45 32,60 6,45 6,19"
            fill="#050d1c"
            stroke="#b2df00"
            strokeWidth="2.5"
          />

          {/* Inner Pitch Border */}
          <polygon
            points="32,8 54,20.5 54,43.5 32,56 10,43.5 10,20.5"
            fill="none"
            stroke="#b2df00"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />

          {/* Pitch Halfway Line */}
          <line
            x1="10"
            y1="32"
            x2="54"
            y2="32"
            stroke="#b2df00"
            strokeWidth="1.6"
          />

          {/* Center Kickoff Circle & Spot */}
          <circle
            cx="32"
            cy="32"
            r="9"
            fill="none"
            stroke="#b2df00"
            strokeWidth="1.8"
          />
          <circle cx="32" cy="32" r="2.5" fill="#b2df00" />

          {/* Top Penalty Area */}
          <path
            d="M 22 13.5 L 42 13.5 L 42 22 L 22 22 Z"
            fill="none"
            stroke="#b2df00"
            strokeWidth="1.4"
          />
          <path
            d="M 27 22 A 5 5 0 0 0 37 22"
            fill="none"
            stroke="#b2df00"
            strokeWidth="1.2"
          />
          <circle cx="32" cy="18" r="1.2" fill="#b2df00" />

          {/* Bottom Penalty Area */}
          <path
            d="M 22 50.5 L 42 50.5 L 42 42 L 22 42 Z"
            fill="none"
            stroke="#b2df00"
            strokeWidth="1.4"
          />
          <path
            d="M 27 42 A 5 5 0 0 1 37 42"
            fill="none"
            stroke="#b2df00"
            strokeWidth="1.2"
          />
          <circle cx="32" cy="46" r="1.2" fill="#b2df00" />

          {/* Tactical Coordinate Radar Vectors */}
          <line
            x1="18"
            y1="25"
            x2="25"
            y2="18"
            stroke="#b2df00"
            strokeWidth="1.2"
            strokeDasharray="1.5 1.5"
            strokeOpacity="0.7"
          />
          <circle cx="18" cy="25" r="1.4" fill="#b2df00" />

          <line
            x1="46"
            y1="39"
            x2="39"
            y2="46"
            stroke="#b2df00"
            strokeWidth="1.2"
            strokeDasharray="1.5 1.5"
            strokeOpacity="0.7"
          />
          <circle cx="46" cy="39" r="1.4" fill="#b2df00" />
        </svg>
      </div>
    ),
    size,
  );
}
