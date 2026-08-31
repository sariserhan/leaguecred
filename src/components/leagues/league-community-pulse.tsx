import Link from "next/link";
import { ArrowRightIcon, CrownIcon, UsersRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { LeagueCommunitySummary } from "@/data/distribution";

export function LeagueCommunityPulse({ leagueName, data }: { leagueName: string; data: LeagueCommunitySummary }) {
  const founding = data.members < 25;
  return <section className="border" aria-labelledby="community-heading"><header className="grid gap-5 border-b p-5 sm:grid-cols-[1fr_auto] sm:items-end"><div><div className="flex flex-wrap items-center gap-2"><h2 id="community-heading" className="font-heading text-3xl font-bold uppercase">{leagueName} community</h2>{founding?<Badge>Founding now</Badge>:null}</div><p className="mt-2 text-sm text-muted-foreground">Supporters representing their clubs and building one transparent league record.</p></div><Link href="/challenges" className={buttonVariants({variant:"outline"})}>Open community challenge<ArrowRightIcon data-icon="inline-end"/></Link></header>
    <div className="grid sm:grid-cols-4">{[["Members",data.members],["Active this week",data.active],["Permanent locks",data.locks],["Captains",data.captains]].map(([label,value])=><div key={label} className="border-b p-4 last:border-b-0 sm:border-r sm:border-b-0"><strong className="block font-heading text-4xl">{value}</strong><span className="text-xs text-muted-foreground">{label}</span></div>)}</div>
    {data.teams.length?<div className="flex flex-wrap items-center gap-2 border-t p-4"><span className="mr-2 text-xs font-bold uppercase text-muted-foreground">Represented clubs</span>{data.teams.map((team)=><Link key={team.slug} href={`/teams/${team.slug}`}><Badge variant="outline">{team.name} · {team.members}</Badge></Link>)}</div>:<div className="grid gap-4 border-t p-6 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex gap-3"><UsersRoundIcon className="size-6 text-primary"/><div><strong className="block">Be one of the first {leagueName} representatives.</strong><p className="mt-1 text-sm text-muted-foreground">Choose your club, make a genuine lock, and help this community reach its first 25 active members.</p></div></div><Link href="/onboarding" className={buttonVariants()}><CrownIcon data-icon="inline-start"/>Represent your club</Link></div>}
  </section>;
}
