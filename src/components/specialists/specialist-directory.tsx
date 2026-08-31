"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, GitCompareArrowsIcon, RotateCcwIcon, SearchIcon, SlidersHorizontalIcon, UsersRoundIcon, XIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { SpecialistDirectoryEntry } from "@/data/specialists";
import { cn } from "@/lib/utils";

const sorts = ["Confidence-adjusted", "Accuracy", "Evidence", "Followers"] as const;
type Sort = (typeof sorts)[number];

export function SpecialistDirectory({ specialists, initialLeague, rankThreshold }: { specialists: SpecialistDirectoryEntry[]; initialLeague?: string; rankThreshold: number }) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [league, setLeague] = useState(() => initialLeague && specialists.some((entry) => entry.leagueName === initialLeague) ? initialLeague : "All leagues");
  const [sort, setSort] = useState<Sort>("Confidence-adjusted");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparedIds, setComparedIds] = useState<string[]>([]);
  const leagues = useMemo(() => ["All leagues", ...new Set(specialists.map((entry) => entry.leagueName))], [specialists]);
  const compared = specialists.filter((entry) => comparedIds.includes(entry.id));
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLocaleLowerCase();
    return specialists.filter((entry) => (!needle || entry.name.toLocaleLowerCase().includes(needle) || entry.leagueName.toLocaleLowerCase().includes(needle)) && (league === "All leagues" || entry.leagueName === league)).toSorted((a, b) => {
      if (a.provisional !== b.provisional) return a.provisional ? 1 : -1;
      if (sort === "Accuracy") return (b.wins / b.settledPicks) - (a.wins / a.settledPicks);
      if (sort === "Evidence") return b.settledPicks - a.settledPicks;
      if (sort === "Followers") return b.followers - a.followers;
      return b.confidenceAdjustedAccuracy - a.confidenceAdjustedAccuracy;
    });
  }, [deferredQuery, league, sort, specialists]);
  function reset() { setQuery(""); setLeague("All leagues"); setSort("Confidence-adjusted"); }
  function toggleCompare(id: string) { setComparedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : current); }

  return (
    <div className={cn("page-shell py-14 sm:py-20", compared.length > 0 && "pb-36")}>
      <header className="max-w-4xl"><h1 className="font-heading text-[clamp(3.5rem,7vw,7rem)] leading-[0.88] font-extrabold uppercase">Find proven specialists.</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">Compare verified records across leagues. Follow specialists only where their independent evidence is established.</p></header>
      <section className="mt-10 max-w-full border-y py-6" aria-label="Specialist filters">
        <label className="relative block"><span className="sr-only">Search specialists or leagues</span><SearchIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search specialists or leagues" className="h-14 rounded-none pl-12 text-base" /></label>
        <div className="mt-4 grid grid-cols-2 gap-2 lg:hidden"><Button variant="outline" onClick={() => setFiltersOpen(true)}><SlidersHorizontalIcon data-icon="inline-start" />Filter{league !== "All leagues" ? " · 1" : ""}</Button><Button variant="outline" onClick={() => setFiltersOpen(true)}><GitCompareArrowsIcon data-icon="inline-start" />Sort</Button></div>
        <div className="mt-5 hidden gap-5 lg:grid lg:grid-cols-2"><Filter label="League"><FilterOptions items={leagues} value={league} onChange={setLeague} /></Filter><Filter label="Sort by"><FilterOptions items={[...sorts]} value={sort} onChange={(value) => setSort(value as Sort)} /></Filter></div>
      </section>
      {specialists.some((entry) => entry.provisional) ? <div className="mt-8 border border-primary p-5"><div className="flex flex-wrap items-center gap-2"><Badge>Founding season</Badge><strong>Evidence is still forming</strong></div><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Provisional records remain visible so early contributors have a path forward, but they cannot be followed or publicly ranked until they reach {rankThreshold} settled independent Weekly Locks.</p></div> : null}
      {filtered.length ? <section className="mt-9" aria-labelledby="ranking-heading"><div className="flex items-end justify-between gap-4"><h2 id="ranking-heading" className="font-heading text-3xl font-bold uppercase">Specialist records</h2><span className="text-sm text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</span></div><div className="mt-3 border-y"><div className="hidden grid-cols-[48px_1.3fr_1fr_.7fr_.8fr_.8fr_.7fr_.7fr_auto_auto] gap-4 border-b bg-muted px-4 py-3 text-xs font-bold uppercase text-muted-foreground lg:grid"><span>#</span><span>Specialist</span><span>Strongest league</span><span>Accuracy</span><span>Record</span><span>Evidence</span><span>Streak</span><span>Followers</span><span>View</span><span>Compare</span></div><ol>{filtered.map((entry, index) => <SpecialistRow key={entry.id} entry={entry} rank={index + 1} selected={comparedIds.includes(entry.id)} compareFull={comparedIds.length >= 3} onCompare={() => toggleCompare(entry.id)} rankThreshold={rankThreshold} />)}</ol></div></section> : <div className="mt-9 flex min-h-72 flex-col items-center justify-center border-y text-center"><SearchIcon className="size-10" /><h2 className="mt-5 font-heading text-3xl font-bold uppercase">No records found</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">No independent Weekly Locks match these filters yet. Clear filters or become this league&apos;s first contributor.</p><Button variant="outline" onClick={reset} className="mt-6"><RotateCcwIcon data-icon="inline-start" />Clear filters</Button></div>}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}><DialogContent className="max-w-lg rounded-none"><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">Filter and sort</DialogTitle><DialogDescription>Narrow the specialist directory without scrolling wide control rows.</DialogDescription></DialogHeader><div className="grid gap-6"><Filter label="League"><FilterOptions items={leagues} value={league} onChange={setLeague} wrap /></Filter><Filter label="Sort by"><FilterOptions items={[...sorts]} value={sort} onChange={(value) => setSort(value as Sort)} wrap /></Filter></div><DialogFooter><Button variant="outline" onClick={reset}>Reset</Button><Button onClick={() => setFiltersOpen(false)}>Show {filtered.length} results</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}><DialogContent className="rounded-none sm:max-w-3xl"><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">Specialist comparison</DialogTitle><DialogDescription>Independent evidence, shown side by side.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{compared.map((entry) => <ComparisonCard key={entry.id} entry={entry} />)}</div></DialogContent></Dialog>
      {compared.length ? <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-primary bg-foreground text-background"><div className="page-shell flex min-h-24 items-center gap-3 py-3"><div className="mr-auto"><strong className="font-heading text-2xl uppercase">Compare {compared.length}</strong><p className="hidden text-xs text-background/70 sm:block">Select up to three specialists.</p></div>{compared.map((entry) => <button key={entry.id} type="button" onClick={() => toggleCompare(entry.id)} className="hidden items-center gap-2 border border-background/25 px-3 py-2 text-sm sm:flex"><Avatar className="size-7"><AvatarFallback>{entry.initials}</AvatarFallback></Avatar>{entry.name}<XIcon className="size-4" /></button>)}<Button disabled={compared.length < 2} onClick={() => setCompareOpen(true)}><GitCompareArrowsIcon data-icon="inline-start" />Compare</Button></div></aside> : null}
    </div>
  );
}

