import type { Metadata } from "next";
import { TrophyIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { LeaderboardBoard } from "@/components/leaderboard/leaderboard-board";
import { getLeaderboards } from "@/data/leaderboard";
import { JsonLd } from "@/lib/json-ld";
import { LEAGUE_LEADERBOARD_FLAG, isFeatureEnabled } from "@/lib/site-settings";
import { getFeatureFlags } from "@/services/site-settings";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const description =
  "Every proven football specialist on LeagueCred, ranked across every league and within each one. Only settled independent Daily Locks count.";

export const metadata: Metadata = {
  title: "Leaderboard",
  description,
  alternates: { canonical: "/leaderboard" },
  // A ranking is the most shared thing this product has, so it carries a card
  // of its own rather than falling back to a bare link.
  openGraph: {
    title: "Leaderboard · LeagueCred",
    description,
    type: "website",
    images: ["/opengraph-image"],
  },
};

/**
 * The leaderboards on one page, which the league pages could not be: a reader
 * comparing members across leagues had to open each league in turn and hold the
 * numbers in their head.
 *
 * Gated by the same flag as the league page's table, so leaderboards are one
 * decision rather than two that can disagree.
 */
export default async function LeaderboardPage() {
  const [flags, data] = await Promise.all([getFeatureFlags(), getLeaderboards()]);
  if (!isFeatureEnabled(flags, LEAGUE_LEADERBOARD_FLAG)) notFound();

  return (
    <main className="page-shell py-8 sm:py-12">
      {/* The ranking a reader sees, in the form a crawler reads. Ordered and
          named exactly as the table above is, since structured data that says
          something the page does not is worse than none. */}
      {data.global.length > 0 ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "LeagueCred leaderboard",
            description,
            numberOfItems: data.global.length,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            itemListElement: data.global.slice(0, 10).map((row, index) => ({
              "@type": "ListItem",
              position: index + 1,
              url: `https://leaguecred.com/specialists/${row.handle ?? row.userId}`,
              name: row.name,
            })),
          }}
        />
      ) : null}
      <header className="border-b border-inverted bg-inverted px-5 py-8 text-inverted-foreground sm:px-8 sm:py-10">
        <p className="flex items-center gap-2 font-semibold text-primary">
          <TrophyIcon aria-hidden="true" className="size-5" />Proven records
        </p>
        <h1 className="mt-2 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">Leaderboard</h1>
        <p className="mt-4 max-w-2xl text-inverted-foreground/75">
          Only settled independent Daily Locks count. A followed call never creates a rank, and a
          rank starts at {data.rankThreshold} settled locks.
        </p>
      </header>

      <div className="mt-7">
        <LeaderboardBoard data={data} />
      </div>
    </main>
  );
}
