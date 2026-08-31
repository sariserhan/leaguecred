"use client";

import { AwardIcon, CheckIcon, LockKeyholeIcon, Share2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { SpecialistProfileData } from "@/data/specialists";
import { MINIMUM_SETTLED_PICKS_FOR_RANK } from "@/lib/reputation";

export function ProfileMilestones({ data }: { data: SpecialistProfileData }) {
  const earned = {
    firstLock: data.totals.settledPicks >= 1,
    firstWin: data.totals.wins >= 1,
    evidence: data.totals.settledPicks >= 5,
    ranked: data.leagues.some((league) => league.settledPicks >= MINIMUM_SETTLED_PICKS_FOR_RANK),
    followed: data.specialist.followers >= 1,
  };
  const milestones = [
    ["First lock", "Settle one independent call", earned.firstLock],
    ["First correct call", "Put the first win on your record", earned.firstWin],
    ["Evidence builder", "Settle five independent calls", earned.evidence],
    ["Rank eligible", `Reach ${MINIMUM_SETTLED_PICKS_FOR_RANK} locks in one league`, earned.ranked],
    ["Trusted voice", "Earn your first follower", earned.followed],
  ] as const;
  const accuracy = data.totals.settledPicks ? Math.round((data.totals.wins / data.totals.settledPicks) * 100) : 0;

  async function shareRecord() {
    const text = `${data.specialist.name} on LeagueCred: ${data.totals.wins}-${data.totals.losses}, ${accuracy}% across ${data.totals.settledPicks} independent Weekly Locks.`;
    try {
      if (navigator.share) await navigator.share({ title: `${data.specialist.name}'s LeagueCred record`, text, url: window.location.href });
      else await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      toast.add({ title: "Record ready to share", description: "Your record card is ready.", type: "success" });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.add({ title: "Could not share record", description: "Copy the profile URL and try again.", type: "error" });
    }
  }

  return <section className="mb-8 grid border lg:grid-cols-[1fr_360px]" aria-labelledby="milestones-heading"><div><header className="border-b px-5 py-4"><h2 id="milestones-heading" className="font-heading text-3xl font-bold uppercase">Profile milestones</h2><p className="mt-1 text-sm text-muted-foreground">Visible progress without noisy celebration.</p></header><ol className="divide-y">{milestones.map(([title, description, complete]) => <li key={title} className="flex items-center gap-3 px-5 py-3"><span className={complete ? "flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground" : "flex size-8 items-center justify-center rounded-full border text-muted-foreground"}>{complete ? <CheckIcon aria-hidden="true" className="size-4" /> : <LockKeyholeIcon aria-hidden="true" className="size-3.5" />}</span><span><strong className="block">{title}</strong><span className="text-xs text-muted-foreground">{description}</span></span></li>)}</ol></div><aside className="flex flex-col justify-between bg-foreground p-6 text-background lg:border-l"><div><AwardIcon aria-hidden="true" className="size-7 text-primary" /><p className="mt-8 text-xs font-bold tracking-[0.12em] text-primary uppercase">Shareable record card</p><strong className="mt-2 block font-heading text-5xl leading-none uppercase">{data.totals.wins}–{data.totals.losses}</strong><p className="mt-2 text-background/70">{accuracy}% accuracy · {data.totals.settledPicks} independent locks</p></div><Button className="mt-8 w-full" onClick={shareRecord}><Share2Icon data-icon="inline-start" />Share record</Button></aside></section>;
}
