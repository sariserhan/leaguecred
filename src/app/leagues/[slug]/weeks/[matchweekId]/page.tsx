import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, UsersRoundIcon } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { getMatchweekHistory } from "@/data/leagues";
import { cn } from "@/lib/utils";
import { Crest } from "@/components/ui/crest";

export const dynamic = "force-dynamic";

type MatchweekPageProps = {
  params: Promise<{ slug: string; matchweekId: string }>;
};

function TeamLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  return logoUrl ? (
    <Crest src={logoUrl} size={32} />
  ) : (
    <span className="flex size-8 items-center justify-center bg-muted text-xs font-bold">
      {name.slice(0, 3).toUpperCase()}
    </span>
  );
}

function ResultBadge({ result }: { result: "win" | "loss" | "void" | "pending" }) {
  const labels = { win: "Correct", loss: "Missed", void: "Void", pending: "Awaiting result" };
  const variants = { win: "default", loss: "destructive", void: "outline", pending: "secondary" } as const;
  return <Badge variant={variants[result]}>{labels[result]}</Badge>;
}

export async function generateMetadata(props: MatchweekPageProps): Promise<Metadata> {
  const { slug, matchweekId } = await props.params;
  const data = await getMatchweekHistory(slug, matchweekId);
  if (!data) return { title: "Matchweek not found" };
  const description = `Daily Lock results and specialist calls for ${data.league.name}.`;
  return {
    title: `${data.league.name} ${data.matchweek.displayName}`,
    description,
    alternates: { canonical: `/leagues/${slug}/weeks/${matchweekId}` },
    openGraph: { title: `${data.league.name} ${data.matchweek.displayName} · LeagueCred`, description, type: "website", images: ["/opengraph-image"] },
  };
}

export default async function MatchweekHistoryPage(props: MatchweekPageProps) {
  const { slug, matchweekId } = await props.params;
  const data = await getMatchweekHistory(slug, matchweekId);
  if (!data) notFound();

  const accuracy = data.summary.settledLocks === 0
    ? null
    : Math.round((data.summary.correctLocks / data.summary.settledLocks) * 100);

  return (
    <div className="page-shell py-8 sm:py-12">
      <Link href={`/leagues/${data.league.slug}`} className={buttonVariants({ variant: "outline" })}>
        <ArrowLeftIcon data-icon="inline-start" />
        Back to {data.league.name}
      </Link>

      <header className="mt-6 border-b border-inverted bg-inverted px-5 py-8 text-inverted-foreground sm:px-8 sm:py-10">
        <p className="font-semibold text-primary">{data.league.country} · Completed matchweek</p>
        <h1 className="mt-2 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">
          {data.matchweek.displayName}
        </h1>
        <p className="mt-4 max-w-2xl text-inverted-foreground/75">
          Every independent Daily Lock is visible here after the week closes.
        </p>
      </header>

      <section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-5" aria-label="Matchweek statistics">
        {[
          ["Daily Locks", data.summary.totalLocks],
          ["Contributors", data.summary.contributors],
          ["Correct", data.summary.correctLocks],
          ["Lock accuracy", accuracy === null ? "—" : `${accuracy}%`],
          ["Followed calls", data.summary.followedCalls],
        ].map(([label, value]) => (
          <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0">
            <strong className="block font-heading text-4xl leading-none">{value}</strong>
            <span className="mt-1 block text-sm text-muted-foreground">{label}</span>
          </div>
        ))}
      </section>

      <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_390px]">
        <section className="border" aria-labelledby="results-heading">
          <div className="border-b px-5 py-4"><h2 id="results-heading" className="font-heading text-2xl font-bold uppercase">Final results</h2></div>
          <div className="divide-y">
            {data.fixtures.map((fixture) => {
              const homeWon = fixture.homeScore !== null && fixture.awayScore !== null && fixture.homeScore > fixture.awayScore;
              const awayWon = fixture.homeScore !== null && fixture.awayScore !== null && fixture.awayScore > fixture.homeScore;
              const score = fixture.homeScore === null || fixture.awayScore === null
                ? fixture.status === "cancelled" || fixture.status === "abandoned" ? "Void" : "—"
                : `${fixture.homeScore}–${fixture.awayScore}`;
              return (
                <div key={fixture.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <span className={cn("flex items-center gap-3 font-semibold", homeWon && "text-primary")}><TeamLogo name={fixture.home} logoUrl={fixture.homeLogoUrl} />{fixture.home}</span>
                  <strong className="text-center font-heading text-3xl">{score}</strong>
                  <span className={cn("flex items-center justify-end gap-3 text-right font-semibold", awayWon && "text-primary")}>{fixture.away}<TeamLogo name={fixture.away} logoUrl={fixture.awayLogoUrl} /></span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border" aria-labelledby="votes-heading">
          <div className="border-b px-5 py-4"><h2 id="votes-heading" className="font-heading text-2xl font-bold uppercase">Teams backed</h2></div>
          {data.teamVotes.length > 0 ? (
            <div className="divide-y">
              {data.teamVotes.map((team) => {
                const share = data.summary.totalLocks === 0 ? 0 : Math.round((team.votes / data.summary.totalLocks) * 100);
                return (
                  <div key={team.id} className="p-4">
                    <div className="flex items-center gap-3"><TeamLogo name={team.name} logoUrl={team.logoUrl} /><strong className="min-w-0 flex-1 truncate">{team.name}</strong><span className="font-heading text-2xl">{team.votes}</span></div>
                    <div className="mt-3 h-2 overflow-hidden bg-muted"><div className="h-full bg-primary" style={{ width: `${share}%` }} /></div>
                    <p className="mt-2 text-xs text-muted-foreground">{share}% of locks · {team.wins} correct</p>
                  </div>
                );
              })}
            </div>
          ) : <p className="p-5 text-sm text-muted-foreground">No independent Daily Locks were made for this week.</p>}
        </section>
      </div>

      <section className="mt-7 border" aria-labelledby="locks-heading">
        <div className="flex items-center justify-between gap-4 border-b px-5 py-4"><div><h2 id="locks-heading" className="font-heading text-2xl font-bold uppercase">Daily Locks</h2><p className="mt-1 text-sm text-muted-foreground">Who backed which team.</p></div><UsersRoundIcon aria-hidden="true" className="size-6 text-primary" /></div>
        {data.locks.length > 0 ? (
          <div className="divide-y">
            {data.locks.map((lock) => (
              <article key={lock.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1fr)_auto] sm:items-center">
                <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{lock.initials}</span><strong><Link href={`/specialists/${lock.specialistId}`} className="hover:text-primary hover:underline">{lock.specialist}</Link></strong></div>
                <div className="flex items-center gap-3"><TeamLogo name={lock.team} logoUrl={lock.teamLogoUrl} /><div><strong className="block">{lock.team}</strong><span className="block text-sm text-muted-foreground">{lock.fixture}</span></div></div>
                <ResultBadge result={lock.result} />
              </article>
            ))}
          </div>
        ) : <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-5 text-center text-muted-foreground"><CheckIcon aria-hidden="true" className="size-6 text-primary" />No locks were recorded for this matchweek.</div>}
      </section>
    </div>
  );
}
