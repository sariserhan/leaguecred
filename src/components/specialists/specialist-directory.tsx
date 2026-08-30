"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, RotateCcwIcon, SearchIcon, UsersRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SpecialistDirectoryEntry } from "@/data/specialists";

const sorts = ["Confidence-adjusted", "Accuracy", "Evidence", "Followers"] as const;
type Sort = (typeof sorts)[number];

export function SpecialistDirectory({ specialists }: { specialists: SpecialistDirectoryEntry[] }) {
  const [query, setQuery] = useState("");
  const [league, setLeague] = useState("All leagues");
  const [sort, setSort] = useState<Sort>("Confidence-adjusted");
  const leagues = useMemo(() => ["All leagues", ...new Set(specialists.map((entry) => entry.leagueName))], [specialists]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return specialists.filter((entry) => (!needle || entry.name.toLocaleLowerCase().includes(needle) || entry.leagueName.toLocaleLowerCase().includes(needle)) && (league === "All leagues" || entry.leagueName === league)).toSorted((a, b) => {
      if (sort === "Accuracy") return (b.wins / b.settledPicks) - (a.wins / a.settledPicks);
      if (sort === "Evidence") return b.settledPicks - a.settledPicks;
      if (sort === "Followers") return b.followers - a.followers;
      return b.confidenceAdjustedAccuracy - a.confidenceAdjustedAccuracy;
    });
  }, [league, query, sort, specialists]);

  function reset() { setQuery(""); setLeague("All leagues"); setSort("Confidence-adjusted"); }

  return (
    <main className="page-shell py-14 sm:py-20">
      <header className="max-w-4xl"><h1 className="font-heading text-[clamp(3.5rem,7vw,7rem)] leading-[0.88] font-extrabold uppercase">Find proven specialists.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Compare verified records across leagues. Follow specialists only where their independent evidence is established.</p></header>
      <section className="mt-10 max-w-full overflow-hidden border-y py-6" aria-label="Specialist filters">
        <label className="relative block"><span className="sr-only">Search specialists or leagues</span><SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search specialists or leagues" className="h-14 rounded-none pl-12 text-base" /></label>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Filter label="League"><ToggleGroup value={[league]} onValueChange={(values) => values[0] && setLeague(values[0])} variant="outline" spacing={0} aria-label="Filter by league" className="w-max">{leagues.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none px-4">{item}</ToggleGroupItem>)}</ToggleGroup></Filter>
          <Filter label="Sort by"><ToggleGroup value={[sort]} onValueChange={(values) => values[0] && setSort(values[0] as Sort)} variant="outline" spacing={0} aria-label="Sort specialists" className="w-max">{sorts.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none px-4">{item}</ToggleGroupItem>)}</ToggleGroup></Filter>
        </div>
      </section>
      {filtered.length ? <section className="mt-9" aria-labelledby="ranking-heading"><div className="flex items-end justify-between gap-4"><h2 id="ranking-heading" className="font-heading text-3xl font-bold uppercase">Verified specialist records</h2><span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span></div><div className="mt-3 border-y"><div className="hidden grid-cols-[48px_1.3fr_1fr_.7fr_.8fr_.8fr_.7fr_.7fr_auto] gap-4 border-b bg-muted px-4 py-3 text-xs font-bold uppercase text-muted-foreground lg:grid"><span>#</span><span>Specialist</span><span>Strongest league</span><span>Accuracy</span><span>Record</span><span>Evidence</span><span>Streak</span><span>Followers</span><span>View</span></div><ol>{filtered.map((entry, index) => <SpecialistRow key={entry.id} entry={entry} rank={index + 1} />)}</ol></div></section> : <div className="mt-9 flex min-h-72 flex-col items-center justify-center border-y text-center"><SearchIcon className="size-10" /><h2 className="mt-5 font-heading text-3xl font-bold uppercase">No specialists found</h2><p className="mt-2 text-sm text-muted-foreground">Try adjusting your search or league filter.</p><button type="button" onClick={reset} className="mt-6 inline-flex h-10 items-center gap-2 border px-4 text-sm font-semibold hover:bg-foreground hover:text-background"><RotateCcwIcon className="size-4" />Clear filters</button></div>}
    </main>
  );
}

function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <div className="min-w-0 max-w-full"><span className="mb-2 block text-xs font-bold uppercase">{label}</span><div className="max-w-[calc(100vw-2.5rem)] overflow-x-auto pb-1 lg:max-w-none">{children}</div></div>; }

function SpecialistRow({ entry, rank }: { entry: SpecialistDirectoryEntry; rank: number }) {
  const accuracy = entry.settledPicks ? (entry.wins / entry.settledPicks) * 100 : 0;
  return <li className="grid gap-3 border-b px-4 py-5 last:border-b-0 lg:grid-cols-[48px_1.3fr_1fr_.7fr_.8fr_.8fr_.7fr_.7fr_auto] lg:items-center lg:gap-4"><span className="font-heading text-2xl text-muted-foreground">{rank}</span><span className="flex items-center gap-3"><Avatar><AvatarFallback>{entry.initials}</AvatarFallback></Avatar><strong>{entry.name}</strong></span><Link href={`/leagues/${entry.leagueSlug}`} className="font-semibold hover:text-primary">{entry.leagueName}</Link><strong className="font-heading text-3xl text-primary">{accuracy.toFixed(1)}%</strong><span>{entry.wins}–{entry.losses}</span><span>{entry.settledPicks} locks</span><span>{entry.currentWinStreak}W</span><span className="flex items-center gap-2"><UsersRoundIcon className="size-4" />{entry.followers}</span><Link href={`/specialists/${entry.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 border border-foreground px-4 text-sm font-semibold hover:bg-foreground hover:text-background">View profile<ArrowRightIcon className="size-4" /></Link></li>;
}
