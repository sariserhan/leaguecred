"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CircleDotIcon, LockKeyholeIcon, RotateCcwIcon, SearchIcon, SlidersHorizontalIcon, UsersRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { League, Region } from "@/lib/league-data";
import { cn } from "@/lib/utils";

const regions = ["All", "Europe", "Americas", "Asia", "Africa", "Oceania"] as const;
const availabilityOptions = ["All leagues", "Daily Lock ready", "Team catalog"] as const;
type RegionFilter = (typeof regions)[number];
type AvailabilityFilter = (typeof availabilityOptions)[number];
type Intent = "prove" | "follow";

function PersonalStatus({ league, authenticated }: { league: League; authenticated: boolean }) {
  if (!authenticated) return <span className="text-muted-foreground">No activity yet</span>;
  return <span className={cn("flex items-center gap-2", league.lockDue && "font-semibold")}><CircleDotIcon aria-hidden="true" className="size-4 shrink-0 text-primary" />{league.lockDue ? "Daily Lock due" : league.status}</span>;
}

function LeagueRow({ league, intent, authenticated }: { league: League; intent: Intent; authenticated: boolean }) {
  const isReady = league.hasExperience;
  const action = intent === "prove" ? (isReady ? "Make a Daily Lock" : "Explore teams") : (isReady ? "Find specialists" : "Explore teams");
  return (
    <li className="grid gap-4 border-b px-4 py-5 transition-colors last:border-b-0 hover:bg-muted/60 md:grid-cols-[1fr_1.35fr_1.25fr_1.2fr_auto] md:items-center md:gap-5">
      <span className="flex items-center gap-3 text-sm">
        {league.flagUrl ? <Image src={league.flagUrl} alt="" width={28} height={20} unoptimized className="h-5 w-7 object-cover" /> : <span className="text-2xl" aria-hidden="true">{league.flag}</span>}
        <span>{league.country}</span>
      </span>
      <strong className="flex items-center gap-3">
        {league.logoUrl ? <span className="flex size-10 shrink-0 items-center justify-center bg-white p-1"><Image src={league.logoUrl} alt="" width={32} height={32} className="size-8 object-contain" /></span> : null}
        <span>{league.name}</span>
      </strong>
      <span className="flex items-center gap-2 text-sm text-muted-foreground"><UsersRoundIcon aria-hidden="true" className="size-4 shrink-0" />{league.specialistCount} ranked specialist{league.specialistCount === 1 ? "" : "s"}</span>
      <span className="text-sm"><PersonalStatus league={league} authenticated={authenticated} /></span>
      <div className="flex justify-end gap-2 sm:flex-row md:flex-col xl:flex-row">
        {league.available !== false ? (
          <Link href={`/leagues/${league.slug}`} className="inline-flex min-h-11 items-center justify-center gap-2 border border-foreground px-4 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background md:min-h-10">{action}<ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
        ) : <span className="inline-flex min-h-11 items-center justify-center border px-4 text-sm font-semibold text-muted-foreground md:min-h-10">Coming soon</span>}
        <Link href={`/leagues/${league.slug}/standings`} className="inline-flex min-h-11 items-center justify-center border px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted md:min-h-10">Standings</Link>
      </div>
    </li>
  );
}

function LeagueSection({ title, leagues, intent, authenticated }: { title: string; leagues: League[]; intent: Intent; authenticated: boolean }) {
  if (!leagues.length) return null;
  const headingId = `${title.replaceAll(" ", "-").toLowerCase()}-heading`;
  return (
    <section className="mt-8 first:mt-0" aria-labelledby={headingId}>
      <h2 id={headingId} className="font-heading text-3xl font-bold uppercase">{title}</h2>
      <div className="mt-3 border-y">
        <div className="hidden grid-cols-[1fr_1.35fr_1.25fr_1.2fr_auto] gap-5 border-b bg-muted px-4 py-3 text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase md:grid"><span>Country</span><span>League</span><span>Specialists</span><span>Your status</span><span>Action</span></div>
        <ul>{leagues.map((league) => <LeagueRow key={league.slug} league={league} intent={intent} authenticated={authenticated} />)}</ul>
      </div>
    </section>
  );
}

