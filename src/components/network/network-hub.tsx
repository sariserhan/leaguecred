"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  BellRingIcon,
  CheckIcon,
  GitCompareArrowsIcon,
  Settings2Icon,
  ShieldAlertIcon,
  TrophyIcon,
  UserMinusIcon,
  UserRoundCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import { followSpecialist } from "@/app/leagues/actions";
import { switchSpecialist, unfollowSpecialist } from "@/app/network/actions";
import { saveNotificationPreferences } from "@/app/notifications/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/components/ui/toast";
import type { NetworkHubData, NetworkLeague, NetworkSpecialist } from "@/data/network";
import type { NotificationPreferences } from "@/data/notifications";

const preferenceOptions: Array<{ key: keyof NotificationPreferences; label: string; description: string }> = [
  { key: "lockDeadlines", label: "Lock deadlines", description: "Reminders before a matchweek closes." },
  { key: "specialistLocks", label: "Specialist locks", description: "When someone you follow submits a call." },
  { key: "pickResults", label: "My results", description: "Results for your independent Daily Locks." },
  { key: "followedResults", label: "Followed results", description: "Results for calls copied to your Weekly Slip." },
];

function recordLabel(specialist: NetworkSpecialist) {
  const accuracy = specialist.settledPicks ? (specialist.wins / specialist.settledPicks) * 100 : 0;
  return `${accuracy.toFixed(1)}% · ${specialist.settledPicks} settled · adjusted ${(specialist.adjustedAccuracy * 100).toFixed(1)}%`;
}

