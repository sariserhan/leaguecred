import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArchiveIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSeasonArchive } from "@/data/member-planning";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Season archive" };

export default async function SeasonsPage() {
  const session = await getSession(); if (!session) redirect("/auth?next=/seasons");
  const records = await getSeasonArchive(session.user.id);
  return <div className="page-shell py-10 sm:py-16"><header className="border-b pb-8"><ArchiveIcon className="size-7 text-primary" /><h1 className="mt-5 font-heading text-[clamp(3.5rem,7vw,6.5rem)] leading-[.88] font-extrabold uppercase">Season archive.</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">Your final records and evidence, season by season.</p></header>{records.length ? <div className="mt-8 divide-y border-y">{records.map((record) => { const accuracy=record.settled_picks?Math.round(record.wins/record.settled_picks*100):0; return <article key={record.id} className="grid gap-5 px-5 py-6 lg:grid-cols-[1fr_repeat(4,auto)] lg:items-center lg:gap-10"><div><div className="flex items-center gap-2"><Link href={`/leagues/${record.slug}`} className="font-heading text-3xl font-bold uppercase hover:text-primary">{record.league}</Link>{record.current?<Badge>Current</Badge>:null}</div><p className="text-sm text-muted-foreground">{record.season}</p></div><Metric label="Record" value={`${record.wins}–${record.losses}`} /><Metric label="Accuracy" value={`${accuracy}%`} accent /><Metric label="Evidence" value={`${record.settled_picks} locks`} /><Metric label="Adjusted" value={`${(record.adjusted*100).toFixed(1)}%`} /></article>; })}</div> : <div className="mt-8 border p-10 text-center"><TrendingUpIcon className="mx-auto size-7 text-primary" /><h2 className="mt-3 font-heading text-3xl font-bold uppercase">Your first season is underway</h2><p className="mt-2 text-muted-foreground">Settled Daily Locks will build your archive.</p></div>}</div>;
}
function Metric({label,value,accent=false}:{label:string;value:string;accent?:boolean}){return <div><span className="block text-xs font-bold uppercase text-muted-foreground">{label}</span><strong className={accent?"font-heading text-3xl text-primary":"font-heading text-3xl"}>{value}</strong></div>}
