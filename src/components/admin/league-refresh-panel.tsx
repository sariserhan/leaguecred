"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadIcon } from "lucide-react";

import { refreshLeagueFixtures } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { RunLog, useRunLog } from "@/components/admin/run-log";
import { toast } from "@/components/ui/toast";
import type { LeagueNavOption } from "@/data/teams";

/**
 * The heavier of the two: this rebuilds a league's schedule from the provider
 * and is the only control here that can add a fixture. Match results only
 * writes scores onto fixtures this has already created.
 */
export function LeagueRefreshPanel({ leagues }: { leagues: LeagueNavOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const { entries, record } = useRunLog();

  function refresh(slug: string | null, label: string) {
    setPendingSlug(slug ?? "all");
    startTransition(async () => {
      const result = await refreshLeagueFixtures(slug);

      if (!result.ok) {
        record(label, result.message, true);
        toast.add({ title: "League not refreshed", description: result.message, type: "error" });
      } else {
        const line = `${result.requests} request${result.requests === 1 ? "" : "s"} · ${result.created} fixture${result.created === 1 ? "" : "s"} added · ${result.updated} updated`
          // Worth surfacing rather than burying: these landed in a week that had
          // already locked or taken picks, which is allowed but is not routine.
          + (result.lateAdded > 0 ? ` · ${result.lateAdded} of them into a week already locked or picked in` : "")
          // Rows another provider wrote, which nothing else updates.
          + (result.adopted > 0 ? ` · ${result.adopted} scored on another provider's row` : "");
        record(label, line, false);
        toast.add({ title: `${label} refreshed`, description: line, type: "success" });
        if (result.created > 0 || result.updated > 0) router.refresh();
      }

      setPendingSlug(null);
    });
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
          <DownloadIcon aria-hidden="true" className="size-5" />
          Refresh league data
        </CardTitle>
        <CardDescription>
          Rebuild one league&rsquo;s fixtures and standings from the provider. Heavier than a result
          pull, and the only control here that can add a fixture. Every run is also recorded under
          Fixture sync runs in Diagnostics.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 border-t pt-6">
        <div>
          <Button onClick={() => refresh(null, "All leagues")} disabled={pending}>
            {pendingSlug === "all" ? <Spinner data-icon="inline-start" /> : <DownloadIcon data-icon="inline-start" />}
            Refresh every league
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            One provider request per league, around twenty in a press, and it can take a minute.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league) => (
            <button
              key={league.slug}
              type="button"
              onClick={() => refresh(league.slug, league.name)}
              disabled={pending}
              className="flex w-full items-center justify-between border px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
            >
              <span>{league.name}</span>
              <span className="text-xs text-muted-foreground">
                {pendingSlug === league.slug ? "Refreshing…" : "Refresh"}
              </span>
            </button>
          ))}
        </div>
        <RunLog
          entries={entries}
          emptyHint="Nothing refreshed yet in this session. Every press is listed here with what it changed."
        />
      </CardContent>
    </Card>
  );
}