function ConfirmAction({ trigger, title, description, confirmLabel, destructive = false, onConfirm }: { trigger: React.ReactElement; title: string; description: string; confirmLabel: string; destructive?: boolean; onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return <AlertDialog open={open} onOpenChange={setOpen}><AlertDialogTrigger render={trigger} /><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{title}</AlertDialogTitle><AlertDialogDescription>{description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant={destructive ? "destructive" : "default"} onClick={() => { setOpen(false); onConfirm(); }}>{confirmLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

function FollowedSpecialist({ league, specialist, busy, onUnfollow }: {
  league: NetworkLeague;
  specialist: NetworkSpecialist;
  busy: boolean;
  onUnfollow: (specialist: NetworkSpecialist) => void;
}) {
  const unavailable = !league.enabled || !specialist.rankable;
  return (
    <div className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center">
      <Avatar className="size-10"><AvatarFallback>{specialist.initials}</AvatarFallback></Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/specialists/${specialist.id}`} className="font-bold hover:text-primary">{specialist.name}</Link>
          {unavailable ? <Badge variant="destructive"><ShieldAlertIcon data-icon="inline-start" />{league.enabled ? "No longer ranked" : "League inactive"}</Badge> : <Badge variant="outline"><CheckIcon data-icon="inline-start" />Active</Badge>}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{recordLabel(specialist)} · {specialist.followers} followers</p>
      </div>
      <ConfirmAction trigger={<Button variant="outline" size="sm" disabled={busy}><UserMinusIcon data-icon="inline-start" />Unfollow</Button>} title={`Unfollow ${specialist.name}?`} description={`Future ${league.name} calls from this specialist will no longer appear in your network. Existing Weekly Slip entries stay attributed.`} confirmLabel="Unfollow" destructive onConfirm={() => onUnfollow(specialist)} />
    </div>
  );
}

function LeagueCard({ league, pendingKey, onFollow, onSwitch, onUnfollow }: {
  league: NetworkLeague;
  pendingKey: string;
  onFollow: (league: NetworkLeague, specialist: NetworkSpecialist) => void;
  onSwitch: (league: NetworkLeague, from: NetworkSpecialist, to: NetworkSpecialist) => void;
  onUnfollow: (league: NetworkLeague, specialist: NetworkSpecialist) => void;
}) {
  const current = league.followed[0];
  return (
    <Card className="rounded-none">
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-bold uppercase"><Link href={`/leagues/${league.slug}`} className="hover:text-primary">{league.name}</Link></CardTitle>
        <CardDescription>{league.kind === "know" ? "A league you know" : league.kind === "help" ? "A league where you want help" : "Kept here because you follow a specialist"}</CardDescription>
        <CardAction><Badge variant={league.kind === "know" ? "secondary" : "outline"}>{league.kind === "know" ? "I know this" : league.kind === "help" ? "Help wanted" : "Following"}</Badge></CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide">Following</h3>
          {league.followed.length ? <div className="grid gap-2">{league.followed.map((specialist) => <FollowedSpecialist key={specialist.id} league={league} specialist={specialist} busy={Boolean(pendingKey)} onUnfollow={(item) => onUnfollow(league, item)} />)}</div> : <p className="border border-dashed p-4 text-sm text-muted-foreground">You are not following a specialist in this league yet.</p>}
        </div>
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wide">Proven alternatives</h3>
            <Link href={`/specialists?league=${encodeURIComponent(league.name)}`} className="flex items-center gap-1 text-sm font-semibold hover:text-primary"><GitCompareArrowsIcon className="size-4" />Compare all</Link>
          </div>
          {league.alternatives.length ? <div className="divide-y border">{league.alternatives.map((specialist) => {
            const key = `${league.id}:${specialist.id}`;
            return <div key={specialist.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><Link href={`/specialists/${specialist.id}`} className="font-bold hover:text-primary">{specialist.name}</Link><p className="mt-1 text-sm text-muted-foreground">{recordLabel(specialist)} · {specialist.followers} followers</p></div>{current ? <ConfirmAction trigger={<Button size="sm" disabled={Boolean(pendingKey)}><UserRoundCheckIcon data-icon="inline-start" />{pendingKey === key ? "Saving…" : `Switch from ${current.name.split(" ")[0]}`}</Button>} title={`Switch to ${specialist.name}?`} description={`This replaces ${current.name} as your ${league.name} specialist for future calls. Existing Weekly Slip entries will not change.`} confirmLabel="Switch specialist" onConfirm={() => onSwitch(league, current, specialist)} /> : <Button size="sm" disabled={Boolean(pendingKey)} onClick={() => onFollow(league, specialist)}><UserRoundCheckIcon data-icon="inline-start" />{pendingKey === key ? "Saving…" : "Follow"}</Button>}</div>;
          })}</div> : <p className="border border-dashed p-4 text-sm text-muted-foreground">No other specialists currently meet the ranking threshold.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function NetworkHub({ initialData, initialPreferences }: { initialData: NetworkHubData; initialPreferences: NotificationPreferences }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pendingKey, setPendingKey] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const known = initialData.leagues.filter((league) => league.kind === "know");
  const help = initialData.leagues.filter((league) => league.kind === "help");
  const other = initialData.leagues.filter((league) => league.kind === "followed");
  const leagueSections = [
    { title: "Leagues I know", description: "Your independent locks build your own public record here.", leagues: known, icon: TrophyIcon },
    { title: "Leagues where I want help", description: "Follow or switch to a proven specialist before choosing a call.", leagues: help, icon: UsersRoundIcon },
    { title: "Other followed leagues", description: "These remain visible until you unfollow their specialists or add them to your preferences.", leagues: other, icon: UserRoundCheckIcon },
  ];

  function complete(result: { ok: true } | { ok: false; message: string }, success: string) {
    setMessage(result.ok ? success : result.message);
    toast.add({ title: result.ok ? "Network updated" : "Update failed", description: result.ok ? success : result.message, type: result.ok ? "success" : "error" });
    setPendingKey("");
    if (result.ok) router.refresh();
  }

  function follow(league: NetworkLeague, specialist: NetworkSpecialist) {
    setPendingKey(`${league.id}:${specialist.id}`);
    startTransition(async () => complete(await followSpecialist(specialist.id, league.id), `${specialist.name} is now in your network.`));
  }

  function switchTo(league: NetworkLeague, from: NetworkSpecialist, to: NetworkSpecialist) {
    setPendingKey(`${league.id}:${to.id}`);
    startTransition(async () => complete(await switchSpecialist(from.id, to.id, league.id), `Switched to ${to.name}. Existing Weekly Slip entries were kept.`));
  }

  function unfollow(league: NetworkLeague, specialist: NetworkSpecialist) {
    setPendingKey(`${league.id}:${specialist.id}`);
    startTransition(async () => complete(await unfollowSpecialist(specialist.id, league.id), `Unfollowed ${specialist.name}. Existing Weekly Slip entries were kept.`));
  }

  function togglePreference(key: keyof NotificationPreferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    startTransition(async () => {
      await saveNotificationPreferences(next);
      setMessage("Notification settings saved.");
      toast.add({ title: "Notifications updated", description: "Your notification preferences are saved.", type: "success" });
    });
  }

  const actions = { pendingKey, onFollow: follow, onSwitch: switchTo, onUnfollow: unfollow };
  return (
    <div className="page-shell py-8 sm:py-12">
      <header className="border-b border-inverted bg-inverted px-5 py-8 text-inverted-foreground sm:px-8 sm:py-10">
        <p className="font-semibold text-primary">Your football network</p>
        <h1 className="mt-2 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">Network control</h1>
        <p className="mt-4 max-w-2xl text-inverted-foreground/75">Keep your league knowledge, proven specialists, alerts, and Weekly Slip working together.</p>
      </header>

      <section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-4" aria-label="Network summary">
        {[["Leagues you know", initialData.summary.known], ["Help wanted", initialData.summary.help], ["Specialists followed", initialData.summary.followed], ["Needs attention", initialData.summary.attention]].map(([label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><strong className="block font-heading text-4xl leading-none">{value}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></div>)}
      </section>

      <p className="mt-4 min-h-6 text-sm font-semibold text-primary" role="status" aria-live="polite">{isPending && !message ? "Updating your network…" : message}</p>

      {initialData.leagues.length === 0 ? <Card className="mt-5 rounded-none"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Build your network</CardTitle><CardDescription>Choose the leagues you know and where you want specialist help.</CardDescription></CardHeader><CardFooter><Link href="/onboarding" className={buttonVariants({ size: "lg" })}>Choose leagues<ArrowRightIcon data-icon="inline-end" /></Link></CardFooter></Card> : null}

      {leagueSections.map(({ title, description, leagues, icon: Icon }) => leagues.length ? <section key={title} className="mt-10"><div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="section-title">{title}</h2><p className="mt-2 text-muted-foreground">{description}</p></div><Icon aria-hidden="true" className="size-7 text-primary" /></div><div className="grid gap-5 xl:grid-cols-2">{leagues.map((league) => <LeagueCard key={league.id} league={league} {...actions} />)}</div></section> : null)}

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <Card className="rounded-none">
          <CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">League preferences</CardTitle><CardDescription>Edit which leagues you know and which ones should drive specialist recommendations.</CardDescription><CardAction><Settings2Icon className="size-6 text-primary" /></CardAction></CardHeader>
          <CardFooter><Link href="/onboarding" className={buttonVariants({ variant: "outline", size: "lg" })}>Edit league preferences<ArrowRightIcon data-icon="inline-end" /></Link></CardFooter>
        </Card>
        <Card className="rounded-none">
          <CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Weekly Slip effect</CardTitle><CardDescription>Changing your network affects future specialist calls. Calls already copied to your slip stay attached to the original specialist for an honest audit trail.</CardDescription><CardAction><TrophyIcon className="size-6 text-primary" /></CardAction></CardHeader>
          <CardFooter><Link href="/slip" className={buttonVariants({ variant: "outline", size: "lg" })}>Review Weekly Slip<ArrowRightIcon data-icon="inline-end" /></Link></CardFooter>
        </Card>
      </section>

      <Card className="mt-5 rounded-none">
        <CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Notification settings</CardTitle><CardDescription>Choose which network events should reach your notification center.</CardDescription><CardAction><BellRingIcon className="size-6 text-primary" /></CardAction></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {preferenceOptions.map((option) => <div key={option.key} className="flex items-center justify-between gap-4 border p-4"><div><strong className="block">{option.label}</strong><p className="mt-1 text-sm text-muted-foreground">{option.description}</p></div><Toggle variant="outline" pressed={preferences[option.key]} disabled={isPending} onPressedChange={() => togglePreference(option.key)} aria-label={`${option.label}: ${preferences[option.key] ? "on" : "off"}`}>{preferences[option.key] ? "On" : "Off"}</Toggle></div>)}
        </CardContent>
        <Separator />
        <CardFooter className="text-sm text-muted-foreground"><BellRingIcon className="mr-2 size-4" />Settings also apply to the notification bell in the site header.</CardFooter>
      </Card>
    </div>
  );
}
