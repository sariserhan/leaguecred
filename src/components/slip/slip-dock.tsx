"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ClockIcon, LockKeyholeIcon, RadioIcon, TicketIcon, TriangleAlertIcon, XIcon } from "lucide-react";

import { lockSlipCandidate, removeSlipCandidate } from "@/app/slip/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/ui/crest";
import { LocalTime } from "@/components/local-time";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { SlipCandidate } from "@/data/slip-candidates";
import type { LockedGame } from "@/data/locked-games";
import { cn } from "@/lib/utils";

const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** Whether a dock was left open, remembered per browser. */
function useDockOpen(key: string, fallback = false) {
  const [toggled, setToggled] = useState<boolean | null>(null);
  // Read rather than set in an effect, so the server render and the first
  // client render agree about a dock that was left open.
  const remembered = useSyncExternalStore(subscribe, () => {
    try {
      return localStorage.getItem(key);
    } catch {
      // A browser refusing storage still gets working docks, just not
      // remembered ones.
      return null;
    }
  }, () => null);

  const open = toggled ?? (remembered === null ? fallback : remembered === "open");

  return [open, (next: boolean) => {
    setToggled(next);
    try {
      localStorage.setItem(key, next ? "open" : "closed");
    } catch {
      // As above.
    }
  }] as const;
}

/** The panel shell both docks share: a header that toggles, and a body. */
function Dock({ title, count, icon, open, onToggle, tone = "default", children }: {
  title: string;
  count: number;
  icon: React.ReactNode;
  open: boolean;
  onToggle: (next: boolean) => void;
  tone?: "default" | "locked";
  children: React.ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cn("flex min-h-0 flex-col border bg-background shadow-lg", open ? "w-[min(22rem,calc(100vw-1rem))]" : "w-auto self-end")}
    >
      <button
        type="button"
        onClick={() => onToggle(!open)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 px-4 py-3 text-left font-semibold",
          tone === "locked" ? "bg-primary text-primary-foreground" : "bg-inverted text-inverted-foreground",
          open && "border-b",
        )}
      >
        {icon}
        <span className="font-heading text-lg uppercase">{title}</span>
        <Badge variant={tone === "locked" ? "secondary" : count > 0 ? "default" : "outline"}>{count}</Badge>
        <ChevronDownIcon aria-hidden="true" className={cn("ml-auto size-5 transition-transform", open ? "" : "rotate-180")} />
      </button>
      {open ? <div className="flex min-h-0 flex-col overflow-hidden">{children}</div> : null}
    </section>
  );
}

/**
 * The locks a member has already made, beside the slip they are still thinking
 * about. No control on it removes anything: a lock is a public record the moment
 * it is made, and the product is built on that being true.
 */
