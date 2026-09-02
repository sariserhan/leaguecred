import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, LockKeyholeIcon, UsersRoundIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LockCountdown } from "@/components/lock-countdown";
import { LockTimeline } from "@/components/slip/lock-timeline";
import type { WeeklySlipEntry } from "@/data/weekly-slip";
import { getWeeklySlip } from "@/data/weekly-slip";
import { getSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";
import { Crest } from "@/components/ui/crest";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Your Weekly Slip",
  description: "Your independent Daily Locks and followed specialist calls in one place.",
  robots: { index: false, follow: false },
};

function TeamLogo({ entry }: { entry: WeeklySlipEntry }) {
  return entry.selectedTeam.logoUrl ? (
    <Crest src={entry.selectedTeam.logoUrl} size={40} />
  ) : <span className="flex size-10 items-center justify-center bg-muted text-xs font-bold">{entry.selectedTeam.name.slice(0, 3).toUpperCase()}</span>;
}

function ResultBadge({ result }: { result: WeeklySlipEntry["result"] }) {
  const labels = { pending: "Awaiting result", win: "Correct", loss: "Missed", void: "Void" };
  const variants = { pending: "secondary", win: "default", loss: "destructive", void: "outline" } as const;
  return <Badge variant={variants[result]}>{labels[result]}</Badge>;
}

function SlipEntryCard({ entry, now }: { entry: WeeklySlipEntry; now: string }) {
  const kickoff = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(entry.kickoff));
  const score = entry.fixture.homeScore === null || entry.fixture.awayScore === null ? null : `${entry.fixture.homeScore}–${entry.fixture.awayScore}`;
  return (
    <article className="grid gap-4 border p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <TeamLogo entry={entry} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><Link href={`/leagues/${entry.league.slug}`} className="font-semibold hover:text-primary">{entry.league.name}</Link><Badge variant={entry.path === "independent" ? "default" : "outline"}>{entry.path === "independent" ? "Your lock" : "Following"}</Badge></div>
        <strong className="mt-1 block text-lg">{entry.selectedTeam.name}</strong>
        <p className="mt-1 text-sm text-muted-foreground">{entry.fixture.home} vs {entry.fixture.away} · {kickoff}</p>
        {entry.specialist ? <p className="mt-1 text-sm text-muted-foreground">Call from <Link href={`/specialists/${entry.specialist.handle ?? entry.specialist.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">{entry.specialist.name}</Link></p> : null}
        <LockTimeline entry={entry} now={now} />
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end"><strong className="font-heading text-3xl">{score ?? "—"}</strong><ResultBadge result={entry.result} /></div>
    </article>
  );
}

function groupByMatchweek(entries: WeeklySlipEntry[]) {
  const groups = new Map<string, WeeklySlipEntry[]>();
  for (const entry of entries) {
    const key = `${entry.league.name} · ${entry.matchweek}`;
    const current = groups.get(key);
    if (current) current.push(entry);
    else groups.set(key, [entry]);
  }
  return [...groups];
}

function SlipGroups({ entries, now, active = false }: { entries: WeeklySlipEntry[]; now: string; active?: boolean }) {
  return <div className="grid gap-6">{groupByMatchweek(entries).map(([label, group]) => <section key={label} className="border" aria-label={label}><header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted px-4 py-3"><div><h3 className="font-heading text-2xl font-bold uppercase">{label}</h3><p className="text-xs text-muted-foreground">{group.length} call{group.length === 1 ? "" : "s"}</p></div>{active ? <LockCountdown lockAt={group[0].lockAt} compact /> : null}</header><div className="grid gap-px bg-border lg:grid-cols-2">{group.map((entry) => <div key={`${entry.path}:${entry.id}`} className="bg-background"><SlipEntryCard entry={entry} now={now} /></div>)}</div></section>)}</div>;
}

export default async function WeeklySlipPage() {
  const session = await getSession();
  if (!session) redirect("/auth");
  const data = await getWeeklySlip(session.user.id);
  const now = new Date().toISOString();
  const accuracy = data.summary.independentDecisions === 0 ? null : Math.round((data.summary.independentWins / data.summary.independentDecisions) * 100);

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="border-b border-inverted bg-inverted px-5 py-8 text-inverted-foreground sm:px-8 sm:py-10">
        <p className="font-semibold text-primary">Your cross-league record</p>
        <h1 className="mt-2 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">Weekly Slip</h1>
        <p className="mt-4 max-w-2xl text-inverted-foreground/75">Your own confident calls and the specialists you chose to follow—always shown separately.</p>
      </header>

      <section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-4" aria-label="Weekly Slip statistics">
        {[["Active calls", data.summary.activeLocks], ["Your locks", data.summary.independentLocks], ["Followed calls", data.summary.followedCalls], ["Your accuracy", accuracy === null ? "—" : `${accuracy}%`]].map(([label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><strong className="block font-heading text-4xl leading-none">{value}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></div>)}
      </section>

      <section className="mt-7" aria-labelledby="active-heading">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="active-heading" className="section-title">Locked and waiting</h2><p className="mt-2 text-muted-foreground">Calls you have already made, still awaiting their final result. Matches you are only considering sit in the slip at the side of the page.</p></div><LockKeyholeIcon aria-hidden="true" className="size-7 text-primary" /></div>
        {data.active.length > 0 ? <SlipGroups entries={data.active} now={now} active /> : <div className="border p-8 text-center"><CheckIcon aria-hidden="true" className="mx-auto size-7 text-primary" /><h3 className="mt-3 font-heading text-3xl font-bold uppercase">Your slip is clear</h3><p className="mx-auto mt-2 max-w-lg text-muted-foreground">Pick one team from the league you truly know, or follow a proven specialist from another league.</p><Link href="/leagues" className={cn(buttonVariants({ size: "lg" }), "mt-5")}><ArrowRightIcon data-icon="inline-start" />Explore leagues</Link></div>}
      </section>

      <section className="mt-10" aria-labelledby="completed-heading">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="completed-heading" className="section-title">Recent results</h2><p className="mt-2 text-muted-foreground">Your latest completed independent locks and followed calls.</p></div><UsersRoundIcon aria-hidden="true" className="size-7 text-primary" /></div>
        {data.completed.length > 0 ? <SlipGroups entries={data.completed} now={now} /> : <p className="border p-6 text-muted-foreground">Completed calls will appear here after their fixtures are settled.</p>}
      </section>
    </div>
  );
}
