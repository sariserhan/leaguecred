import type { Metadata } from "next";

import { LeagueExplorer } from "@/components/leagues/league-explorer";
import { getLeagueDirectory } from "@/data/leagues";
import { getSession } from "@/lib/auth-session";
import { enforceMaintenanceGate } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore leagues",
  description:
    "Build your record where you have knowledge and follow proven football specialists everywhere else.",
};

export default async function LeaguesPage({ searchParams }: PageProps<"/leagues">) {
  await enforceMaintenanceGate();

  const requestedIntent = (await searchParams).intent;
  const intent = requestedIntent === "follow" ? "follow" : "prove";
  const session = await getSession();
  const leagues = await getLeagueDirectory(session?.user.id);

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

      <LeagueExplorer leagues={leagues} authenticated={Boolean(session)} initialIntent={intent} />
    </div>
  );
}
