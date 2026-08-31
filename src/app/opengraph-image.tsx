import { ImageResponse } from "next/og";

export const alt = "LeagueCred — Football League Expertise Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#050d1c",
          padding: "64px 80px",
          color: "#ffffff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Background tactical pitch marking */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "50%",
            height: "100%",
            opacity: 0.12,
            borderLeft: "2px solid #ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "280px",
              height: "280px",
              borderRadius: "999px",
              border: "2px solid #ffffff",
              display: "flex",
            }}
          />
        </div>

        {/* Brand header */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
            <polygon
              points="32,4 58,19 58,45 32,60 6,45 6,19"
              fill="#050d1c"
              stroke="#b2df00"
              strokeWidth="3.5"
            />
            <line x1="8" y1="32" x2="56" y2="32" stroke="#b2df00" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="10" fill="none" stroke="#b2df00" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="3.5" fill="#b2df00" />
            <path d="M 21 14 L 43 14 L 43 23 L 21 23 Z" fill="none" stroke="#b2df00" strokeWidth="2" />
            <path d="M 21 50 L 43 50 L 43 41 L 21 41 Z" fill="none" stroke="#b2df00" strokeWidth="2" />
          </svg>
          <div
            style={{
              fontSize: "44px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            <span>LEAGUE</span>
            <span style={{ color: "#b2df00" }}>CRED</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "920px" }}>
          <div
            style={{
              color: "#b2df00",
              fontSize: "22px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              display: "flex",
            }}
          >
            Football Expertise Network
          </div>
          <div
            style={{
              fontSize: "58px",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Know one league. Discover the people who know the others.
          </div>
        </div>

        {/* Footer info */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            paddingTop: "24px",
          }}
        >
          <div style={{ display: "flex", gap: "32px", fontSize: "18px", color: "rgba(255, 255, 255, 0.75)" }}>
            <span>• One Immutable Weekly Lock</span>
            <span>• Confidence-Adjusted Accuracy</span>
            <span>• 25 Global Competitions</span>
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#b2df00" }}>leaguecred.com</div>
        </div>
      </div>
    ),
    size,
  );
}
