"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
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
import type { LeagueExperienceData } from "@/data/leagues";
import { cn } from "@/lib/utils";

type ParticipationMode = "prove" | "follow";
type Selection = { fixtureId: string; teamId: string; teamName: string };

function TeamMark({ code, logoUrl, selected }: { code: string; logoUrl: string | null; selected: boolean }) {
  return (
    <span className={cn(
      "flex size-10 shrink-0 items-center justify-center rounded-full border font-heading text-sm font-bold",
      selected ? "border-primary bg-primary" : "bg-muted",
    )}>
      {logoUrl ? (
        <Image src={logoUrl} alt="" width={32} height={32} className="size-8 object-contain" />
      ) : code}
    </span>
  );
}

export function LeagueExperience({ data }: { data: LeagueExperienceData }) {
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
        <div className="page-shell grid min-h-52 lg:grid-cols-[1fr_260px]">
          <div className="relative flex flex-col justify-center gap-2 overflow-hidden py-10">
            <div className="pitch-mark absolute inset-y-0 right-0 hidden w-1/2 border-background/20 lg:block" aria-hidden="true" />
            <p className="font-semibold text-primary">{data.league.country}</p>
            <h1 className="relative font-heading text-6xl font-extrabold tracking-[-0.03em] uppercase sm:text-8xl">
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
          <aside className="flex flex-col justify-center border-t border-background/20 py-8 lg:border-t-0 lg:border-l lg:pl-8">
            <span className="text-sm font-semibold">Your record</span>
            <strong className="font-heading text-6xl leading-none">{accuracy === null ? "—" : `${accuracy.toFixed(1)}%`}</strong>
            <span className="text-lg">{data.viewer.wins}–{data.viewer.losses}</span>
            <span className="mt-3 flex items-center gap-2 border-t border-background/20 pt-3">
              <ShieldCheckIcon aria-hidden="true" className="size-5 text-primary" />
              <span><strong className="block">{data.viewer.tier}</strong><span className="text-sm text-background/70">{decisions} settled picks</span></span>
            </span>
          </aside>
        </div>
      </section>

      <div className="page-shell py-8">
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}

        <ToggleGroup value={[mode]} onValueChange={chooseMode} className="grid w-full gap-4 lg:grid-cols-2" aria-label="Choose how to participate this matchweek">
          <ToggleGroupItem value="prove" disabled={Boolean(lockedTeam) || data.viewer.mode === "follow" || interactionLocked} className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-5 py-4 text-left">
            <ShieldCheckIcon aria-hidden="true" className="size-9 text-primary" />
            <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl uppercase">Prove your knowledge</strong><span className="block text-sm font-normal text-muted-foreground">Make your own pick before seeing specialists. This builds your {data.league.name} record.</span></span>
          </ToggleGroupItem>
          <ToggleGroupItem value="follow" disabled={Boolean(lockedTeam) || data.viewer.mode === "independent" || interactionLocked} className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-5 py-4 text-left">
            <UsersRoundIcon aria-hidden="true" className="size-9" />
            <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl uppercase">Follow experts</strong><span className="block text-sm font-normal text-muted-foreground">See proven specialist picks. This will not build your independent record.</span></span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mt-6 grid gap-7 xl:grid-cols-[1fr_390px]">
          <section className="border" aria-labelledby="fixtures-heading">
            <div className="border-b px-5 py-4"><h2 id="fixtures-heading" className="font-heading text-2xl font-bold uppercase">Select the team you believe will win</h2></div>
            <div className="divide-y">
              {data.fixtures.map((fixture) => {
                const homeSelected = selection?.teamId === fixture.homeTeamId;
                const awaySelected = selection?.teamId === fixture.awayTeamId;
                const disabled = mode === "follow" || Boolean(lockedTeam) || interactionLocked;
                return (
                  <div key={fixture.id} className={cn("grid gap-3 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center", homeSelected || awaySelected ? "bg-primary/10" : "bg-background")}>
                    <button type="button" disabled={disabled} onClick={() => setSelection({ fixtureId: fixture.id, teamId: fixture.homeTeamId, teamName: fixture.home })} className="flex items-center gap-3 text-left font-semibold disabled:cursor-not-allowed disabled:opacity-60" aria-pressed={homeSelected}>
                      <TeamMark code={fixture.homeCode} logoUrl={fixture.homeLogoUrl} selected={homeSelected} />{fixture.home}
                    </button>
                    <span className="text-center text-sm text-muted-foreground">{fixture.kickoff}</span>
                    <button type="button" disabled={disabled} onClick={() => setSelection({ fixtureId: fixture.id, teamId: fixture.awayTeamId, teamName: fixture.away })} className="flex items-center justify-end gap-3 text-right font-semibold disabled:cursor-not-allowed disabled:opacity-60" aria-pressed={awaySelected}>
                      {fixture.away}<TeamMark code={fixture.awayCode} logoUrl={fixture.awayLogoUrl} selected={awaySelected} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="border-t bg-muted p-3">
              {lockedTeam ? (
                <div className="flex min-h-11 items-center justify-center gap-2 font-semibold"><CheckIcon aria-hidden="true" className="size-5 text-primary" />{lockedTeam} is your independent Weekly Lock</div>
              ) : mode === "prove" ? (
                <Button size="lg" className="w-full" disabled={!selection || pending || interactionLocked} onClick={() => requireAuthentication() && setLockConfirmOpen(true)}>
                  {pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}Lock {selection?.teamName ?? "a team"}
                </Button>
              ) : (
                <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground"><UsersRoundIcon aria-hidden="true" className="size-5" />Follow mode selected — choose a specialist call</div>
              )}
            </div>
          </section>

          <Card id="specialists" className="rounded-sm">
            <CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Proven {data.league.name} specialists</CardTitle><CardDescription>Accuracy always includes the independent sample behind it.</CardDescription></CardHeader>
            <CardContent className="divide-y border-y px-0">
              {data.specialists.map((specialist) => (
                <article key={specialist.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4">
                  <Avatar size="lg"><AvatarFallback>{specialist.initials}</AvatarFallback></Avatar>
                  <div className="min-w-0"><h3 className="font-bold">{specialist.name}</h3><p className="text-sm"><strong className="text-primary">{specialist.accuracy}%</strong>{" · "}{specialist.record}</p><p className="text-xs text-muted-foreground">{specialist.picks} independent picks</p></div>
                  {picksRevealed ? (
                    mode === "follow" ? (
                      <Button variant={followedSourcePickId === specialist.sourcePickId ? "secondary" : "outline"} size="sm" disabled={pending || Boolean(followedSourcePickId)} onClick={() => followPick(specialist.sourcePickId)}>
                        {followedSourcePickId === specialist.sourcePickId ? <UserRoundCheckIcon data-icon="inline-start" /> : null}{specialist.lock}
                      </Button>
                    ) : <Badge variant="outline">{specialist.lock}</Badge>
                  ) : (
                    <span className="flex items-center gap-2 border px-3 py-2 text-xs text-muted-foreground"><LockKeyholeIcon aria-hidden="true" className="size-4" />Pick hidden</span>
                  )}
                </article>
              ))}
            </CardContent>
            <CardFooter className="bg-muted">
              {followedSourcePickId ? <span className="flex items-center gap-2 text-sm font-semibold"><UserRoundCheckIcon aria-hidden="true" className="size-5 text-primary" />Pick followed with attribution</span> : <span className="text-sm text-muted-foreground">{picksRevealed ? "Choose one specialist call to follow." : "Picks reveal after you lock or choose Follow Experts."}</span>}
            </CardFooter>
          </Card>
        </div>

        <section className="mt-7 grid gap-7 lg:grid-cols-2">
          <Card><CardHeader><CardTitle className="font-heading text-2xl font-bold uppercase">Your {data.league.name} record</CardTitle><CardDescription>Only settled independent Weekly Locks count here.</CardDescription></CardHeader><CardContent className="grid grid-cols-3 gap-3"><div><strong className="block text-2xl">{data.viewer.wins}</strong><span className="text-sm text-muted-foreground">Wins</span></div><div><strong className="block text-2xl">{data.viewer.losses}</strong><span className="text-sm text-muted-foreground">Losses</span></div><div><strong className="block text-2xl">{decisions}</strong><span className="text-sm text-muted-foreground">Decisions</span></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="font-heading text-2xl font-bold uppercase">{data.league.name} leaderboard</CardTitle><CardDescription>Eligible specialists ordered by confidence-adjusted evidence.</CardDescription></CardHeader><CardContent><ol className="divide-y border-y">{data.specialists.map((specialist, index) => <li key={specialist.id} className="grid grid-cols-[40px_1fr_auto] py-3"><span>{index + 1}</span><span className="font-semibold">{specialist.name}</span><span>{specialist.accuracy}%</span></li>)}</ol></CardContent></Card>
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
