"use client";

import { useState } from "react";
import {
  CheckIcon,
  CircleIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserRoundCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Fixture, Specialist } from "@/lib/league-data";

type ParticipationMode = "prove" | "follow";

function TeamMark({ code, selected }: { code: string; selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-10 items-center justify-center rounded-full border font-heading text-sm font-bold",
        selected ? "border-primary bg-primary" : "bg-muted",
      )}
    >
      {code}
    </span>
  );
}

export function LeagueExperience({
  fixtures,
  specialists,
}: {
  fixtures: Fixture[];
  specialists: Specialist[];
}) {
  const [mode, setMode] = useState<ParticipationMode>("prove");
  const [selectedTeam, setSelectedTeam] = useState("Galatasaray");
  const [lockedTeam, setLockedTeam] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [followedSpecialist, setFollowedSpecialist] = useState<string | null>(null);

  const picksRevealed = mode === "follow" || lockedTeam !== null;

  function chooseMode(values: string[]) {
    const nextMode = values[0] as ParticipationMode | undefined;
    if (!nextMode || lockedTeam) return;
    setMode(nextMode);
    if (nextMode === "follow") setSelectedTeam("");
  }

  function confirmLock() {
    if (!selectedTeam) return;
    setLockedTeam(selectedTeam);
    setConfirmOpen(false);
  }

  return (
    <>
      <section className="bg-foreground text-background">
        <div className="page-shell grid min-h-52 lg:grid-cols-[1fr_260px]">
          <div className="relative flex flex-col justify-center gap-2 overflow-hidden py-10">
            <div className="pitch-mark absolute inset-y-0 right-0 hidden w-1/2 border-background/20 lg:block" aria-hidden="true" />
            <p className="font-semibold text-primary">Türkiye</p>
            <h1 className="relative font-heading text-6xl font-extrabold tracking-[-0.03em] uppercase sm:text-8xl">
              Süper Lig
            </h1>
            <div className="relative flex flex-wrap items-center gap-4">
              <Badge variant="outline" className="border-background/40 text-background">
                Matchweek 8
              </Badge>
              <span className="flex items-center gap-2 text-sm">
                <LockKeyholeIcon aria-hidden="true" className="size-4" />
                Locks close Friday · 19:00
              </span>
            </div>
          </div>
          <aside className="flex flex-col justify-center border-t border-background/20 py-8 lg:border-t-0 lg:border-l lg:pl-8">
            <span className="text-sm font-semibold">Your record</span>
            <strong className="font-heading text-6xl leading-none">78.3%</strong>
            <span className="text-lg">36–10</span>
            <span className="mt-3 flex items-center gap-2 border-t border-background/20 pt-3">
              <ShieldCheckIcon aria-hidden="true" className="size-5 text-primary" />
              <span>
                <strong className="block">Expert</strong>
                <span className="text-sm text-background/70">Season rank #14</span>
              </span>
            </span>
          </aside>
        </div>
      </section>

      <div className="page-shell py-8">
        <ToggleGroup
          value={[mode]}
          onValueChange={chooseMode}
          className="grid w-full gap-4 lg:grid-cols-2"
          aria-label="Choose how to participate this matchweek"
        >
          <ToggleGroupItem
            value="prove"
            disabled={lockedTeam !== null}
            className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-5 py-4 text-left"
          >
            <ShieldCheckIcon aria-hidden="true" className="size-9 text-primary" />
            <span className="min-w-0 flex-1">
              <strong className="block font-heading text-2xl uppercase">
                Prove your knowledge
              </strong>
              <span className="block text-sm font-normal text-muted-foreground">
                Make your own pick before seeing specialists. This builds your
                Süper Lig record.
              </span>
            </span>
          </ToggleGroupItem>
          <ToggleGroupItem
            value="follow"
            disabled={lockedTeam !== null}
            className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-5 py-4 text-left"
          >
            <UsersRoundIcon aria-hidden="true" className="size-9" />
            <span className="min-w-0 flex-1">
              <strong className="block font-heading text-2xl uppercase">
                Follow experts
              </strong>
              <span className="block text-sm font-normal text-muted-foreground">
                See proven specialist picks. This will not build your independent record.
              </span>
            </span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mt-6 grid gap-7 xl:grid-cols-[1fr_390px]">
          <section className="border" aria-labelledby="fixtures-heading">
            <div className="border-b px-5 py-4">
              <h2 id="fixtures-heading" className="font-heading text-2xl font-bold uppercase">
                Select the team you believe will win
              </h2>
            </div>

            <div className="divide-y">
              {fixtures.map((fixture) => {
                const homeSelected = selectedTeam === fixture.home;
                const awaySelected = selectedTeam === fixture.away;
                const disabled = mode === "follow" || lockedTeam !== null;

                return (
                  <div
                    key={fixture.id}
                    className={cn(
                      "grid gap-3 p-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center",
                      homeSelected || awaySelected ? "bg-primary/10" : "bg-background",
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedTeam(fixture.home)}
                      className="flex items-center gap-3 text-left font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                      aria-pressed={homeSelected}
                    >
                      <TeamMark code={fixture.homeCode} selected={homeSelected} />
                      {fixture.home}
                    </button>
                    <span className="text-center text-sm text-muted-foreground">
                      {fixture.kickoff}
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => setSelectedTeam(fixture.away)}
                      className="flex items-center justify-end gap-3 text-right font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                      aria-pressed={awaySelected}
                    >
                      {fixture.away}
                      <TeamMark code={fixture.awayCode} selected={awaySelected} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="border-t bg-muted p-3">
              {lockedTeam ? (
                <div className="flex min-h-11 items-center justify-center gap-2 font-semibold">
                  <CheckIcon aria-hidden="true" className="size-5 text-primary" />
                  {lockedTeam} is your independent Weekly Lock
                </div>
              ) : mode === "prove" ? (
                <Button
                  size="lg"
                  className="w-full"
                  disabled={!selectedTeam}
                  onClick={() => setConfirmOpen(true)}
                >
                  <LockKeyholeIcon data-icon="inline-start" />
                  Lock {selectedTeam || "a team"}
                </Button>
              ) : (
                <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <UsersRoundIcon aria-hidden="true" className="size-5" />
                  Follow mode selected — choose a specialist pick
                </div>
              )}
            </div>
          </section>

          <Card id="specialists" className="rounded-sm">
            <CardHeader>
              <CardTitle className="font-heading text-3xl font-bold uppercase">
                Proven Süper Lig specialists
              </CardTitle>
              <CardDescription>
                Accuracy always includes the independent sample behind it.
              </CardDescription>
            </CardHeader>
            <CardContent className="divide-y border-y px-0">
              {specialists.map((specialist) => (
                <article
                  key={specialist.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4"
                >
                  <Avatar size="lg">
                    <AvatarFallback>{specialist.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold">{specialist.name}</h3>
                    <p className="text-sm">
                      <strong className="text-primary">{specialist.accuracy}%</strong>
                      {" · "}
                      {specialist.record}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {specialist.picks} independent picks
                    </p>
                  </div>
                  {picksRevealed ? (
                    mode === "follow" ? (
                      <Button
                        variant={
                          followedSpecialist === specialist.id ? "secondary" : "outline"
                        }
                        size="sm"
                        onClick={() => setFollowedSpecialist(specialist.id)}
                      >
                        {followedSpecialist === specialist.id ? (
                          <UserRoundCheckIcon data-icon="inline-start" />
                        ) : null}
                        {specialist.lock}
                      </Button>
                    ) : (
                      <Badge variant="outline">{specialist.lock}</Badge>
                    )
                  ) : (
                    <span className="flex items-center gap-2 border px-3 py-2 text-xs text-muted-foreground">
                      <LockKeyholeIcon aria-hidden="true" className="size-4" />
                      Pick hidden
                    </span>
                  )}
                </article>
              ))}
            </CardContent>
            <CardFooter className="bg-muted">
              {followedSpecialist ? (
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <UserRoundCheckIcon aria-hidden="true" className="size-5 text-primary" />
                  Pick followed with attribution
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {picksRevealed
                    ? "Choose one specialist call to follow."
                    : "Picks reveal after you lock or choose Follow Experts."}
                </span>
              )}
            </CardFooter>
          </Card>
        </div>

        <section className="mt-7 grid gap-7 lg:grid-cols-2">
          <div className="border p-5">
            <h2 className="font-heading text-2xl font-bold uppercase">
              Your recent Süper Lig matchweeks
            </h2>
            <div className="mt-5 grid grid-cols-5 gap-3">
              {["W", "W", "L", "W", "W"].map((result, index) => (
                <div key={index} className="flex flex-col items-center gap-2 border p-3">
                  <span className="text-xs text-muted-foreground">MW {index + 3}</span>
                  {result === "W" ? (
                    <CheckIcon aria-label="Win" className="size-5 text-primary" />
                  ) : (
                    <CircleIcon aria-label="Loss" className="size-5" />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="border p-5">
            <h2 className="font-heading text-2xl font-bold uppercase">
              Süper Lig leaderboard
            </h2>
            <ol className="mt-5 divide-y border-y">
              {specialists.slice(0, 2).map((specialist, index) => (
                <li key={specialist.id} className="grid grid-cols-[40px_1fr_auto] py-3">
                  <span>{index + 1}</span>
                  <span className="font-semibold">{specialist.name}</span>
                  <span>{specialist.accuracy}%</span>
                </li>
              ))}
              <li className="grid grid-cols-[40px_1fr_auto] bg-primary/10 py-3">
                <span>14</span>
                <span className="font-semibold">You</span>
                <span>78.3%</span>
              </li>
            </ol>
          </div>
        </section>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl font-bold uppercase">
              Lock {selectedTeam}?
            </DialogTitle>
            <DialogDescription>
              This independent Süper Lig prediction cannot be changed. Specialist
              picks will be revealed after you confirm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Go back
            </Button>
            <Button onClick={confirmLock}>
              <LockKeyholeIcon data-icon="inline-start" />
              Confirm Weekly Lock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
