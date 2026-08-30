"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckIcon, FlameIcon, UserPlusIcon, UsersRoundIcon } from "lucide-react";

import { followSpecialist } from "@/app/leagues/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SpecialistProfileData } from "@/data/specialists";

function ResultBadge({ result }: { result: "win" | "loss" | "void" }) {
  const variants = { win: "default", loss: "destructive", void: "outline" } as const;
  const labels = { win: "Correct", loss: "Missed", void: "Void" };
  return <Badge variant={variants[result]}>{labels[result]}</Badge>;
}

export function SpecialistProfile({ data }: { data: SpecialistProfileData }) {
  const [followedLeagueIds, setFollowedLeagueIds] = useState(() => new Set(data.leagues.filter((league) => league.followedByViewer).map((league) => league.id)));
  const [pendingLeagueId, setPendingLeagueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const accuracy = data.totals.settledPicks === 0 ? 0 : (data.totals.wins / data.totals.settledPicks) * 100;

  function followLeague(leagueId: string) {
    startTransition(async () => {
      setPendingLeagueId(leagueId);
      setError(null);
      const result = await followSpecialist(data.specialist.id, leagueId);
      if (result.ok) setFollowedLeagueIds((current) => new Set(current).add(leagueId));
      else setError(result.message);
      setPendingLeagueId(null);
    });
  }

  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="border-b border-foreground bg-foreground px-5 py-8 text-background sm:px-8 sm:py-10">
        <p className="font-semibold text-primary">Public specialist profile</p>
        <div className="mt-4 flex flex-wrap items-center gap-5"><span className="flex size-20 items-center justify-center rounded-full bg-background font-heading text-3xl font-bold text-foreground">{data.specialist.initials}</span><div><h1 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">{data.specialist.name}</h1><p className="mt-2 flex items-center gap-2 text-background/75"><UsersRoundIcon aria-hidden="true" className="size-4 text-primary" />{data.specialist.followers} follower{data.specialist.followers === 1 ? "" : "s"}</p></div></div>
      </header>

      <section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-4" aria-label="Specialist summary">
        {[["Career accuracy", `${accuracy.toFixed(1)}%`], ["Career record", `${data.totals.wins}–${data.totals.losses}`], ["Evidence", `${data.totals.settledPicks} locks`], ["Best active streak", `${data.totals.bestWinStreak}W`]].map(([label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><strong className="block font-heading text-4xl leading-none">{value}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></div>)}
      </section>

      {error ? <p className="mt-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_390px]">
        <section className="border" aria-labelledby="leagues-heading">
          <div className="border-b px-5 py-4"><h2 id="leagues-heading" className="font-heading text-2xl font-bold uppercase">Proven leagues</h2><p className="mt-1 text-sm text-muted-foreground">Follow a specialist only in the league where their evidence is established.</p></div>
          <div className="divide-y">
            {data.leagues.map((league) => {
              const followed = followedLeagueIds.has(league.id);
              const accuracy = league.settledPicks === 0 ? 0 : (league.wins / league.settledPicks) * 100;
              return <article key={league.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><Link href={`/leagues/${league.slug}`} className="font-bold hover:text-primary">{league.name}</Link><p className="mt-1 text-sm text-muted-foreground">{accuracy.toFixed(1)}% · {league.wins}–{league.losses} · {league.settledPicks} independent locks</p><p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary"><FlameIcon aria-hidden="true" className="size-3" />{league.currentWinStreak}W current streak</p></div>{data.viewer.isSelf ? <Badge variant="outline">Your profile</Badge> : followed ? <Badge variant="secondary"><CheckIcon data-icon="inline-start" />Following</Badge> : <Button size="sm" disabled={pending} onClick={() => followLeague(league.id)}><UserPlusIcon data-icon="inline-start" />{pendingLeagueId === league.id ? "Following…" : "Follow"}</Button>}</article>;
            })}
          </div>
        </section>

        <section className="border" aria-labelledby="recent-heading"><div className="border-b px-5 py-4"><h2 id="recent-heading" className="font-heading text-2xl font-bold uppercase">Recent calls</h2><p className="mt-1 text-sm text-muted-foreground">Independent Weekly Locks only.</p></div><div className="divide-y">{data.recentLocks.map((lock) => <article key={lock.id} className="p-4"><div className="flex items-center justify-between gap-3"><Link href={`/leagues/${lock.leagueSlug}`} className="font-semibold hover:text-primary">{lock.leagueName}</Link><ResultBadge result={lock.result} /></div><strong className="mt-2 block">{lock.team}</strong><p className="mt-1 text-sm text-muted-foreground">{lock.fixture}</p></article>)}</div></section>
      </div>
    </div>
  );
}
