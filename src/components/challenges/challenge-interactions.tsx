"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useFormStatus } from "react-dom";
import { CheckIcon, CopyIcon, Share2Icon, UsersRoundIcon } from "lucide-react";

import { chooseChallengeSide } from "@/app/challenges/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ChoiceProps = {
  challengeId: string;
  side: { id: string; name: string };
  signedIn: boolean;
  selected: boolean;
  compact?: boolean;
  className?: string;
};

const subscribeToClient = () => () => {};

function ConfirmButton({ teamName }: { teamName: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}Confirm {teamName}</Button>;
}

export function SideChoice({ challengeId, side, signedIn, selected, compact = false, className }: ChoiceProps) {
  const label = selected ? `You represent ${side.name}` : compact ? side.name : `Choose ${side.name}`;
  if (selected) return <Button className={cn("w-full", className)} size={compact ? "default" : "lg"} disabled><CheckIcon data-icon="inline-start" />{label}</Button>;
  if (!signedIn) return <Link href={`/auth?next=${encodeURIComponent(`/challenges/${challengeId}`)}`} className={buttonVariants({ variant: "outline", size: compact ? "default" : "lg", className: cn("w-full", className) })}>{label}</Link>;

  return <Dialog>
    <DialogTrigger render={<Button type="button" variant="outline" size={compact ? "default" : "lg"} className={cn("w-full", className)} />}>{label}</DialogTrigger>
    <DialogContent className="rounded-none sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="font-heading text-4xl font-extrabold uppercase">Represent {side.name}?</DialogTitle>
        <DialogDescription className="text-base leading-7">This sets {side.name} as your public club identity. Your future community contribution will count toward this side, and changing from another club will update the club shown on your profile.</DialogDescription>
      </DialogHeader>
      <div className="border-l-4 border-primary bg-muted p-4 text-sm"><strong className="block">Your permanent picks do not change.</strong><span className="text-muted-foreground">Only the community you represent from now on is updated.</span></div>
      <form action={chooseChallengeSide}>
        <input type="hidden" name="challengeId" value={challengeId} />
        <input type="hidden" name="teamId" value={side.id} />
        <DialogFooter><DialogClose render={<Button type="button" variant="ghost" />}>Cancel</DialogClose><ConfirmButton teamName={side.name} /></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}

function getCountdown(kickoffAt: string) {
  const distance = new Date(kickoffAt).getTime() - Date.now();
  if (distance <= 0) return "Kickoff is here";
  const totalMinutes = Math.floor(distance / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor(totalMinutes % 1_440 / 60);
  const minutes = totalMinutes % 60;
  return days ? `${days}d ${hours}h to kickoff` : `${hours}h ${minutes}m to kickoff`;
}

export function KickoffCountdown({ kickoffAt }: { kickoffAt: string }) {
  const [label, setLabel] = useState("Countdown loading…");
  useEffect(() => {
    const update = () => setLabel(getCountdown(kickoffAt));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [kickoffAt]);
  return <strong className="mt-3 block font-heading text-2xl text-primary" role="timer">{label}</strong>;
}

export function ChallengeShareCard({ challengeId, homeName, awayName, representedName, representedSlug }: { challengeId: string; homeName: string; awayName: string; representedName: string | null; representedSlug: string | null }) {
  const [copied, setCopied] = useState(false);
  const shareTitle = representedName ? `I represent ${representedName} on LeagueCred` : `${homeName} vs ${awayName} on LeagueCred`;
  const path = `/challenges/${challengeId}${representedSlug ? `?side=${encodeURIComponent(representedSlug)}` : ""}`;
  function url() { return `${window.location.origin}${path}`; }
  async function copyInvite() {
    await navigator.clipboard.writeText(`${shareTitle}. Join the community challenge: ${url()}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  }
  async function share() {
    if (navigator.share) await navigator.share({ title: shareTitle, text: "One selective call at a time. Join my side.", url: url() });
    else await copyInvite();
  }
  return <section className="mt-6 grid border bg-inverted text-inverted-foreground lg:grid-cols-[1fr_auto]" aria-labelledby="share-challenge-heading">
    <div className="p-6 sm:p-8"><p className="text-xs font-bold tracking-[.14em] text-primary uppercase">Shareable challenge card</p><h2 id="share-challenge-heading" className="mt-3 font-heading text-4xl font-extrabold uppercase sm:text-5xl">{representedName ? `${representedName} stands here.` : `${homeName} vs ${awayName}`}</h2><p className="mt-3 max-w-2xl text-inverted-foreground/70">{representedName ? `Invite another ${representedName} supporter and build your side with people who know the club.` : "Bring the supporters who know these clubs best into the challenge."}</p></div>
    <div className="flex flex-col justify-center gap-3 border-t border-inverted-foreground/20 p-6 lg:min-w-64 lg:border-t-0 lg:border-l"><Button onClick={share}><Share2Icon data-icon="inline-start" />Share challenge</Button><Button variant="outline" onClick={copyInvite} className="border-inverted-foreground/30 bg-transparent text-inverted-foreground hover:bg-background hover:text-foreground">{copied ? <CheckIcon data-icon="inline-start" /> : <CopyIcon data-icon="inline-start" />}{copied ? "Invite copied" : "Copy invitation"}</Button></div>
  </section>;
}

export function MobileChallengeBar({ challengeId, home, away, signedIn, represented }: { challengeId: string; home: { id: string; name: string }; away: { id: string; name: string }; signedIn: boolean; represented: { name: string; slug: string } | null }) {
  const mounted = useSyncExternalStore(subscribeToClient, () => true, () => false);
  if (!mounted) return null;
  const bar = represented ? <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary bg-background p-3 md:hidden"><div className="mx-auto flex max-w-md items-center gap-3"><div className="min-w-0 flex-1"><span className="block truncate text-xs text-muted-foreground">You represent</span><strong className="block truncate">{represented.name}</strong></div><Link href="/invite" className={buttonVariants()}><UsersRoundIcon data-icon="inline-start" />Invite</Link></div></div> : <div className="fixed inset-x-0 bottom-0 z-40 border-t border-primary bg-background p-3 shadow-[0_-10px_30px_rgba(0,0,0,.15)] md:hidden"><p className="mb-2 text-center text-xs font-bold uppercase text-muted-foreground">Choose your side</p><div className="mx-auto grid max-w-md grid-cols-2 gap-2"><SideChoice challengeId={challengeId} side={home} signedIn={signedIn} selected={false} compact /><SideChoice challengeId={challengeId} side={away} signedIn={signedIn} selected={false} compact /></div></div>;
  return createPortal(bar, document.body);
}
