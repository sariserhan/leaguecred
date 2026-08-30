"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserRoundCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import {
  followSpecialistPick,
  revealSpecialistPicks,
  submitWeeklyLock,
} from "@/app/leagues/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LeagueLeaderboard } from "@/components/leagues/league-leaderboard";
import type { LeagueExperienceData, PastMatchweek } from "@/data/leagues";
import { cn } from "@/lib/utils";

type ParticipationMode = "prove" | "follow";
type Selection = { fixtureId: string; teamId: string; teamName: string };

function TeamMark({ code, logoUrl }: { code: string; logoUrl: string | null }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center font-heading text-sm font-bold">
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={40} height={40} className="size-10 object-contain" />
      ) : code}
    </span>
  );
}

function PastMatchweekHistory({ leagueSlug, matchweeks }: { leagueSlug: string; matchweeks: PastMatchweek[] }) {
  if (matchweeks.length === 0) return null;

  return (
    <section className="mt-7 border" aria-labelledby="history-heading">
      <div className="border-b px-4 py-4 sm:px-5">
        <h2 id="history-heading" className="font-heading text-2xl font-bold uppercase">
          Previous weeks & results
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed weeks are read-only and never accept a Weekly Lock.
        </p>
      </div>
      <div className="divide-y">
        {matchweeks.map((matchweek, index) => (
          <details key={matchweek.id} open={index === 0} className="group">
            <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-2 px-4 py-4 font-semibold marker:content-none hover:bg-muted sm:flex-row sm:items-center sm:gap-3 sm:px-5">
              <span>{matchweek.displayName}</span>
              <span className="flex w-full items-center justify-between gap-3 text-sm text-muted-foreground sm:w-auto sm:justify-start">
                <Link href={`/leagues/${leagueSlug}/weeks/${matchweek.id}`} className="relative z-10 font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline">
                  Week details
                </Link>
                <span className="group-open:hidden">Show results</span>
                <span className="hidden group-open:inline">Hide results</span>
              </span>
            </summary>
            <div className="divide-y border-t">
              {matchweek.fixtures.map((fixture) => {
                const homeWon = fixture.homeScore !== null && fixture.awayScore !== null && fixture.homeScore > fixture.awayScore;
                const awayWon = fixture.homeScore !== null && fixture.awayScore !== null && fixture.awayScore > fixture.homeScore;
                const score = fixture.homeScore === null || fixture.awayScore === null
                  ? fixture.status === "cancelled" || fixture.status === "abandoned" ? "Void" : "—"
                  : `${fixture.homeScore}–${fixture.awayScore}`;
                return (
                  <div key={fixture.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-4 sm:px-4 sm:py-3">
                    <span className={cn("flex min-w-0 flex-col items-center gap-2 text-center font-semibold sm:flex-row sm:text-left", homeWon && "text-primary")}>
                      <TeamMark code={fixture.homeCode} logoUrl={fixture.homeLogoUrl} />
                      <span className="min-w-0 break-words">{fixture.home}</span>
                    </span>
                    <strong className="text-center font-heading text-2xl">{score}</strong>
                    <span className={cn("flex min-w-0 flex-col-reverse items-center gap-2 text-center font-semibold sm:flex-row sm:justify-end sm:text-right", awayWon && "text-primary")}>
                      <span className="min-w-0 break-words">{fixture.away}</span>
                      <TeamMark code={fixture.awayCode} logoUrl={fixture.awayLogoUrl} />
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export function LeagueExperience({
  data,
  leaderboardEnabled,
}: {
  data: LeagueExperienceData;
  leaderboardEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ParticipationMode>(data.viewer.mode === "follow" ? "follow" : "prove");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [lockedTeam, setLockedTeam] = useState(data.viewer.lockedTeam);
  const [picksRevealed, setPicksRevealed] = useState(data.viewer.picksRevealed);
  const [followedSourcePickId, setFollowedSourcePickId] = useState(data.viewer.followedSourcePickId);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [followConfirmOpen, setFollowConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decisions = data.viewer.wins + data.viewer.losses;
  const accuracy = decisions === 0 ? null : (data.viewer.wins / decisions) * 100;
  const lockAt = new Intl.DateTimeFormat("en", {
    weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
  }).format(new Date(data.matchweek.lockAt));
  const interactionLocked = data.matchweek.status !== "upcoming" || new Date(data.matchweek.lockAt) <= new Date();
  const fixturesByDate = new Map<string, typeof data.fixtures>();
  for (const fixture of data.fixtures) {
    const fixtures = fixturesByDate.get(fixture.kickoffDate);
    if (fixtures) fixtures.push(fixture);
    else fixturesByDate.set(fixture.kickoffDate, [fixture]);
  }

  function requireAuthentication() {
    if (data.viewer.authenticated) return true;
    router.push("/auth");
    return false;
  }

  function chooseMode(values: string[]) {
    const nextMode = values[0] as ParticipationMode | undefined;
    if (!nextMode || lockedTeam || data.viewer.mode) return;
    setError(null);
    if (nextMode === "follow") {
      if (!requireAuthentication()) return;
      setFollowConfirmOpen(true);
      return;
    }
    setMode("prove");
  }

  function confirmFollowMode() {
    startTransition(async () => {
      const result = await revealSpecialistPicks(data.matchweek.id);
      if (!result.ok) {
        setError(result.message);
        setFollowConfirmOpen(false);
        return;
      }
      setMode("follow");
      setSelection(null);
      setPicksRevealed(true);
      setFollowConfirmOpen(false);
      router.refresh();
    });
  }

  function confirmLock() {
    if (!selection || !requireAuthentication()) return;
    startTransition(async () => {
      const result = await submitWeeklyLock(selection.fixtureId, selection.teamId);
      if (!result.ok) {
        setError(result.message);
        setLockConfirmOpen(false);
        return;
      }
      setLockedTeam(selection.teamName);
      setPicksRevealed(true);
      setLockConfirmOpen(false);
      router.refresh();
    });
  }

  function followPick(sourcePickId: string) {
    if (!requireAuthentication()) return;
    startTransition(async () => {
      const result = await followSpecialistPick(sourcePickId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFollowedSourcePickId(sourcePickId);
      router.refresh();
    });
  }

  return (
    <>
      <section className="bg-foreground text-background">
        <div className="page-shell grid lg:min-h-52 lg:grid-cols-[1fr_260px]">
          <div className="relative flex flex-col justify-center gap-2 overflow-hidden py-7 sm:py-10">
            <div className="pitch-mark absolute inset-y-0 right-0 hidden w-1/2 border-background/20 lg:block" aria-hidden="true" />
            <p className="font-semibold text-primary">{data.league.country}</p>
            <h1 className="relative font-heading text-[clamp(3rem,16vw,4.5rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase sm:text-8xl">
              {data.league.name}
            </h1>
            <div className="relative flex flex-wrap items-center gap-4">
              <Badge variant="outline" className="border-background/40 text-background">{data.matchweek.displayName}</Badge>
              <span className="flex items-center gap-2 text-sm">
                <LockKeyholeIcon aria-hidden="true" className="size-4" />
                Locks close {lockAt}
              </span>
            </div>
          </div>
          <aside className="grid grid-cols-[1fr_auto] items-end gap-x-5 gap-y-1 border-t border-background/20 py-5 lg:flex lg:flex-col lg:items-stretch lg:justify-center lg:border-t-0 lg:border-l lg:py-8 lg:pl-8">
            <span className="text-sm font-semibold">Your record</span>
            <strong className="row-span-2 font-heading text-5xl leading-none lg:row-auto lg:text-6xl">{accuracy === null ? "—" : `${accuracy.toFixed(1)}%`}</strong>
            <span className="text-lg">{data.viewer.wins}–{data.viewer.losses}</span>
            <span className="col-span-2 mt-2 flex items-center gap-2 border-t border-background/20 pt-3 lg:mt-3">
              <ShieldCheckIcon aria-hidden="true" className="size-5 text-primary" />
              <span><strong className="block">{data.viewer.tier}</strong><span className="text-sm text-background/70">{decisions} settled picks</span></span>
            </span>
          </aside>
        </div>
      </section>

      <div className="page-shell py-6 sm:py-8">
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <ToggleGroup value={[mode]} onValueChange={chooseMode} className="grid w-full gap-2 sm:gap-4 lg:grid-cols-2" aria-label="Choose how to participate this matchweek">
          <ToggleGroupItem value="prove" disabled={Boolean(lockedTeam) || data.viewer.mode === "follow" || interactionLocked} className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-4 py-4 text-left sm:px-5">
            <ShieldCheckIcon aria-hidden="true" className="size-7 shrink-0 text-primary sm:size-9" />
            <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl uppercase">Prove your knowledge</strong><span className="block text-sm font-normal text-muted-foreground">Make your own pick before seeing specialists. This builds your {data.league.name} record.</span></span>
          </ToggleGroupItem>
          <ToggleGroupItem value="follow" disabled={Boolean(lockedTeam) || data.viewer.mode === "independent" || interactionLocked} className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-4 py-4 text-left sm:px-5">
            <UsersRoundIcon aria-hidden="true" className="size-7 shrink-0 sm:size-9" />
            <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl uppercase">Follow experts</strong><span className="block text-sm font-normal text-muted-foreground">See proven specialist picks. This will not build your independent record.</span></span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mt-6 grid gap-7 xl:grid-cols-[1fr_390px]">
          <div className="space-y-7">
            <section className="border" aria-labelledby="fixtures-heading">
            <div className="border-b px-4 py-4 sm:px-5"><h2 id="fixtures-heading" className="font-heading text-2xl leading-none font-bold uppercase">Select the team you believe will win</h2></div>
            <div>
              {[...fixturesByDate].map(([date, fixtures]) => (
                <section key={date} className="border-b last:border-b-0" aria-label={date}>
                  <h3 className="border-b bg-muted px-4 py-2 text-sm font-bold uppercase tracking-wide">{date}</h3>
                  <div className="divide-y">
                    {fixtures.map((fixture) => {
                      const homeSelected = selection?.teamId === fixture.homeTeamId;
                      const awaySelected = selection?.teamId === fixture.awayTeamId;
                      const disabled = mode === "follow" || Boolean(lockedTeam) || interactionLocked;
                      return (
                        <div key={fixture.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 bg-background p-3 sm:items-center sm:gap-3">
                          <button type="button" disabled={disabled} onClick={() => setSelection({ fixtureId: fixture.id, teamId: fixture.homeTeamId, teamName: fixture.home })} className={cn("col-start-1 row-start-2 flex min-w-0 flex-col items-center justify-center gap-2 rounded-sm px-2 py-3 text-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 sm:row-start-1 sm:flex-row sm:justify-start sm:py-2 sm:text-left", homeSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted")} aria-pressed={homeSelected}>
                            <TeamMark code={fixture.homeCode} logoUrl={fixture.homeLogoUrl} /><span className="min-w-0 break-words">{fixture.home}</span>
                          </button>
                          <span className="col-span-3 row-start-1 text-center text-sm text-muted-foreground sm:col-span-1">{fixture.kickoff}</span>
                          <span className="col-start-2 row-start-2 self-center font-heading text-sm font-bold text-muted-foreground sm:hidden" aria-hidden="true">VS</span>
                          <button type="button" disabled={disabled} onClick={() => setSelection({ fixtureId: fixture.id, teamId: fixture.awayTeamId, teamName: fixture.away })} className={cn("col-start-3 row-start-2 flex min-w-0 flex-col items-center justify-center gap-2 rounded-sm px-2 py-3 text-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 sm:row-start-1 sm:flex-row sm:justify-end sm:py-2 sm:text-right", awaySelected ? "bg-primary text-primary-foreground" : "hover:bg-muted")} aria-pressed={awaySelected}>
                            <span className="order-first sm:order-last"><TeamMark code={fixture.awayCode} logoUrl={fixture.awayLogoUrl} /></span><span className="min-w-0 break-words sm:order-first">{fixture.away}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className="border-t bg-muted p-3">
              {lockedTeam ? (
                <div className="flex min-h-11 items-center justify-center gap-2 font-semibold"><CheckIcon aria-hidden="true" className="size-5 text-primary" />{lockedTeam} is your independent Weekly Lock</div>
              ) : mode === "prove" ? (
                <Button size="lg" className="w-full" disabled={!selection || pending || interactionLocked} onClick={() => requireAuthentication() && setLockConfirmOpen(true)}>
                  {pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}Lock your one pick: {selection?.teamName ?? "choose a team"}
                </Button>
              ) : (
                <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground"><UsersRoundIcon aria-hidden="true" className="size-5" />Follow mode selected — choose a specialist call</div>
              )}
            </div>
            </section>

            <PastMatchweekHistory leagueSlug={data.league.slug} matchweeks={data.pastMatchweeks} />
          </div>

          <Card id="specialists" className="rounded-sm">
            <CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Proven {data.league.name} specialists</CardTitle><CardDescription>Accuracy always includes the independent sample behind it.</CardDescription></CardHeader>
            <CardContent className="divide-y border-y px-0">
              {data.specialists.map((specialist) => (
                <article key={specialist.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_1fr_auto]">
                  <Avatar size="lg"><AvatarFallback>{specialist.initials}</AvatarFallback></Avatar>
                  <div className="min-w-0"><h3 className="font-bold">{specialist.name}</h3><p className="text-sm"><strong className="text-primary">{specialist.accuracy}%</strong>{" · "}{specialist.record}</p><p className="text-xs text-muted-foreground">{specialist.picks} independent picks</p></div>
                  {picksRevealed ? (
                    mode === "follow" ? (
                      <Button variant={followedSourcePickId === specialist.sourcePickId ? "secondary" : "outline"} size="sm" className="col-start-2 w-full sm:col-start-auto sm:w-auto" disabled={pending || Boolean(followedSourcePickId)} onClick={() => followPick(specialist.sourcePickId)}>
                        {followedSourcePickId === specialist.sourcePickId ? <UserRoundCheckIcon data-icon="inline-start" /> : null}{specialist.lock}
                      </Button>
                    ) : <Badge variant="outline" className="col-start-2 justify-self-start sm:col-start-auto">{specialist.lock}</Badge>
                  ) : (
                    <span className="col-start-2 flex items-center gap-2 border px-3 py-2 text-xs text-muted-foreground sm:col-start-auto"><LockKeyholeIcon aria-hidden="true" className="size-4" />Pick hidden</span>
                  )}
                </article>
              ))}
            </CardContent>
            <CardFooter className="bg-muted">
              {followedSourcePickId ? <span className="flex items-center gap-2 text-sm font-semibold"><UserRoundCheckIcon aria-hidden="true" className="size-5 text-primary" />Pick followed with attribution</span> : <span className="text-sm text-muted-foreground">{picksRevealed ? "Choose one specialist call to follow." : "Picks reveal after you lock or choose Follow Experts."}</span>}
            </CardFooter>
          </Card>
        </div>

        <section className={leaderboardEnabled ? "mt-7 grid gap-7 lg:grid-cols-2" : "mt-7 grid gap-7"}>
          <Card><CardHeader><CardTitle className="font-heading text-2xl font-bold uppercase">Your {data.league.name} record</CardTitle><CardDescription>Only settled independent Weekly Locks count here.</CardDescription></CardHeader><CardContent className="grid grid-cols-3 gap-3"><div><strong className="block text-2xl">{data.viewer.wins}</strong><span className="text-sm text-muted-foreground">Wins</span></div><div><strong className="block text-2xl">{data.viewer.losses}</strong><span className="text-sm text-muted-foreground">Losses</span></div><div><strong className="block text-2xl">{decisions}</strong><span className="text-sm text-muted-foreground">Decisions</span></div></CardContent></Card>
          {leaderboardEnabled ? <LeagueLeaderboard leagueName={data.league.name} entries={data.leaderboard} /> : null}
        </section>
      </div>

      <Dialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">Lock {selection?.teamName}?</DialogTitle><DialogDescription>This independent {data.league.name} prediction cannot be changed or deleted. Specialist picks reveal after confirmation.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setLockConfirmOpen(false)}>Go back</Button><Button onClick={confirmLock} disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}Confirm Weekly Lock</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={followConfirmOpen} onOpenChange={setFollowConfirmOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">Reveal specialist calls?</DialogTitle><DialogDescription>This permanently forfeits an independent rated pick in {data.league.name} for {data.matchweek.displayName}. A followed call is tracked separately and never builds your expertise record.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setFollowConfirmOpen(false)}>Keep picks hidden</Button><Button onClick={confirmFollowMode} disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <UsersRoundIcon data-icon="inline-start" />}Reveal and follow</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
}
