import type { Metadata } from "next";

import { LeagueExplorer } from "@/components/leagues/league-explorer";
import { leagues } from "@/lib/league-data";

export const metadata: Metadata = {
  title: "Explore leagues",
  description:
    "Build your record where you have knowledge and follow proven football specialists everywhere else.",
};

export default function LeaguesPage() {
  return (
    <div className="page-shell py-14 sm:py-20">
      <header className="mb-10 flex max-w-5xl flex-col gap-4">
        <h1 className="font-heading text-[clamp(3.4rem,6vw,6.6rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase">
          Every league has someone who knows it.
        </h1>
        <p className="text-lg text-muted-foreground sm:text-xl">
          Build your record where you have knowledge. Follow specialists
          everywhere else.
        </p>
      </header>

      <LeagueExplorer leagues={leagues} />

      <section className="mt-14 border-t pt-8">
        <h2 className="section-title">Specialists worth following</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          This list will become personal as your league network grows.
        </p>
      </section>
    </div>
  );
}
