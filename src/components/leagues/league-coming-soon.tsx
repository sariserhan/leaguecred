import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ShieldAlertIcon, UsersRoundIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { LeagueTeamCatalog } from "@/data/leagues";
import type { League } from "@/lib/league-data";

export function LeagueComingSoon({
  league,
  teamCatalog,
}: {
  league: League;
  teamCatalog: LeagueTeamCatalog;
}) {
  return (
    <div className="page-shell py-14 sm:py-20">
      <header className="border bg-secondary p-8 sm:p-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          {league.logoUrl ? (
            <span className="flex size-28 shrink-0 items-center justify-center bg-white p-3">
              <Image src={league.logoUrl} alt="" width={88} height={88} className="size-22 object-contain" />
            </span>
          ) : null}
          <div>
            <p className="font-semibold text-primary">{league.country}</p>
            <h1 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">
              {league.name}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Team catalog available now. Fixtures, Weekly Locks, and specialist records will appear after a complete current-season fixture source is connected.
            </p>
          </div>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="teams-heading">
        <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-primary uppercase">Current data import</p>
            <h2 id="teams-heading" className="font-heading text-4xl font-bold uppercase">
              {teamCatalog.teams.length} teams cataloged
            </h2>
          </div>
          {!teamCatalog.isComplete ? (
            <p className="flex max-w-xl items-start gap-2 text-sm text-muted-foreground">
              <ShieldAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              Partial membership: free-source limits mean this is not yet the complete verified roster.
            </p>
          ) : null}
        </div>

        {teamCatalog.teams.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teamCatalog.teams.map((team) => (
              <li
                key={team.id}
                className="flex min-h-24 items-center gap-4 border bg-card p-4 [contain-intrinsic-size:0_96px] [content-visibility:auto]"
              >
                <span className="flex size-14 shrink-0 items-center justify-center bg-white p-1.5">
                  {team.logoUrl ? (
                    <Image src={team.logoUrl} alt="" width={44} height={44} className="size-11 object-contain" />
                  ) : (
                    <span className="font-bold text-muted-foreground">{team.shortName}</span>
                  )}
                </span>
                <span className="font-semibold">{team.name}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 border p-6 text-muted-foreground">No team records have been imported yet.</p>
        )}

        <p className="mt-5 text-xs text-muted-foreground">
          Team metadata and artwork supplied by TheSportsDB. Competition and cross-reference IDs supplied by API-Football.
        </p>
      </section>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/leagues/super-lig" className={buttonVariants({ size: "lg" })}>
          <UsersRoundIcon data-icon="inline-start" />
          Open Süper Lig demo
        </Link>
        <Link href="/leagues" className={buttonVariants({ variant: "outline", size: "lg" })}>
          <ArrowLeftIcon data-icon="inline-start" />
          All competitions
        </Link>
      </div>
    </div>
  );
}
