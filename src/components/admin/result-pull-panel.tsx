"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon } from "lucide-react";

import { pullMatchResults } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunLog, useRunLog } from "@/components/admin/run-log";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { LeagueNavOption } from "@/data/teams";

/**
 * The same pull the hourly cron makes, on demand. Distinct from Refresh league
 * data: that rebuilds a league's schedule from the provider, this one only asks
 * for scores of matches already on it, and settles what they decide.
 *
 * Every press is written into the list below the buttons, including the presses
 * that changed nothing. "No match was waiting on a result" is the normal answer
 * between matchdays, and without it on screen a working button looks dead.
 */
export function ResultPullPanel({ leagues }: { leagues: LeagueNavOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const { entries, record } = useRunLog();

  function pull(slug: string | null, label: string) {
    setPendingSlug(slug ?? "all");
    startTransition(async () => {
      const result = await pullMatchResults(slug);

      if (!result.ok) {
        record(label, result.message, true);
        toast.add({ title: "Results not pulled", description: result.message, type: "error" });
      } else {
        const line = result.pending === 0
          ? "No match was waiting on a result."
          : `${result.pending} waiting · ${result.requests} request${result.requests === 1 ? "" : "s"} · ${result.updated} updated · ${result.finished} finished · ${result.settled} pick${result.settled === 1 ? "" : "s"} settled`;
        // The answer to "the match was played, why is nothing here": it was
        // never recorded, and only a refresh can record it.
        const withMissing = result.missing > 0
          ? `${line} · ${result.missing} played match${result.missing === 1 ? "" : "es"} at the provider are not in the schedule — press Refresh league data`
          : line;
        record(label, result.faults.length ? `${withMissing} · faults: ${result.faults.join(" | ")}` : withMissing, result.faults.length > 0 || result.missing > 0);
        toast.add({ title: `${label} pulled`, description: withMissing, type: result.faults.length || result.missing ? "error" : "success" });
        if (result.updated > 0 || result.settled > 0) router.refresh();
      }

      setPendingSlug(null);
    });
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
          <RefreshCwIcon aria-hidden="true" className="size-5" />
          Match results
        </CardTitle>
        <CardDescription>
          Pull scores for matches already played and settle the picks they decide. This runs hourly
          on its own; press it to bring a finished match in now. It costs one provider request per
          league that actually played, and none where nothing is waiting. Every run is also recorded
          under Fixture sync runs in Diagnostics.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 border-t pt-6">
        <div>
          <Button onClick={() => pull(null, "All leagues")} disabled={pending}>
            {pendingSlug === "all" ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            Pull results for every league
          </Button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <button
              key={league.slug}
              type="button"
              onClick={() => pull(league.slug, league.name)}
              disabled={pending}
              className="flex w-full items-center justify-between border px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
            >
              <span>{league.name}</span>
              <span className="text-xs text-muted-foreground">
                {pendingSlug === league.slug ? "Pulling…" : "Pull results"}
              </span>
            </button>
          ))}
        </div>

        <RunLog
          entries={entries}
          emptyHint="Nothing pulled yet in this session. Every press is listed here with what it found."
        />
      </CardContent>
    </Card>
  );
}
