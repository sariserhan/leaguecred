import { ImageResponse } from "next/og";

import { getSpecialistProfile } from "@/data/specialists";

/**
 * A specialist's record, rendered for the places links get shared.
 *
 * The root card is the same for every page, which is fine for the homepage and
 * useless for a profile: the one thing here worth passing to someone is that a
 * named person called a league right, and how often. So this puts the record on
 * the card.
 *
 * It states the evidence alongside the accuracy, and says outright when a record
 * is still provisional. A card claiming "100%" off two calls would be true and
 * misleading, which is the opposite of what the product is for.
 */

export const alt = "A LeagueCred specialist's independent record";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#050d1c";
const LIME = "#b2df00";
const MUTED = "rgba(255, 255, 255, 0.75)";
const RULE = "rgba(255, 255, 255, 0.15)";

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
      <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
        <polygon points="32,4 58,19 58,45 32,60 6,45 6,19" fill={INK} stroke={LIME} strokeWidth="3.5" />
        <line x1="8" y1="32" x2="56" y2="32" stroke={LIME} strokeWidth="2.5" />
        <circle cx="32" cy="32" r="10" fill="none" stroke={LIME} strokeWidth="2.5" />
        <circle cx="32" cy="32" r="3.5" fill={LIME} />
      </svg>
      <div style={{ display: "flex", fontSize: "34px", fontWeight: 900, letterSpacing: "-0.04em", textTransform: "uppercase" }}>
        <span>LEAGUE</span>
        <span style={{ color: LIME }}>CRED</span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <div style={{ display: "flex", fontSize: "16px", letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED }}>
        {label}
      </div>
      <div style={{ display: "flex", fontSize: accent ? "72px" : "48px", fontWeight: 800, lineHeight: 1, color: accent ? LIME : "#ffffff" }}>
        {value}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: INK,
        padding: "56px 72px",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

export default async function SpecialistOpenGraphImage({
  params,
}: {
  params: Promise<{ specialistId: string }>;
}) {
  const { specialistId } = await params;
  const data = await getSpecialistProfile(specialistId).catch(() => null);

  if (!data) {
    return new ImageResponse(
      (
        <Card>
          <Brand />
          <div style={{ display: "flex", fontSize: "52px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "-0.03em" }}>
            That record is no longer here
          </div>
          <div style={{ display: "flex", fontSize: "20px", color: MUTED }}>leaguecred.com</div>
        </Card>
      ),
      size,
    );
  }

  const { specialist, totals } = data;
  // The league they are strongest in is the one the profile leads with.
  const strongest = data.leagues[0] ?? null;
  const provisional = !strongest || strongest.tier !== "Established";

  // Nobody has called anything yet, so there are no numbers to show. Printing
  // "0-0" and a dash for accuracy looks like a broken card rather than an
  // honest one.
  if (totals.settledPicks === 0) {
    return new ImageResponse(
      (
        <Card>
          <Brand />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "1000px" }}>
            {/* No league to name yet, and repeating the wordmark under the
                wordmark says nothing. */}
            {strongest ? (
              <div style={{ display: "flex", fontSize: "20px", letterSpacing: "0.08em", textTransform: "uppercase", color: LIME }}>
                {strongest.name}
              </div>
            ) : null}
            <div style={{ display: "flex", fontSize: "78px", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", textTransform: "uppercase" }}>
              {specialist.name}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderTop: `1px solid ${RULE}`, paddingTop: "28px" }}>
            <div style={{ display: "flex", fontSize: "26px", color: MUTED }}>
              No settled calls yet — the record starts with the first one.
            </div>
            <div style={{ display: "flex", fontSize: "18px", color: MUTED }}>leaguecred.com</div>
          </div>
        </Card>
      ),
      size,
    );
  }

  const accuracy = `${((totals.wins / totals.settledPicks) * 100).toFixed(1)}%`;

  return new ImageResponse(
    (
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Brand />
          <div
            style={{
              display: "flex",
              fontSize: "16px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: provisional ? MUTED : LIME,
              border: `1px solid ${provisional ? RULE : LIME}`,
              padding: "8px 16px",
            }}
          >
            {provisional ? "Building a record" : "Established record"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "1000px" }}>
          <div style={{ display: "flex", fontSize: "20px", letterSpacing: "0.08em", textTransform: "uppercase", color: LIME }}>
            {strongest ? strongest.name : "Independent record"}
          </div>
          <div style={{ display: "flex", fontSize: "78px", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", textTransform: "uppercase" }}>
            {specialist.name}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", borderTop: `1px solid ${RULE}`, paddingTop: "28px" }}>
          <div style={{ display: "flex", gap: "56px", alignItems: "flex-start" }}>
            <Stat label="Accuracy" value={accuracy} accent />
            <Stat label="Record" value={`${totals.wins}–${totals.losses}`} />
            {/* The evidence behind the number, never the number alone. */}
            <Stat label="Settled locks" value={String(totals.settledPicks)} />
            <Stat label="Best streak" value={String(totals.bestWinStreak)} />
          </div>
          <div style={{ display: "flex", fontSize: "18px", color: MUTED }}>leaguecred.com</div>
        </div>
      </Card>
    ),
    size,
  );
}
