import Link from "next/link";
import { CheckIcon, FlagIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SpecialistProfileData } from "@/data/specialists";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";

export function ProvisionalProgress({ leagues }: { leagues: SpecialistProfileData["leagues"] }) {
  const provisional = leagues.filter((league) => !league.followable);
  const established = leagues.filter((league) => league.followable);

  return <section className="mb-8 border border-foreground" aria-labelledby="specialist-path-heading">
    <header className="grid gap-4 border-b bg-muted p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-7">
      <div><p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-primary uppercase"><FlagIcon aria-hidden="true" className="size-4" />First-season progress</p><h2 id="specialist-path-heading" className="mt-2 font-heading text-4xl leading-none font-extrabold uppercase sm:text-5xl">Build evidence. Earn your rank.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Each league needs {MINIMUM_SETTLED_PICKS_FOR_RANK} settled independent Daily Locks before your record can enter specialist rankings. Followed calls never count toward this progress.</p></div>
      <Link href="/leagues?intent=prove" className="inline-flex h-11 items-center justify-center bg-primary px-5 font-semibold text-primary-foreground">Make the next lock</Link>
    </header>
    {leagues.length ? <div className="divide-y">{leagues.map((league) => {
      const settled = Math.min(league.settledPicks, MINIMUM_SETTLED_PICKS_FOR_RANK);
      const remaining = Math.max(0, MINIMUM_SETTLED_PICKS_FOR_RANK - league.settledPicks);
      const percentage = Math.round((settled / MINIMUM_SETTLED_PICKS_FOR_RANK) * 100);
      return <article key={league.id} className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"><div><div className="flex flex-wrap items-center justify-between gap-3"><Link href={`/leagues/${league.slug}`} className="font-bold hover:text-primary">{league.name}</Link>{league.followable ? <Badge><CheckIcon data-icon="inline-start" />Rank eligible</Badge> : <span className="text-sm font-semibold">{remaining} lock{remaining === 1 ? "" : "s"} to go</span>}</div><div className="mt-3 h-2 overflow-hidden bg-muted" role="progressbar" aria-label={`${league.name} ranking eligibility`} aria-valuemin={0} aria-valuemax={MINIMUM_SETTLED_PICKS_FOR_RANK} aria-valuenow={settled}><div className="h-full bg-primary motion-reduce:transition-none" style={{ width: `${percentage}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{league.settledPicks} of {MINIMUM_SETTLED_PICKS_FOR_RANK} settled independent locks · {league.wins} correct, {league.losses} missed</p></div>{league.followable ? <strong className="font-heading text-3xl text-primary">Eligible</strong> : <strong className="font-heading text-3xl">{percentage}%</strong>}</article>;
    })}</div> : <div className="p-6 sm:p-8"><strong className="font-heading text-3xl uppercase">Your first result starts the record.</strong><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Choose a league you know, submit one near-certain Daily Lock, and this dashboard will track every settled step toward ranking eligibility.</p></div>}
    <footer className="flex flex-wrap gap-x-6 gap-y-2 border-t bg-muted/40 px-5 py-4 text-sm"><span><strong>{provisional.length}</strong> provisional league{provisional.length === 1 ? "" : "s"}</span><span><strong>{established.length}</strong> rank-eligible league{established.length === 1 ? "" : "s"}</span></footer>
  </section>;
}