function LockPanel({ games }: { games: LockedGame[] }) {
  const [open, setOpen] = useDockOpen("leaguecred-locks-open");

  return (
    <Dock
      title="Locks"
      count={games.length}
      tone="locked"
      open={open}
      onToggle={setOpen}
      icon={<LockKeyholeIcon aria-hidden="true" className="size-5" />}
    >
      <div className="max-h-[40vh] min-h-0 overflow-y-auto">
        {games.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No call is riding yet. Lock one from your slip and it stands here until it settles.
          </p>
        ) : (
          <ul className="divide-y">
            {games.map((game) => (
              <li key={game.pickId} className="p-3">
                <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                  <span className="font-semibold">{game.league.name}</span>
                  <span>{dayFormatter.format(new Date(game.kickoff))}</span>
                  <LocalTime value={game.kickoff} />
                  {game.live ? (
                    <span className="flex items-center gap-1 font-bold text-primary uppercase">
                      <RadioIcon className="size-3" />Live
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  <Crest src={game.selected.logoUrl} size={18} />
                  <Link href={`/teams/${game.selected.slug}`} className="font-bold hover:text-primary">{game.selected.name}</Link>
                  <span className="text-xs text-muted-foreground">to beat {game.opponent.name}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        A lock cannot be changed, removed or undone. That is what makes the record worth anything.
      </p>
    </Dock>
  );
}

/**
 * The slip, wherever the member is.
 *
 * It has no page of its own on purpose: a shortlist is only useful while you are
 * still looking at matches, and sending someone to another route to keep it is
 * how a shortlist gets abandoned. So it docks to the side of every page,
 * collapsed to its count until it is wanted.
 *
 * Nothing on it is committed. Each match offers both sides, and choosing one is
 * what makes it a lock — the same call the league page makes, through the same
 * action and the same rules.
 */
function SlipPanel({ candidates }: { candidates: SlipCandidate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useDockOpen("leaguecred-slip-open");
  // A lock cannot be taken back, so it is never one press away: the choice is
  // made here and confirmed in front of a sentence saying what it costs.
  const [confirming, setConfirming] = useState<{ candidate: SlipCandidate; teamId: string; teamName: string } | null>(null);

  function lock(candidate: SlipCandidate, teamId: string, teamName: string) {
    setConfirming(null);
    setBusy(candidate.fixtureId);
    startTransition(async () => {
      const result = await lockSlipCandidate(candidate.fixtureId, teamId);
      setBusy(null);
      if (result.ok) {
        toast.add({ title: "Locked", description: `${teamName} is your Daily Lock for that day.`, type: "success" });
        router.refresh();
      } else {
        toast.add({ title: "Not locked", description: result.message, type: "error" });
      }
    });
  }

  function remove(candidate: SlipCandidate) {
    setBusy(candidate.fixtureId);
    startTransition(async () => {
      await removeSlipCandidate(candidate.fixtureId);
      setBusy(null);
      router.refresh();
    });
  }

  const lockable = candidates.filter((candidate) => !candidate.started && !candidate.dayAlreadyLocked).length;

  return (
    <Dock
      title="Slip"
      count={candidates.length}
      open={open}
      onToggle={setOpen}
      icon={<TicketIcon aria-hidden="true" className="size-5 text-primary" />}
    >
      <div className="max-h-[45vh] min-h-0 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Nothing set aside yet. Add a match from a{" "}
                <Link href="/leagues" className="font-semibold text-foreground hover:text-primary">league</Link>{" "}
                or the{" "}
                <Link href="/live-locks" className="font-semibold text-foreground hover:text-primary">global board</Link>{" "}
                and it waits here while you think.
              </p>
            ) : (
              <ul className="divide-y">
                {candidates.map((candidate) => {
                  const closed = candidate.started || candidate.dayAlreadyLocked;
                  return (
                    <li key={candidate.fixtureId} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
                            <span className="font-semibold">{candidate.league.name}</span>
                            <span>{dayFormatter.format(new Date(candidate.kickoff))}</span>
                            <LocalTime value={candidate.kickoff} />
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                            <Crest src={candidate.home.logoUrl} size={18} />
                            <span className="truncate">{candidate.home.name}</span>
                            <span className="text-xs text-muted-foreground">v</span>
                            <Crest src={candidate.away.logoUrl} size={18} />
                            <span className="truncate">{candidate.away.name}</span>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={pending}
                          aria-label={`Remove ${candidate.home.name} against ${candidate.away.name} from your slip`}
                          onClick={() => remove(candidate)}
                        >
                          <XIcon className="size-4" />
                        </Button>
                      </div>

                      {closed ? (
                        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          {candidate.started ? <ClockIcon className="size-3.5" /> : <LockKeyholeIcon className="size-3.5" />}
                          {candidate.started
                            ? "Kicked off — this one can no longer be locked."
                            : `You already hold a ${candidate.league.name} lock that day.`}
                        </p>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {[candidate.home, candidate.away].map((team) => (
                            <Button
                              key={team.id}
                              size="sm"
                              variant="outline"
                              disabled={pending}
                              onClick={() => setConfirming({ candidate, teamId: team.id, teamName: team.name })}
                            >
                              {busy === candidate.fixtureId ? <Spinner data-icon="inline-start" /> : null}
                              <span className="truncate">{team.name}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
      </div>

      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
        {lockable > 0
          ? `Choose a winner to lock. One lock a day in each league — ${lockable} of these are still open.`
          : "Nothing here can be locked right now."}
      </p>

      <AlertDialog open={confirming !== null} onOpenChange={(next) => { if (!next) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-heading text-3xl font-bold uppercase">
              <TriangleAlertIcon aria-hidden="true" className="size-6 text-primary" />
              Lock {confirming?.teamName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This is final. A lock cannot be changed, removed or undone, and it counts towards your
              public {confirming?.candidate.league.name} record whichever way the match goes. It also
              spends your one call for that day in this league.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirming) lock(confirming.candidate, confirming.teamId, confirming.teamName); }}>
              Lock it for good
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dock>
  );
}

/**
 * Both docks, stacked at the edge of every page: what is still being considered,
 * and what has already been committed to.
 */
export function SlipDock({ candidates, locked }: { candidates: SlipCandidate[]; locked: LockedGame[] }) {
  return (
    // Above the mobile member bar rather than under it, and out of the way of
    // the page itself: these are companions to what is being read, never the
    // thing in front of it.
    <div className="fixed right-0 bottom-20 z-40 flex max-h-[80vh] flex-col items-end gap-2 md:bottom-0">
      <LockPanel games={locked} />
      <SlipPanel candidates={candidates} />
    </div>
  );
}
