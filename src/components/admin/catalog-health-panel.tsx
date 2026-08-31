import { CircleAlertIcon, CircleCheckIcon } from "lucide-react";

import type { CatalogHealth } from "@/services/catalog-health";
import { TOLERATED_CATALOG_FAULTS } from "@/services/catalog-health";
import { cn } from "@/lib/utils";

/**
 * What the catalogue looks like right now, and what to run when it looks wrong.
 *
 * These counts were already measured every night, and the answer went into the
 * job's response where nobody read it. Duplicate fixtures sat in production for
 * weeks with the nightly check reporting them the whole time; they were found by
 * someone noticing the same match twice on a page. Measuring was never the
 * missing part — showing it was.
 *
 * Nothing here repairs anything. Every one of these has needed a judgement the
 * data could not make on its own, which is why the jobs named below report
 * before they write and why none of them runs unattended.
 */

const checks: Array<{
  key: keyof Omit<CatalogHealth, "healthy">;
  label: string;
  meaning: string;
  remedy: string;
}> = [
  {
    key: "duplicateMatches",
    label: "Duplicate matches",
    meaning: "One match recorded twice, usually because each copy names a different club row.",
    remedy: "pnpm teams:dedupe --apply, then pnpm fixtures:dedupe --apply",
  },
  {
    key: "duplicateClubNames",
    label: "Duplicate club names",
    meaning: "Two rows sharing a name. Sometimes real — there are two Liverpools.",
    remedy: "pnpm teams:dedupe",
  },
  {
    key: "clubsSpanningRegions",
    label: "Clubs across confederations",
    meaning: "No club plays in two confederations, so this is a wrongly merged pair.",
    remedy: "pnpm team:split",
  },
  {
    key: "splitGameweeks",
    label: "Split gameweeks",
    meaning: "One round of matches filed under two overlapping matchweeks.",
    remedy: "pnpm matchweeks:merge",
  },
  {
    key: "clubsNamedDifferentlyByEspn",
    label: "Clubs ESPN names differently",
    meaning: "The catalogue disagrees with the source that keeps it current.",
    remedy: "pnpm teams:names",
  },
  {
    key: "orphanedClubs",
    label: "Orphaned clubs",
    meaning: "Rows in no league and no fixture — a provider's leftovers.",
    remedy: "pnpm league:drop --orphans",
  },
  {
    key: "malformedSlugs",
    label: "Malformed slugs",
    meaning: "A slug with a doubled or trailing hyphen, which makes a bad URL.",
    remedy: "pnpm teams:names",
  },
];

export function CatalogHealthPanel({ health }: { health: CatalogHealth }) {
  const tolerated: Partial<Record<keyof Omit<CatalogHealth, "healthy">, number>> = TOLERATED_CATALOG_FAULTS;
  const faults = checks
    .map((check) => ({ ...check, count: health[check.key], allowed: tolerated[check.key] ?? 0 }))
    .filter((check) => check.count > check.allowed);

  return (
    <section className="border p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-2xl font-bold uppercase">Catalog health</h2>
        <span
          className={cn(
            "flex items-center gap-2 border px-3 py-1.5 text-xs font-bold uppercase",
            health.healthy ? "text-primary" : "border-destructive text-destructive",
          )}
        >
          {health.healthy ? <CircleCheckIcon className="size-4" /> : <CircleAlertIcon className="size-4" />}
          {health.healthy ? "Nothing to look at" : `${faults.length} to look at`}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Measured live. A count within its allowance is expected — two clubs really are called Liverpool, and an
        undecided tie really is stored twice under placeholder names. Nothing here repairs anything on its own.
      </p>

      <dl className="mt-5 grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((check) => {
          const count = health[check.key];
          const allowed = tolerated[check.key] ?? 0;
          const over = count > allowed;
          return (
            <div key={check.key} className="bg-background px-5 py-4">
              <dt className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">{check.label}</dt>
              <dd className={cn("mt-1 font-heading text-3xl leading-none", over && "text-destructive")}>
                {count}
                {allowed > 0 ? <span className="ml-1 text-sm text-muted-foreground">/ {allowed} allowed</span> : null}
              </dd>
            </div>
          );
        })}
      </dl>

      {faults.length > 0 ? (
        <ul className="mt-5 divide-y border">
          {faults.map((fault) => (
            <li key={fault.key} className="p-4">
              <p className="font-semibold">
                {fault.label}: {fault.count}
                {fault.allowed > 0 ? ` (${fault.allowed} expected)` : ""}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{fault.meaning}</p>
              <code className="mt-2 block overflow-x-auto text-xs">{fault.remedy}</code>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
