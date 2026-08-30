"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  CircleDotIcon,
  LockKeyholeIcon,
  SearchIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { League, Region } from "@/lib/league-data";

const regions = ["All", "Europe", "Americas", "Asia", "Africa", "Oceania"] as const;
type RegionFilter = (typeof regions)[number];

export function LeagueExplorer({ leagues }: { leagues: League[] }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionFilter>("All");

  const filteredLeagues = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return leagues.filter((league) => {
      const matchesRegion =
        region === "All" || league.region === (region as Region);
      const matchesQuery =
        normalizedQuery.length === 0 ||
        league.name.toLocaleLowerCase().includes(normalizedQuery) ||
        league.country.toLocaleLowerCase().includes(normalizedQuery);

      return matchesRegion && matchesQuery;
    });
  }, [leagues, query, region]);

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
      <section className="min-w-0" aria-labelledby="popular-leagues-heading">
        <div className="mb-10 flex flex-col gap-4 xl:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Search leagues or countries</span>
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search leagues or countries"
              className="h-14 rounded-sm pl-12 text-base"
            />
          </label>

          <ToggleGroup
            value={[region]}
            onValueChange={(values) => {
              const nextRegion = values[0] as RegionFilter | undefined;
              if (nextRegion) setRegion(nextRegion);
            }}
            variant="outline"
            size="lg"
            aria-label="Filter leagues by region"
            className="flex-wrap"
          >
            {regions.map((item) => (
              <ToggleGroupItem key={item} value={item} className="min-w-24">
                {item}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <h2 id="popular-leagues-heading" className="font-heading text-3xl font-bold uppercase">
          Top-flight leagues
        </h2>

        <div className="mt-3 border-y">
          <div className="hidden grid-cols-[1fr_1.4fr_1.5fr_1.4fr_auto] gap-5 border-b bg-muted px-4 py-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase md:grid">
            <span>Country</span>
            <span>League</span>
            <span>Specialist evidence</span>
            <span>Your status</span>
            <span>Action</span>
          </div>

          {filteredLeagues.length > 0 ? (
            <ul>
              {filteredLeagues.map((league) => (
                <li
                  key={league.slug}
                  className="grid gap-4 border-b px-4 py-5 transition-colors [contain-intrinsic-size:0_81px] [content-visibility:auto] last:border-b-0 hover:bg-muted/70 md:grid-cols-[1fr_1.4fr_1.5fr_1.4fr_auto] md:items-center md:gap-5"
                >
                  <span className="flex items-center gap-3">
                    {league.flagUrl ? (
                      <Image
                        src={league.flagUrl}
                        alt=""
                        width={28}
                        height={20}
                        unoptimized
                        className="h-5 w-7 rounded-[2px] object-cover"
                      />
                    ) : (
                      <span className="text-2xl" aria-hidden="true">{league.flag}</span>
                    )}
                    <span>{league.country}</span>
                  </span>
                  <strong className="flex items-center gap-3">
                    {league.logoUrl ? (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-white p-1">
                        <Image
                          src={league.logoUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 object-contain"
                        />
                      </span>
                    ) : null}
                    <span>{league.name}</span>
                  </strong>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <UsersRoundIcon aria-hidden="true" className="size-4" />
                    {league.specialistCount} ranked specialists
                  </span>
                  <span className="flex items-center gap-2 text-sm">
                    <CircleDotIcon aria-hidden="true" className="size-4 text-primary" />
                    {league.status}
                  </span>
                  {league.available === false ? (
                    <span className="inline-flex h-10 items-center justify-center border px-4 text-sm font-semibold text-muted-foreground">
                      Cataloged
                    </span>
                  ) : (
                    <Link
                      href={"/leagues/" + league.slug}
                      className="inline-flex h-10 items-center justify-center gap-2 border border-foreground px-4 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background"
                    >
                      {league.action}
                      <ArrowRightIcon aria-hidden="true" className="size-4" />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="font-semibold">No leagues match that search.</p>
              <p className="text-sm text-muted-foreground">
                Try another country, league, or region.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="border-l pl-6" aria-labelledby="network-heading">
        <h2 id="network-heading" className="font-heading text-3xl font-bold uppercase">
          Your network
        </h2>
        <dl className="mt-3 border-y">
          <div className="flex items-center justify-between gap-4 border-b py-6">
            <dt className="flex items-center gap-3">
              <CircleDotIcon aria-hidden="true" className="size-5 text-primary" />
              Leagues I know
            </dt>
            <dd className="font-bold">2</dd>
          </div>
          <div className="flex items-center justify-between gap-4 border-b py-6">
            <dt className="flex items-center gap-3">
              <UsersRoundIcon aria-hidden="true" className="size-5" />
              Leagues I follow
            </dt>
            <dd className="font-bold">3</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-6">
            <dt className="flex items-center gap-3">
              <LockKeyholeIcon aria-hidden="true" className="size-5" />
              Independent locks due
            </dt>
            <dd className="font-bold">1</dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
