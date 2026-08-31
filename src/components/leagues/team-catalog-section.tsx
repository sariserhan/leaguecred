import Link from "next/link";
import { ShieldAlertIcon } from "lucide-react";

import type { LeagueTeamCatalog } from "@/data/leagues";
import { teamHref } from "@/lib/team-path";
import { Crest } from "@/components/ui/crest";

export function TeamCatalogSection({ teamCatalog }: { teamCatalog: LeagueTeamCatalog }) {
  return (
    <section aria-labelledby="teams-heading">
      <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.08em] text-primary uppercase">Current season</p>
          <h2 id="teams-heading" className="font-heading text-4xl font-bold uppercase">
            {teamCatalog.teams.length} teams cataloged
          </h2>
        </div>
        {!teamCatalog.isComplete ? (
          <p className="flex max-w-xl items-start gap-2 text-sm text-muted-foreground">
            <ShieldAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            Membership is based on the teams present in the connected free fixture sources.
          </p>
        ) : null}
      </div>

      {teamCatalog.teams.length > 0 ? (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teamCatalog.teams.map((team) => (
            <li key={team.id} className="[contain-intrinsic-size:0_96px] [content-visibility:auto]">
              <Link href={teamHref(team)} className="flex min-h-24 items-center gap-4 border bg-card p-4 transition-colors hover:bg-muted">
              <Crest
                src={team.logoUrl}
                size={56}
                fallback={<span className="font-bold text-black">{team.shortName}</span>}
              />
              <span className="font-semibold">{team.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 border p-6 text-muted-foreground">The official participant list has not been imported yet.</p>
      )}

      <p className="mt-5 text-xs text-muted-foreground">
        Team metadata and artwork come from the connected free football data sources.
      </p>
    </section>
  );
}
