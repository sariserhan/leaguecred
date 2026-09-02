"use client";

import { useState } from "react";
import { ArrowRightIcon, CheckIcon, LockKeyholeIcon, RotateCcwIcon } from "lucide-react";

import type { HomeLeague } from "@/data/home";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/ui/crest";
import { cn } from "@/lib/utils";

export function InteractiveDemo({ leagues }: { leagues: HomeLeague[] }) {
  const demoLeagues = leagues.filter((league) => league.homeTeam && league.awayTeam).slice(0, 4);
  const [leagueIndex, setLeagueIndex] = useState(0);
  const [team, setTeam] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const league = demoLeagues[leagueIndex];

  if (!league) return null;

  function reset(nextIndex = leagueIndex) {
    setLeagueIndex(nextIndex);
    setTeam(null);
    setLocked(false);
  }

  return (
    <section className="border bg-background shadow-xl shadow-foreground/10" aria-labelledby="demo-title">
      <header className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] uppercase text-muted-foreground">Try it now</p>
          <h2 id="demo-title" className="font-heading text-2xl font-bold uppercase">Make a practice lock</h2>
        </div>
        <span className="size-3 rounded-full bg-primary shadow-[0_0_0_6px_color-mix(in_oklab,var(--primary)_18%,transparent)]" aria-label="Live demo ready" />
      </header>

      <div className="p-5">
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1" aria-label="Choose a league">
          {demoLeagues.map((item, index) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => reset(index)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border px-3 py-2 text-sm font-semibold",
                index === leagueIndex
                  ? "border-inverted bg-inverted text-inverted-foreground"
                  : "hover:bg-muted",
              )}
              aria-pressed={index === leagueIndex}
            >
              {/* A competition logo is usually a wordmark, and the selected tab
                  is dark in both themes rather than only in the dark one — so
                  the plate is forced white there instead of being left to
                  `plate`'s dark-mode default, which would let black type
                  disappear into the tab on a light page. */}
              {item.logoUrl ? (
                <Crest
                  src={item.logoUrl}
                  size={20}
                  plate
                  className={index === leagueIndex ? "bg-white" : undefined}
                />
              ) : null}
              {item.shortName}
            </button>
          ))}
        </div>

        {locked ? (
          <div className="flex min-h-52 flex-col items-center justify-center border border-primary bg-primary/10 p-6 text-center" aria-live="polite">
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"><CheckIcon /></span>
            <p className="mt-4 font-heading text-3xl font-bold uppercase">{team} locked</p>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">That is the whole idea: one clear call, permanently recorded after the real submission.</p>
            <Button className="mt-5" variant="outline" onClick={() => reset()}><RotateCcwIcon />Try another</Button>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm font-semibold">Who wins this fixture?</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[league.homeTeam, league.awayTeam].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTeam(name)}
                  className={team === name ? "min-h-24 border-2 border-primary bg-primary/10 p-4 text-left" : "min-h-24 border p-4 text-left transition-colors hover:border-inverted"}
                  aria-pressed={team === name}
                >
                  <span className="block font-heading text-xl font-bold uppercase">{name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{league.name}</span>
                </button>
              ))}
            </div>
            <Button className="mt-4 w-full" disabled={!team} onClick={() => setLocked(true)}>
              <LockKeyholeIcon />Lock this practice call<ArrowRightIcon data-icon="inline-end" />
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
