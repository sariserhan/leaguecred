import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2Icon, Share2Icon, UsersRoundIcon, XCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getWeeklyRecap } from "@/data/distribution";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Weekly recap", description: "The transparent weekly record across LeagueCred communities.", alternates: { canonical: "/recaps" } };

export default async function RecapsPage() {
  const data = await getWeeklyRecap();
  const decisions = data.totals.wins + data.totals.losses;
  return <main>
    <header className="border-b bg-inverted text-inverted-foreground"><div className="page-shell py-10 sm:py-14"><h1 className="font-heading text-[clamp(3.8rem,9vw,8rem)] leading-[.84] font-extrabold uppercase">This week, honestly.</h1><div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-inverted-foreground/70"><span>{data.from} → {data.to}</span><span>{data.totals.specialists} participating specialists</span><span>Wins and misses included</span></div></div></header>
    <div className="page-shell py-8 sm:py-12">
      <section className="grid border sm:grid-cols-2 lg:grid-cols-4" aria-label="Weekly totals">{[["Daily Locks",data.totals.locks],["Correct",data.totals.wins],["Missed",data.totals.losses],["Accuracy",decisions?`${Math.round(data.totals.wins/decisions*100)}%`:"—"]].map(([label,value])=><div key={label} className="border-b p-5 last:border-b-0 sm:border-r lg:border-b-0"><strong className="block font-heading text-5xl">{value}</strong><span className="text-sm text-muted-foreground">{label}</span></div>)}</section>
      <section className="mt-7 grid gap-7 lg:grid-cols-[.9fr_1.1fr]">
        <div className="border"><header className="border-b p-5"><h2 className="font-heading text-3xl font-bold uppercase">League table</h2><p className="mt-1 text-sm text-muted-foreground">Settled decisions from the last seven days.</p></header>{data.leagues.length ? <ol className="divide-y">{data.leagues.map((league,index)=><li key={league.slug} className="grid grid-cols-[auto_1fr_auto] items-center gap-4 p-4"><strong className="font-heading text-2xl text-primary">{index+1}</strong><div><Link href={`/leagues/${league.slug}`} className="font-bold hover:text-primary">{league.name}</Link><p className="text-xs text-muted-foreground">{league.wins} correct · {league.losses} missed · {league.locks} locks</p></div><strong className="font-heading text-3xl">{league.wins+league.losses?`${league.accuracy}%`:"—"}</strong></li>)}</ol> : <p className="p-8 text-center text-sm text-muted-foreground">No calls have settled during this recap window yet.</p>}</div>
        <div className="border"><header className="flex items-end justify-between gap-4 border-b p-5"><div><h2 className="font-heading text-3xl font-bold uppercase">The complete record</h2><p className="mt-1 text-sm text-muted-foreground">Recent outcomes without cherry-picking.</p></div><Share2Icon className="size-6 text-primary" /></header>{data.calls.length ? <div className="divide-y">{data.calls.map((call)=><article key={call.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><strong>{call.supporter} · {call.team}</strong><p className="mt-1 text-xs text-muted-foreground">{call.league}{call.reason?` — ${call.reason}`:""}</p></div><Badge variant={call.result==="win"?"default":"destructive"}>{call.result==="win"?<CheckCircle2Icon data-icon="inline-start"/>:<XCircleIcon data-icon="inline-start"/>}{call.result}</Badge></article>)}</div> : <div className="p-10 text-center"><UsersRoundIcon className="mx-auto size-8 text-primary"/><h3 className="mt-3 font-heading text-3xl font-bold uppercase">A transparent recap needs real calls</h3><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Results will appear here after the founding community&apos;s first locks settle.</p></div>}</div>
      </section>
      <section className="mt-7 grid gap-5 border bg-inverted p-6 text-inverted-foreground sm:grid-cols-[1fr_auto] sm:items-center"><div><h2 className="font-heading text-4xl font-bold uppercase">Build next week&apos;s record.</h2><p className="mt-2 text-inverted-foreground/70">One selective call from the league you genuinely follow. Completely free.</p></div><Link href="/leagues?intent=prove" className={buttonVariants({size:"lg"})}>Make a Daily Lock</Link></section>
    </div>
  </main>;
}
