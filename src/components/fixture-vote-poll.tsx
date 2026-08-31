"use client";

import { useState, useTransition } from "react";

import { castFixtureVote } from "@/app/actions";
import { cn } from "@/lib/utils";

/** A casual "who wins" poll on a fixture. No account required to vote - the
 * server tracks the voter by an anonymous cookie, not a session. */
export function FixtureVotePoll({
  fixtureId,
  homeVotes,
  awayVotes,
  viewerVote,
}: {
  fixtureId: string;
  homeVotes: number;
  awayVotes: number;
  viewerVote: "home" | "away" | null;
}) {
  const [tally, setTally] = useState({ home: homeVotes, away: awayVotes });
  const [choice, setChoice] = useState(viewerVote);
  const [pending, startTransition] = useTransition();
  const total = tally.home + tally.away;
  const homeShare = total === 0 ? 50 : Math.round((tally.home / total) * 100);

  function vote(next: "home" | "away") {
    if (pending || choice === next) return;
    startTransition(async () => {
      const result = await castFixtureVote(fixtureId, next);
      if (result.ok) {
        setTally(result.tally);
        setChoice(result.choice);
      }
    });
  }

  return (
    <div className="col-span-3 row-start-3 flex flex-wrap items-center gap-2 border-t px-1 pt-2 text-xs">
      <span className="shrink-0 font-semibold text-muted-foreground">Who wins? Vote:</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => vote("home")}
        aria-pressed={choice === "home"}
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 font-semibold transition-colors disabled:cursor-not-allowed",
          choice === "home" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
        )}
      >
        Home
      </button>
      <span className="flex h-1.5 min-w-8 flex-1 overflow-hidden rounded-full" role="img" aria-label={`${homeShare}% voted Home, ${100 - homeShare}% voted Away`}>
        <span className="h-full bg-primary transition-[width]" style={{ width: `${homeShare}%` }} />
        <span className="h-full bg-destructive transition-[width]" style={{ width: `${100 - homeShare}%` }} />
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => vote("away")}
        aria-pressed={choice === "away"}
        className={cn(
          "shrink-0 rounded-full border px-2.5 py-1 font-semibold transition-colors disabled:cursor-not-allowed",
          choice === "away" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
        )}
      >
        Away
      </button>
      <span className="shrink-0 text-muted-foreground">{total} community vote{total === 1 ? "" : "s"}</span>
    </div>
  );
}
