"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCwIcon, TriangleAlertIcon } from "lucide-react";

import { pullMatchResults } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { LeagueNavOption } from "@/data/teams";

/**
 * The same pull the hourly cron makes, on demand. Distinct from Refresh league
 * data above it: that rebuilds a league's schedule from the provider, this one
 * only asks for scores of matches already on it, and settles what they decide.
 */
export function ResultPullPanel({ leagues }: { leagues: LeagueNavOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pull(slug: string | null, label: string) {
    setSummary(null);
    setError(null);
    setPendingSlug(slug ?? "all");
    startTransition(async () => {
      const result = await pullMatchResults(slug);
      if (result.ok) {
        // "Nothing to pull" is the normal answer between matchdays, so it is
        // reported as an outcome rather than left looking like a dead button.
        const line = result.updated === 0 && result.settled === 0
          ? `${label}: nothing waiting on a result.`
          : `${label}: ${result.updated} fixture${result.updated === 1 ? "" : "s"} updated, ${result.finished} finished, ${result.settled} pick${result.settled === 1 ? "" : "s"} settled.`;
        setSummary(result.faults.length ? `${line} Faults: ${result.faults.join(" | ")}` : line);
        toast.add({ title: "Results pulled", description: line, type: "success" });
        router.refresh();
      } else {
        setError(result.message);
        toast.add({ title: "Results not pulled", description: result.message, type: "error" });
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
          on its own; press it to see a finished match land now. It costs one provider request per
          league that actually played, and none where nothing is waiting.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 border-t pt-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => pull(null, "All leagues")} disabled={pending}>
            {pendingSlug === "all" ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
            Pull results for every league
          </Button>
          {summary ? <p className="text-sm font-semibold" role="status">{summary}</p> : null}
          {error ? (
            <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <TriangleAlertIcon aria-hidden="true" className="size-4" />
              {error}
            </p>
          ) : null}
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
      </CardContent>
    </Card>
  );
}
