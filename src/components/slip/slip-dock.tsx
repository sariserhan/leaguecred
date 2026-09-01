"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, ClockIcon, LockKeyholeIcon, TicketIcon, XIcon } from "lucide-react";

import { lockSlipCandidate, removeSlipCandidate } from "@/app/slip/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/ui/crest";
import { LocalTime } from "@/components/local-time";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { SlipCandidate } from "@/data/slip-candidates";
import { cn } from "@/lib/utils";

const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
const STORAGE_KEY = "leaguecred-slip-open";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function storedOpen() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // A browser refusing storage still gets a working slip, just not a
    // remembered open state.
    return null;
  }
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
export function SlipDock({ candidates }: { candidates: SlipCandidate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [toggled, setToggled] = useState<boolean | null>(null);
  // Read rather than set in an effect, so the server render and the first
  // client render agree about a slip that was left open.
  const remembered = useSyncExternalStore(subscribe, storedOpen, () => null);
  const open = toggled ?? remembered === "open";

  function setOpen(next: boolean) {
    setToggled(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "open" : "closed");
    } catch {
      // As above.
    }
  }

  function lock(candidate: SlipCandidate, teamId: string, teamName: string) {
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
    // Above the mobile member bar rather than under it, and out of the way of
    // the page itself: the slip is a companion to what is being read, never the
    // thing in front of it.
    <aside
      aria-label="Your slip"
      className={cn(
        "fixed right-0 bottom-20 z-40 flex max-h-[70vh] w-[min(22rem,calc(100vw-1rem))] flex-col border bg-background shadow-lg md:bottom-0",
        open ? "" : "w-auto",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center gap-2 border-b bg-inverted px-4 py-3 text-left font-semibold text-inverted-foreground"
      >
        <TicketIcon aria-hidden="true" className="size-5 text-primary" />
        <span className="font-heading text-lg uppercase">Slip</span>
        <Badge variant={candidates.length > 0 ? "default" : "outline"}>{candidates.length}</Badge>
        <ChevronDownIcon aria-hidden="true" className={cn("ml-auto size-5 transition-transform", open ? "" : "rotate-180")} />
      </button>

      {open ? (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto">
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
                              onClick={() => lock(candidate, team.id, team.name)}
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
        </>
      ) : null}
    </aside>
  );
}
