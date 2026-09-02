import type { Metadata } from "next";
import { Suspense } from "react";

import { AppLoadingShell } from "@/components/app-loading-shell";
import { LeagueExplorer } from "@/components/leagues/league-explorer";
import { getLeagueDirectory } from "@/data/leagues";
import { getSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Explore leagues",
  description:
    "Build your record where you have knowledge and follow proven football specialists everywhere else.",
  alternates: { canonical: "/leagues" },
};

/** The directory carries each viewer's own record per league, so it streams;
 *  the headline above it comes from a prerendered shell. */
async function Explorer({ searchParams }: { searchParams: PageProps<"/leagues">["searchParams"] }) {
  const requestedIntent = (await searchParams).intent;
  const intent = requestedIntent === "follow" ? "follow" : "prove";
  const session = await getSession();
  const leagues = await getLeagueDirectory(session?.user.id);

  return <LeagueExplorer leagues={leagues} authenticated={Boolean(session)} initialIntent={intent} />;
}

export default function LeaguesPage({ searchParams }: PageProps<"/leagues">) {
  return (
    <div className="page-shell py-14 sm:py-20">
      <header className="mb-10 flex max-w-5xl flex-col gap-4">
        <h1 className="font-heading text-[clamp(3.4rem,6vw,6.6rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase">
          Find your league. Choose your path.
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          Prove what you know with one Daily Lock, or follow specialists with a verified record.
        </p>
      </header>

      <Suspense fallback={<AppLoadingShell variant="directory" />}>
        <Explorer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
