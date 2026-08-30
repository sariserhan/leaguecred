import Link from "next/link";
import { ArrowLeftIcon, UsersRoundIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { League } from "@/lib/league-data";

export function LeagueComingSoon({ league }: { league: League }) {
  return (
    <div className="page-shell py-20">
      <div className="grid min-h-[520px] place-items-center border bg-secondary p-8 text-center">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <span className="text-6xl" aria-hidden="true">
            {league.flag}
          </span>
          <div>
            <p className="font-semibold text-primary">{league.country}</p>
            <h1 className="font-heading text-6xl font-extrabold uppercase sm:text-8xl">
              {league.name}
            </h1>
          </div>
          <p className="max-w-lg text-lg leading-8 text-muted-foreground">
            {league.specialistCount} specialists are being prepared for this
            league. The complete Prove-or-Follow experience is currently live
            for Süper Lig.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/leagues/super-lig"
              className={buttonVariants({ size: "lg" })}
            >
              <UsersRoundIcon data-icon="inline-start" />
              Open Süper Lig demo
            </Link>
            <Link
              href="/leagues"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              All leagues
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
