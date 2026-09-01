"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClockIcon, LockKeyholeIcon, XIcon } from "lucide-react";

import { lockSlipCandidate, removeSlipCandidate } from "@/app/slip/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/ui/crest";
import { LocalTime } from "@/components/local-time";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { SlipCandidate } from "@/data/slip-candidates";

const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The matches a member has set aside, and the one press that turns one into a
 * lock.
 *
 * Both sides are offered on every card. Nothing here has an opinion about which
 * team wins - the slip only remembers that the match was worth a thought - so
 * choosing the side is the act that makes it a lock.
 */
export function SlipShortlist({ candidates }: { candidates: SlipCandidate[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

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

  if (candidates.length === 0) {
    return (
      <p className="border p-6 text-muted-foreground">
        Nothing set aside yet. Add a match from a league page or the{" "}
        <Link href="/live-locks" className="font-semibold text-foreground hover:text-primary">global board</Link>{" "}
        and it waits here until you decide.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {candidates.map((candidate) => {
        const closed = candidate.started || candidate.dayAlreadyLocked;
        return (
          <li key={candidate.fixtureId} className="grid gap-3 border p-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{candidate.league.name}</Badge>
                <span>{dayFormatter.format(new Date(candidate.kickoff))}</span>
                <LocalTime value={candidate.kickoff} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Crest src={candidate.home.logoUrl} size={24} />
                <strong className="font-heading text-lg uppercase">{candidate.home.name}</strong>
                <span className="text-xs text-muted-foreground">v</span>
                <Crest src={candidate.away.logoUrl} size={24} />
                <strong className="font-heading text-lg uppercase">{candidate.away.name}</strong>
              </div>
              {candidate.started ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <ClockIcon className="size-4" />This match has kicked off, so it can no longer be locked.
                </p>
              ) : null}
              {!candidate.started && candidate.dayAlreadyLocked ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <LockKeyholeIcon className="size-4" />You already hold a {candidate.league.name} lock that day. One call a day.
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {closed ? null : [candidate.home, candidate.away].map((team) => (
                <Button
                  key={team.id}
                  size="sm"
                  disabled={pending}
                  onClick={() => lock(candidate, team.id, team.name)}
                >
                  {busy === candidate.fixtureId ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
                  Lock {team.name}
                </Button>
              ))}
              <Button size="sm" variant="ghost" disabled={pending} aria-label={`Remove ${candidate.home.name} against ${candidate.away.name} from your slip`} onClick={() => remove(candidate)}>
                <XIcon />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
