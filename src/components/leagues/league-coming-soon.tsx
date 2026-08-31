import Link from "next/link";
import { ArrowLeftIcon, UsersRoundIcon } from "lucide-react";

import { TeamCatalogSection } from "@/components/leagues/team-catalog-section";
import { buttonVariants } from "@/components/ui/button";
import type { LeagueTeamCatalog } from "@/data/leagues";
import type { League } from "@/lib/league-data";
import { Crest } from "@/components/ui/crest";

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
              <Crest src={league.logoUrl} size={88} />
            </span>
          ) : null}
          <div>
            <p className="font-semibold text-primary">{league.country}</p>
            <h1 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">
              {league.name}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-muted-foreground">
              Team catalog available now. The next fixture set will appear here when its schedule is published.
            </p>
          </div>
        </div>
      </header>

      <div className="mt-10">
        <TeamCatalogSection teamCatalog={teamCatalog} />
      </div>

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
