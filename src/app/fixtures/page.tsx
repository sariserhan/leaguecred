import type { Metadata } from "next";
import { CalendarDaysIcon } from "lucide-react";

import { FixtureBoard } from "@/components/fixtures/fixture-board";
import { getFixtureBoard } from "@/data/fixtures";
import { getSession } from "@/lib/auth-session";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Today's fixtures",
  description: "Every upcoming match across every league on LeagueCred, by the day it is played.",
  alternates: { canonical: "/fixtures" },
};

/**
 * Every league's fixtures on one board.
 *
 * A league page answers "what is on in this competition". Anyone who follows
 * more than one has to visit each in turn to answer "what is on today", which is
 * the question this page is for — and calls can be made straight from it.
 */
export default async function FixturesPage() {
  const session = await getSession();
  const board = await getFixtureBoard(session?.user.id);
  const matches = board.days.reduce((total, day) => total + day.fixtures.length, 0);

  return (
    <main className="page-shell py-10 sm:py-14">
      <header className="border-b pb-6">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDaysIcon aria-hidden="true" className="size-5" />
          <span className="text-xs font-bold tracking-[.16em] uppercase">Every league, one board</span>
        </div>
        <h1 className="mt-4 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">Fixtures by day.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          {matches > 0
            ? `${matches} matches across ${board.days.length} day${board.days.length === 1 ? "" : "s"}. One call per league per day — choose as many days as you like and lock them together.`
            : "Matches appear here as soon as the next round is published."}
        </p>
      </header>

      <div className="mt-8">
        <FixtureBoard board={board} authenticated={Boolean(session)} />
      </div>
    </main>
  );
}