export function LeagueExplorer({ leagues, authenticated, initialIntent }: { leagues: League[]; authenticated: boolean; initialIntent: Intent }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<RegionFilter>("All");
  const [availability, setAvailability] = useState<AvailabilityFilter>("All leagues");
  const [intent, setIntent] = useState<Intent>(initialIntent);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filteredLeagues = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return leagues.filter((league) => {
      const matchesRegion = region === "All" || league.region === (region as Region);
      const matchesQuery = !normalizedQuery || league.name.toLocaleLowerCase().includes(normalizedQuery) || league.country.toLocaleLowerCase().includes(normalizedQuery);
      const matchesAvailability = availability === "All leagues" || (availability === "Daily Lock ready" ? league.hasExperience : league.hasTeamCatalog);
      return matchesRegion && matchesQuery && matchesAvailability;
    });
  }, [availability, leagues, query, region]);
  const ready = filteredLeagues.filter((league) => league.hasExperience);
  const catalogs = filteredLeagues.filter((league) => !league.hasExperience);
  const networkStats = { known: authenticated ? leagues.filter((league) => league.hasRecord).length : 0, followed: authenticated ? leagues.filter((league) => league.isFollowed).length : 0, locksDue: authenticated ? leagues.filter((league) => league.lockDue).length : 0 };
  function resetFilters() { setQuery(""); setRegion("All"); setAvailability("All leagues"); }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        <ToggleGroup value={[intent]} onValueChange={(values) => values[0] && setIntent(values[0] as Intent)} variant="outline" spacing={0} aria-label="Choose how to use a league" className="grid w-full grid-cols-2 sm:w-fit">
          <ToggleGroupItem value="prove" className="h-12 min-w-0 rounded-none px-3 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground sm:min-w-52 sm:px-5">Prove my knowledge</ToggleGroupItem>
          <ToggleGroupItem value="follow" className="h-12 min-w-0 rounded-none px-3 data-[pressed]:bg-primary data-[pressed]:text-primary-foreground sm:min-w-52 sm:px-5">Follow a specialist</ToggleGroupItem>
        </ToggleGroup>
        <div className="mt-6 border-y py-6">
          <label className="relative block"><span className="sr-only">Search leagues or countries</span><SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search leagues or countries" className="h-14 rounded-sm pl-12 text-base" /></label>
          <Button variant="outline" className="mt-4 w-full sm:hidden" onClick={() => setFiltersOpen(true)}><SlidersHorizontalIcon data-icon="inline-start" />Filters{region !== "All" || availability !== "All leagues" ? " · Active" : ""}</Button>
          <div className="mt-5 hidden gap-5 sm:grid"><FilterRow label="Region"><ToggleGroup value={[region]} onValueChange={(values) => values[0] && setRegion(values[0] as RegionFilter)} variant="outline" spacing={0} aria-label="Filter leagues by region" className="w-max">{regions.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none px-4">{item}</ToggleGroupItem>)}</ToggleGroup></FilterRow><FilterRow label="Availability"><ToggleGroup value={[availability]} onValueChange={(values) => values[0] && setAvailability(values[0] as AvailabilityFilter)} variant="outline" spacing={0} aria-label="Filter leagues by availability" className="w-max">{availabilityOptions.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none px-4">{item}</ToggleGroupItem>)}</ToggleGroup></FilterRow></div>
        </div>
        {filteredLeagues.length ? <div className="mt-8"><LeagueSection title="Ready for a Daily Lock" leagues={ready} intent={intent} authenticated={authenticated} /><LeagueSection title="Explore team catalogs" leagues={catalogs} intent={intent} authenticated={authenticated} /></div> : (
          <div className="mt-8 flex min-h-72 flex-col items-center justify-center border-y px-6 text-center"><SearchIcon aria-hidden="true" className="size-10" strokeWidth={1.5} /><h2 className="mt-5 font-heading text-3xl font-bold uppercase">No leagues found</h2><p className="mt-2 text-sm text-muted-foreground">Try adjusting your filters or search terms.</p><button type="button" onClick={resetFilters} className="mt-6 inline-flex h-10 items-center gap-2 border border-foreground px-4 text-sm font-semibold hover:bg-foreground hover:text-background"><RotateCcwIcon className="size-4" />Reset filters</button></div>
        )}
      </div>
      <NetworkSummary authenticated={authenticated} stats={networkStats} />
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="rounded-none"><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">League filters</DialogTitle><DialogDescription>Choose a region and the type of league experience you need.</DialogDescription></DialogHeader><div className="grid gap-6"><FilterRow label="Region"><ToggleGroup value={[region]} onValueChange={(values) => values[0] && setRegion(values[0] as RegionFilter)} variant="outline" className="flex flex-wrap">{regions.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none">{item}</ToggleGroupItem>)}</ToggleGroup></FilterRow><FilterRow label="Availability"><ToggleGroup value={[availability]} onValueChange={(values) => values[0] && setAvailability(values[0] as AvailabilityFilter)} variant="outline" className="flex flex-wrap">{availabilityOptions.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none">{item}</ToggleGroupItem>)}</ToggleGroup></FilterRow></div><DialogFooter><Button variant="outline" onClick={resetFilters}>Reset</Button><Button onClick={() => setFiltersOpen(false)}>Show {filteredLeagues.length} leagues</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center"><span className="text-xs font-bold tracking-[0.08em] uppercase">{label}</span><div className="-mx-1 overflow-x-auto px-1 pb-1">{children}</div></div>;
}

function NetworkSummary({ authenticated, stats }: { authenticated: boolean; stats: { known: number; followed: number; locksDue: number } }) {
  const items = [{ label: "Leagues proven", value: stats.known, Icon: CircleDotIcon }, { label: "Leagues followed", value: stats.followed, Icon: UsersRoundIcon }, { label: "Locks due", value: stats.locksDue, Icon: LockKeyholeIcon }];
  return (
    <aside className="order-first border-y py-5 lg:order-none lg:border-y-0 lg:border-l lg:py-0 lg:pl-6" aria-labelledby="network-heading">
      <h2 id="network-heading" className="font-heading text-2xl font-bold uppercase lg:text-3xl">Your football network</h2>
      <dl className="mt-4 grid grid-cols-3 divide-x border lg:block lg:divide-x-0 lg:border-x-0">{items.map(({ label, value, Icon }) => <div key={label} className="flex min-w-0 flex-col items-center gap-1 p-3 text-center lg:flex-row lg:items-center lg:justify-between lg:border-b lg:px-0 lg:py-6 lg:text-left"><dt className="flex min-w-0 flex-col items-center gap-1 text-[11px] font-semibold uppercase lg:flex-row lg:gap-3 lg:text-sm lg:normal-case"><Icon aria-hidden="true" className="size-5 shrink-0 text-primary" />{label}</dt><dd className="font-heading text-3xl font-bold text-primary">{value}</dd></div>)}</dl>
      {!authenticated ? <p className="mt-4 text-sm leading-6 text-muted-foreground">Sign in to see your records, followed leagues, and locks due.</p> : null}
    </aside>
  );
}
