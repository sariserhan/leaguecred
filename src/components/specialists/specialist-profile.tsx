"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, FlameIcon, TrophyIcon, UserPlusIcon, UsersRoundIcon } from "lucide-react";

import { followSpecialist } from "@/app/leagues/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SpecialistProfileData } from "@/data/specialists";

function ResultBadge({ result }: { result: "win" | "loss" | "void" | "pending" }) {
  const variants = { win: "default", loss: "destructive", void: "outline", pending: "outline" } as const;
  const labels = { win: "Correct", loss: "Missed", void: "Void", pending: "Pending" };
  return <Badge variant={variants[result]}>{labels[result]}</Badge>;
}

export function SpecialistProfile({ data }: { data: SpecialistProfileData }) {
  const router = useRouter();
  const [followedLeagueIds, setFollowedLeagueIds] = useState(() => new Set(data.leagues.filter((league) => league.followedByViewer).map((league) => league.id)));
  const [pendingLeagueId, setPendingLeagueId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successLeague, setSuccessLeague] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const accuracy = data.totals.settledPicks === 0 ? 0 : (data.totals.wins / data.totals.settledPicks) * 100;

  function followLeague(leagueId: string) {
    if (!data.viewer.authenticated) {
      const destination = `/specialists/${data.specialist.id}`;
      router.push(`/auth?next=${encodeURIComponent(destination)}`);
      return;
    }
    startTransition(async () => {
      setPendingLeagueId(leagueId);
      setError(null);
      const result = await followSpecialist(data.specialist.id, leagueId);
      if (result.ok) {
        setFollowedLeagueIds((current) => new Set(current).add(leagueId));
        setSuccessLeague(data.leagues.find((league) => league.id === leagueId)?.name ?? "this league");
      }
      else setError(result.message);
      setPendingLeagueId(null);
    });
  }

  return (
    <div className="page-shell py-8 sm:py-12">
      {data.viewer.isSelf ? <div className="mb-7"><h1 className="font-heading text-[clamp(3.5rem,7vw,6.5rem)] leading-[0.88] font-extrabold uppercase">Your football dashboard.</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">Your independent records, followed leagues, and recent calls in one place.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><Link href="/leagues?intent=prove" className="inline-flex h-11 items-center justify-center bg-primary px-5 font-semibold">Make a Weekly Lock</Link><Link href="/specialists" className="inline-flex h-11 items-center justify-center bg-foreground px-5 font-semibold text-background">Find specialists</Link></div></div> : null}
      <header className="border-b border-foreground bg-foreground px-5 py-8 text-background sm:px-8 sm:py-10">
        <p className="font-semibold text-primary">{data.viewer.isSelf ? "Your LeagueCred identity" : data.leagues.some((league) => league.followable) ? "Public specialist profile" : "Public profile"}</p>
        <div className="mt-4 flex flex-wrap items-center gap-5"><span className="flex size-20 items-center justify-center rounded-full bg-background font-heading text-3xl font-bold text-foreground">{data.specialist.initials}</span><div><h1 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">{data.specialist.name}</h1><p className="mt-2 flex items-center gap-2 text-background/75"><UsersRoundIcon aria-hidden="true" className="size-4 text-primary" />{data.specialist.followers} follower{data.specialist.followers === 1 ? "" : "s"} · Member since {new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(data.specialist.memberSince))}</p></div></div>
      </header>

      <section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-4" aria-label="Specialist summary">
        {(data.viewer.isSelf ? [["Leagues proven", String(data.leagues.length)], ["Leagues followed", String(data.followedLeagues.length)], ["Locks due", String(data.viewer.locksDue)], ["Career accuracy", `${accuracy.toFixed(1)}%`]] : [["Career accuracy", `${accuracy.toFixed(1)}%`], ["Career record", `${data.totals.wins}–${data.totals.losses}`], ["Evidence", `${data.totals.settledPicks} locks`], ["Best active streak", `${data.totals.bestWinStreak}W`]]).map(([label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><strong className="block font-heading text-4xl leading-none">{value}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></div>)}
      </section>

      {data.viewer.isSelf && data.viewer.locksDue > 0 ? <Alert className="mt-5 rounded-none"><AlertTitle>{data.viewer.locksDue} Weekly Lock{data.viewer.locksDue === 1 ? "" : "s"} due</AlertTitle><AlertDescription>Choose one team in each league before its lock window closes. <Link href="/leagues?intent=prove" className="font-semibold underline">Review leagues</Link></AlertDescription></Alert> : null}

      {error ? <p className="mt-5 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      {successLeague ? <Alert className="mt-5 rounded-none border-primary bg-primary"><CheckIcon /><AlertTitle>You now follow {data.specialist.name} in {successLeague}</AlertTitle><AlertDescription>Future followed calls stay separate from your independent record. <Link href={`/leagues/${data.leagues.find((league) => league.name === successLeague)?.slug ?? ""}`} className="font-semibold underline">Open league</Link></AlertDescription></Alert> : null}
      <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_390px]">
        <section className="border" aria-labelledby="leagues-heading">
          <div className="border-b px-5 py-4"><h2 id="leagues-heading" className="font-heading text-2xl font-bold uppercase">Proven leagues</h2><p className="mt-1 text-sm text-muted-foreground">Follow a specialist only in the league where their evidence is established.</p></div>
          {data.leagues.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">
              No settled Weekly Locks yet. A league record appears here after the first one settles.
            </p>
          ) : null}
          <div className="divide-y">
            {data.leagues.map((league) => {
              const followed = followedLeagueIds.has(league.id);
              const accuracy = league.settledPicks === 0 ? 0 : (league.wins / league.settledPicks) * 100;
              return <article key={league.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><Link href={`/leagues/${league.slug}`} className="font-bold hover:text-primary">{league.name}</Link><Badge variant={league.tier === "Established" ? "secondary" : "outline"}>{league.tier}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{accuracy.toFixed(1)}% · {league.wins}–{league.losses} · {league.settledPicks} independent locks</p><p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold"><span className="flex items-center gap-1 text-primary"><FlameIcon aria-hidden="true" className="size-3" />{league.currentWinStreak}W current streak</span>{league.seasonRank ? <span className="flex items-center gap-1 text-muted-foreground"><TrophyIcon aria-hidden="true" className="size-3" />Season rank #{league.seasonRank}</span> : null}<span className="text-muted-foreground">{league.leagueFollowers} league follower{league.leagueFollowers === 1 ? "" : "s"}</span></p></div>{data.viewer.isSelf ? <Badge variant="outline">Your profile</Badge> : followed ? <Badge variant="secondary"><CheckIcon data-icon="inline-start" />Following</Badge> : league.followable ? <Button size="sm" disabled={pending} onClick={() => followLeague(league.id)}><UserPlusIcon data-icon="inline-start" />{pendingLeagueId === league.id ? "Following…" : "Follow"}</Button> : <Badge variant="outline">Not yet rankable</Badge>}</article>;
            })}
          </div>
        </section>

        <section className="border" aria-labelledby="recent-heading"><div className="border-b px-5 py-4"><h2 id="recent-heading" className="font-heading text-2xl font-bold uppercase">Recent calls</h2><p className="mt-1 text-sm text-muted-foreground">Independent Weekly Locks only.</p></div><div className="divide-y">{data.recentLocks.map((lock) => <article key={lock.id} className="p-4"><div className="flex items-center justify-between gap-3"><Link href={`/leagues/${lock.leagueSlug}`} className="font-semibold hover:text-primary">{lock.leagueName}</Link><ResultBadge result={lock.result} /></div><strong className="mt-2 block">{lock.team}</strong><p className="mt-1 text-sm text-muted-foreground">{lock.fixture}</p></article>)}</div></section>
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_390px]">
        <section className="border" aria-labelledby="following-heading">
          <div className="border-b px-5 py-4">
            <h2 id="following-heading" className="font-heading text-2xl font-bold uppercase">Leagues followed</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Leagues where this account follows someone else. Following never builds an independent record.
            </p>
          </div>
          {data.followedLeagues.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">No leagues followed yet.</p>
          ) : (
            <div className="divide-y">
              {data.followedLeagues.map((league) => (
                <article key={league.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <Link href={`/leagues/${league.slug}`} className="font-bold hover:text-primary">{league.name}</Link>
                  <p className="text-sm text-muted-foreground">
                    Following{" "}
                    <Link href={`/specialists/${league.specialistId}`} className="font-semibold hover:text-primary">
                      {league.specialistName}
                    </Link>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border" aria-labelledby="followed-history-heading">
          <div className="border-b px-5 py-4">
            <h2 id="followed-history-heading" className="font-heading text-2xl font-bold uppercase">Followed calls</h2>
            <p className="mt-1 text-sm text-muted-foreground">Attributed, and separate from the record above.</p>
          </div>
          {data.followedHistory.length === 0 ? (
            <p className="px-5 py-8 text-sm text-muted-foreground">No followed calls yet.</p>
          ) : (
            <div className="divide-y">
              {data.followedHistory.map((entry) => (
                <article key={entry.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/leagues/${entry.leagueSlug}`} className="font-semibold hover:text-primary">{entry.leagueName}</Link>
                    <ResultBadge result={entry.result} />
                  </div>
                  <p className="mt-2 text-sm">
                    Followed{" "}
                    <Link href={`/specialists/${entry.specialistId}`} className="font-semibold hover:text-primary">
                      {entry.specialistName}
                    </Link>
                    {"\u2019s "}
                    <strong>{entry.team}</strong> pick
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
