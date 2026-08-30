import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, LockKeyholeIcon, UsersRoundIcon } from "lucide-react";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { WeeklySlipEntry } from "@/data/weekly-slip";
import { getWeeklySlip } from "@/data/weekly-slip";
import { getSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your Weekly Slip",
  description: "Your independent Weekly Locks and followed specialist calls in one place.",
};

function TeamLogo({ entry }: { entry: WeeklySlipEntry }) {
  return entry.selectedTeam.logoUrl ? (
    <Image src={entry.selectedTeam.logoUrl} alt="" width={40} height={40} className="size-10 object-contain" />
  ) : <span className="flex size-10 items-center justify-center bg-muted text-xs font-bold">{entry.selectedTeam.name.slice(0, 3).toUpperCase()}</span>;
}

function ResultBadge({ result }: { result: WeeklySlipEntry["result"] }) {
  const labels = { pending: "Awaiting result", win: "Correct", loss: "Missed", void: "Void" };
  const variants = { pending: "secondary", win: "default", loss: "destructive", void: "outline" } as const;
  return <Badge variant={variants[result]}>{labels[result]}</Badge>;
}

function SlipEntryCard({ entry }: { entry: WeeklySlipEntry }) {
  const kickoff = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(entry.kickoff));
  const score = entry.fixture.homeScore === null || entry.fixture.awayScore === null ? null : `${entry.fixture.homeScore}–${entry.fixture.awayScore}`;
  return (
    <article className="grid gap-4 border p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <TeamLogo entry={entry} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><Link href={`/leagues/${entry.league.slug}`} className="font-semibold hover:text-primary">{entry.league.name}</Link><Badge variant={entry.path === "independent" ? "default" : "outline"}>{entry.path === "independent" ? "Your lock" : "Following"}</Badge></div>
        <strong className="mt-1 block text-lg">{entry.selectedTeam.name}</strong>
        <p className="mt-1 text-sm text-muted-foreground">{entry.fixture.home} vs {entry.fixture.away} · {kickoff}</p>
        {entry.specialist ? <p className="mt-1 text-sm text-muted-foreground">Call from <Link href={`/specialists/${entry.specialist.id}`} className="font-semibold text-foreground hover:text-primary hover:underline">{entry.specialist.name}</Link></p> : null}
      </div>
      <div className="flex items-center gap-3 sm:flex-col sm:items-end"><strong className="font-heading text-3xl">{score ?? "—"}</strong><ResultBadge result={entry.result} /></div>
    </article>
  );
}

export default async function WeeklySlipPage() {
  const session = await getSession();
  if (!session) redirect("/auth");
  const data = await getWeeklySlip(session.user.id);
  const accuracy = data.summary.independentDecisions === 0 ? null : Math.round((data.summary.independentWins / data.summary.independentDecisions) * 100);

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="border-b border-foreground bg-foreground px-5 py-8 text-background sm:px-8 sm:py-10">
        <p className="font-semibold text-primary">Your cross-league record</p>
        <h1 className="mt-2 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">Weekly Slip</h1>
        <p className="mt-4 max-w-2xl text-background/75">Your own confident calls and the specialists you chose to follow—always shown separately.</p>
      </header>

      <section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-4" aria-label="Weekly Slip statistics">
        {[["Active calls", data.summary.activeLocks], ["Your locks", data.summary.independentLocks], ["Followed calls", data.summary.followedCalls], ["Your accuracy", accuracy === null ? "—" : `${accuracy}%`]].map(([label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><strong className="block font-heading text-4xl leading-none">{value}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></div>)}
      </section>

      <section className="mt-7" aria-labelledby="active-heading">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="active-heading" className="section-title">On your slip</h2><p className="mt-2 text-muted-foreground">These calls are still awaiting their final result.</p></div><LockKeyholeIcon aria-hidden="true" className="size-7 text-primary" /></div>
        {data.active.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{data.active.map((entry) => <SlipEntryCard key={`${entry.path}:${entry.id}`} entry={entry} />)}</div> : <div className="border p-8 text-center"><CheckIcon aria-hidden="true" className="mx-auto size-7 text-primary" /><h3 className="mt-3 font-heading text-3xl font-bold uppercase">Your slip is clear</h3><p className="mx-auto mt-2 max-w-lg text-muted-foreground">Pick one team from the league you truly know, or follow a proven specialist from another league.</p><Link href="/leagues" className={cn(buttonVariants({ size: "lg" }), "mt-5")}><ArrowRightIcon data-icon="inline-start" />Explore leagues</Link></div>}
      </section>

      <section className="mt-10" aria-labelledby="completed-heading">
        <div className="mb-4 flex items-end justify-between gap-4"><div><h2 id="completed-heading" className="section-title">Recent results</h2><p className="mt-2 text-muted-foreground">Your latest completed independent locks and followed calls.</p></div><UsersRoundIcon aria-hidden="true" className="size-7 text-primary" /></div>
        {data.completed.length > 0 ? <div className="grid gap-3 lg:grid-cols-2">{data.completed.map((entry) => <SlipEntryCard key={`${entry.path}:${entry.id}`} entry={entry} />)}</div> : <p className="border p-6 text-muted-foreground">Completed calls will appear here after their fixtures are settled.</p>}
      </section>
    </div>
  );
}
