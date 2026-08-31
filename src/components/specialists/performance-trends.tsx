"use client";
import { useMemo, useState } from "react";
import { TrendingUpIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SpecialistProfileData } from "@/data/specialists";

const ALL = "all";

/**
 * Rolling accuracy across settled independent calls, filterable by league.
 *
 * The filter offers every league the specialist has a record in, not only the
 * ones that happen to appear in the last few locks. It used to read its leagues
 * from recentLocks, which is the twelve most recent across all competitions, so
 * a league the specialist had played all season was missing from the filter
 * whenever their recent calls happened to be elsewhere.
 *
 * The chart reads the full settled series for the same reason: filtering twelve
 * rows by league drew whichever of them happened to fall inside that window.
 */
export function PerformanceTrends({ data }: { data: SpecialistProfileData }) {
  const [scope, setScope] = useState(ALL);

  const filters = [
    { slug: ALL, name: "All leagues" },
    ...data.leagues.map((league) => ({ slug: league.slug, name: league.name })),
  ];

  const points = useMemo(() => {
    const rows = data.settledLocks.filter((lock) => scope === ALL || lock.leagueSlug === scope);
    const series: Array<{ x: number; y: number }> = [];
    let wins = 0;
    let decisions = 0;
    // A void occupies a place in the series without being a decision, so the
    // line continues across it rather than counting it for or against.
    for (const [index, lock] of rows.entries()) {
      if (lock.result !== "void") decisions += 1;
      if (lock.result === "win") wins += 1;
      series.push({ x: index + 1, y: decisions ? (wins / decisions) * 100 : 0 });
    }
    return series;
  }, [data.settledLocks, scope]);

  const poly = points
    .map((point, index) => `${points.length === 1 ? 50 : (index / (points.length - 1)) * 100},${100 - point.y}`)
    .join(" ");
  const latest = Math.round(points.at(-1)?.y ?? 0);
  const scopeName = filters.find((filter) => filter.slug === scope)?.name ?? "this league";

  return (
    <section className="mb-8 border" aria-labelledby="performance-heading">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b p-5">
        <div>
          <TrendingUpIcon className="size-6 text-primary" />
          <h2 id="performance-heading" className="mt-3 font-heading text-3xl font-bold uppercase">Performance trend</h2>
          <p className="mt-1 text-sm text-muted-foreground">Rolling accuracy across settled independent calls.</p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto" role="group" aria-label="Filter the trend by league">
          {filters.map((filter) => (
            <Button
              key={filter.slug}
              size="sm"
              variant={scope === filter.slug ? "default" : "outline"}
              aria-pressed={scope === filter.slug}
              onClick={() => setScope(filter.slug)}
            >
              {filter.name}
            </Button>
          ))}
        </div>
      </header>

      {points.length ? (
        <div className="grid gap-5 p-5 md:grid-cols-[1fr_180px]">
          <svg
            viewBox="0 0 100 100"
            className="h-52 w-full overflow-visible"
            role="img"
            aria-label={`Rolling accuracy in ${scopeName} ends at ${latest} percent over ${points.length} calls`}
            preserveAspectRatio="none"
          >
            <path d="M0 25H100M0 50H100M0 75H100" stroke="currentColor" opacity=".12" vectorEffect="non-scaling-stroke" />
            <polyline points={poly} fill="none" stroke="var(--primary)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <circle cx={points.length === 1 ? 50 : 100} cy={100 - (points.at(-1)?.y ?? 0)} r="2.5" fill="var(--primary)" />
          </svg>
          <dl className="grid content-center gap-4 border-l pl-5">
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">Current</dt>
              <dd className="font-heading text-4xl text-primary">{latest}%</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-muted-foreground">Sample</dt>
              <dd className="font-semibold">{points.length} calls</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="p-10 text-center">
          <strong className="font-heading text-2xl uppercase">
            {scope === ALL ? "Trend starts after your first result" : `No settled calls in ${scopeName} yet`}
          </strong>
          <p className="mt-2 text-sm text-muted-foreground">
            {scope === ALL
              ? "Settled independent locks will form the chart."
              : "A record here appears once a call in this league settles."}
          </p>
        </div>
      )}
    </section>
  );
}