function FilterOptions({ items, value, onChange, wrap = false }: { items: string[]; value: string; onChange: (value: string) => void; wrap?: boolean }) { return <ToggleGroup value={[value]} onValueChange={(values) => values[0] && onChange(values[0])} variant="outline" spacing={0} className={cn(wrap ? "flex flex-wrap" : "w-max")}>{items.map((item) => <ToggleGroupItem key={item} value={item} className="rounded-none px-4">{item}</ToggleGroupItem>)}</ToggleGroup>; }
function Filter({ label, children }: { label: string; children: React.ReactNode }) { return <div className="min-w-0 max-w-full"><span className="mb-2 block text-xs font-bold uppercase">{label}</span><div className="max-w-full overflow-x-auto pb-1">{children}</div></div>; }

function SpecialistRow({ entry, rank, selected, compareFull, onCompare, rankThreshold }: { entry: SpecialistDirectoryEntry; rank: number; selected: boolean; compareFull: boolean; onCompare: () => void; rankThreshold: number }) {
  const accuracy = entry.settledPicks ? (entry.wins / entry.settledPicks) * 100 : 0;
  const metrics = [["Accuracy", `${accuracy.toFixed(1)}%`], ["Record", `${entry.wins}–${entry.losses}`], ["Evidence", `${entry.settledPicks} locks`], ["Streak", `${entry.currentWinStreak}W`], ["Followers", String(entry.followers)]];
  return <li className="grid gap-4 border-b px-4 py-5 last:border-b-0 lg:grid-cols-[48px_1.3fr_1fr_.7fr_.8fr_.8fr_.7fr_.7fr_auto_auto] lg:items-center lg:gap-4"><span className="font-heading text-2xl text-muted-foreground">{entry.provisional ? "—" : rank}</span><span className="flex items-center gap-3"><Avatar><AvatarFallback>{entry.initials}</AvatarFallback></Avatar><span><strong className="block">{entry.name}</strong>{entry.provisional ? <Badge variant="outline">Provisional · {rankThreshold - entry.settledPicks} to rank</Badge> : null}</span></span><Link href={`/leagues/${entry.leagueSlug}`} className="font-semibold hover:text-primary">{entry.leagueName}</Link><dl className="col-span-full grid grid-cols-2 gap-x-4 gap-y-3 border-y py-3 sm:grid-cols-5 lg:contents">{metrics.map(([label, value], index) => <div key={label}><dt className="text-[10px] font-bold uppercase text-muted-foreground lg:sr-only">{label}</dt><dd className={cn(index === 0 && "font-heading text-3xl font-bold text-primary", index === 4 && "flex items-center gap-2")}>{index === 4 ? <UsersRoundIcon className="size-4" /> : null}{value}</dd></div>)}</dl><Link href={`/specialists/${entry.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 border border-foreground px-4 text-sm font-semibold hover:bg-foreground hover:text-background">View profile<ArrowRightIcon className="size-4" /></Link><Button variant={selected ? "default" : "outline"} size="sm" disabled={entry.provisional || (!selected && compareFull)} onClick={onCompare} aria-pressed={selected}>{entry.provisional ? "Building record" : selected ? <><CheckIcon data-icon="inline-start" />Selected</> : <><GitCompareArrowsIcon data-icon="inline-start" />Compare</>}</Button></li>;
}

function ComparisonCard({ entry }: { entry: SpecialistDirectoryEntry }) { const accuracy = entry.settledPicks ? (entry.wins / entry.settledPicks) * 100 : 0;const metrics=[['Accuracy',accuracy,100,`${accuracy.toFixed(1)}%`],['Adjusted',entry.confidenceAdjustedAccuracy*100,100,`${(entry.confidenceAdjustedAccuracy*100).toFixed(1)}%`],['Evidence',entry.settledPicks,50,`${entry.settledPicks} locks`],['Current form',entry.currentWinStreak,10,`${entry.currentWinStreak}W`]] as const;return <article className="border p-5"><div className="flex items-center gap-3"><Avatar><AvatarFallback>{entry.initials}</AvatarFallback></Avatar><div><strong>{entry.name}</strong><p className="text-sm text-muted-foreground">{entry.leagueName}</p></div></div><dl className="mt-5 grid gap-4">{metrics.map(([label,value,max,text])=><div key={label}><div className="flex justify-between text-xs"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold">{text}</dd></div><div className="mt-1 h-2 bg-muted"><span className="block h-full bg-primary" style={{width:`${Math.min(100,value/max*100)}%`}}/></div></div>)}<div className="flex justify-between border-t pt-3"><dt className="text-xs text-muted-foreground">Followers</dt><dd className="font-semibold">{entry.followers}</dd></div></dl><Link href={`/specialists/${entry.id}`} className="mt-5 flex items-center gap-2 font-semibold hover:text-primary">Open profile<ArrowRightIcon className="size-4" /></Link></article>; }
