"use client";

import { FormEvent, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRingIcon, ClockIcon, KeyRoundIcon, ShieldAlertIcon, UserRoundIcon, UsersRoundIcon } from "lucide-react";

import { saveNotificationPreferences } from "@/app/notifications/actions";
import { updateProfile } from "@/app/settings/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { toast } from "@/components/ui/toast";
import type { NotificationPreferences } from "@/data/notifications";
import { authClient } from "@/lib/auth-client";

const preferenceLabels: Array<[keyof NotificationPreferences, string, string]> = [
  ["lockDeadlines", "Lock deadlines", "Before a matchweek closes"],
  ["specialistLocks", "Specialist locks", "When someone you follow locks"],
  ["pickResults", "My results", "Your independent results"],
  ["followedResults", "Followed results", "Calls copied to your slip"],
];

export function AccountSettings({ user, leagues, initialPreferences }: { user: { id:string;name:string;email:string;bio:string|null;image:string|null;profile_theme:string;featured_league_id:string|null;pinned_milestone:string|null }; leagues:Array<{id:string;name:string}>; initialPreferences: NotificationPreferences }) {
  const router = useRouter();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [message, setMessage] = useState("");
  const [digest, setDigest] = useState("Instant");
  const [quietHours, setQuietHours] = useState(false);
  const [profileTheme, setProfileTheme] = useState(user.profile_theme);
  const [bio, setBio] = useState(user.bio??"");
  const [isPending, startTransition] = useTransition();

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data=new FormData(event.currentTarget);const name=String(data.get("name")??"");
    startTransition(async () => {
      const result = await updateProfile({ name,bio:String(data.get("bio")??""),image:String(data.get("image")??""),profileTheme:data.get("profileTheme") as "pitch-dark"|"paper-light"|"high-contrast",featuredLeagueId:String(data.get("featuredLeagueId")||"")||null,pinnedMilestone:String(data.get("pinnedMilestone")||"")||null });
      setMessage(result.message);
      toast.add({ title: result.ok ? "Profile updated" : "Profile update failed", description: result.message, type: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  }

  function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword.length < 10) { setMessage("New password must be at least 10 characters."); return; }
    startTransition(async () => {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
      setMessage(result.error?.message ?? "Password changed and other sessions signed out.");
      toast.add({ title: result.error ? "Password change failed" : "Password changed", description: result.error?.message ?? "Other active sessions were signed out.", type: result.error ? "error" : "success" });
      if (!result.error) form.reset();
    });
  }

  function togglePreference(key: keyof NotificationPreferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    startTransition(async () => { await saveNotificationPreferences(next); setMessage("Notification settings saved."); toast.add({ title: "Notifications updated", description: "Your preferences are saved.", type: "success" }); });
  }

  return <main className="page-shell py-8 sm:py-12">
    <header className="border-b border-foreground bg-foreground px-5 py-8 text-background sm:px-8 sm:py-10"><p className="font-semibold text-primary">Account control</p><h1 className="mt-2 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">Settings</h1><p className="mt-4 max-w-2xl text-background/75">Keep your identity, security, leagues, and alerts current.</p></header>
    <p className="mt-4 min-h-6 text-sm font-semibold text-primary" role="status" aria-live="polite">{isPending && !message ? "Saving…" : message}</p>
    <div className="mt-4 grid gap-5 lg:grid-cols-2">
      <Card className="rounded-none"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Public profile</CardTitle><CardDescription>Shape the identity shown beside your permanent record.</CardDescription><CardAction><UserRoundIcon className="size-6 text-primary" /></CardAction></CardHeader><CardContent><form onSubmit={saveProfile}><FieldGroup><Field><FieldLabel htmlFor="name">Display name</FieldLabel><Input id="name" name="name" defaultValue={user.name} minLength={2} maxLength={80} required /></Field><Field><FieldLabel htmlFor="bio">Short bio</FieldLabel><Input id="bio" name="bio" value={bio} onChange={e=>setBio(e.target.value)} maxLength={160}/><FieldDescription>{bio.length}/160 characters</FieldDescription></Field><Field><FieldLabel htmlFor="image">Avatar URL</FieldLabel><Input id="image" name="image" type="url" defaultValue={user.image??""}/></Field><Field><FieldLabel htmlFor="featuredLeagueId">Featured league</FieldLabel><select id="featuredLeagueId" name="featuredLeagueId" defaultValue={user.featured_league_id??""} className="h-10 border bg-background px-3"><option value="">None</option>{leagues.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field><Field><FieldLabel htmlFor="profileTheme">Profile theme</FieldLabel><select id="profileTheme" name="profileTheme" value={profileTheme} onChange={e=>setProfileTheme(e.target.value)} className="h-10 border bg-background px-3"><option value="pitch-dark">Pitch dark</option><option value="paper-light">Paper light</option><option value="high-contrast">High contrast</option></select></Field><Field><FieldLabel htmlFor="pinnedMilestone">Pinned milestone</FieldLabel><select id="pinnedMilestone" name="pinnedMilestone" defaultValue={user.pinned_milestone??""} className="h-10 border bg-background px-3"><option value="">None</option><option>First lock</option><option>First correct call</option><option>Evidence builder</option><option>Rank eligible</option><option>Trusted voice</option></select></Field><Field><FieldLabel htmlFor="email">Email</FieldLabel><Input id="email" value={user.email} disabled /></Field><Button type="submit" disabled={isPending}>{isPending?<Spinner data-icon="inline-start"/>:null}Save profile</Button></FieldGroup></form></CardContent><CardFooter><Link href={`/specialists/${user.id}`} className={buttonVariants({variant:"outline"})}>View public profile</Link></CardFooter></Card>
      <Card className="rounded-none"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Password</CardTitle><CardDescription>Changing it signs out your other active sessions.</CardDescription><CardAction><KeyRoundIcon className="size-6 text-primary" /></CardAction></CardHeader><CardContent><form onSubmit={changePassword}><FieldGroup><Field><FieldLabel htmlFor="currentPassword">Current password</FieldLabel><Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required /></Field><Field><FieldLabel htmlFor="newPassword">New password</FieldLabel><Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required /><FieldDescription>Use at least 10 characters.</FieldDescription></Field><Button type="submit" disabled={isPending}>{isPending ? <Spinner data-icon="inline-start" /> : null}Change password</Button></FieldGroup></form></CardContent></Card>
      <Card className="rounded-none lg:col-span-2"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Notifications</CardTitle><CardDescription>Choose what appears in your LeagueCred notification center.</CardDescription><CardAction><BellRingIcon className="size-6 text-primary" /></CardAction></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{preferenceLabels.map(([key, label, description]) => <div key={key} className="flex items-center justify-between gap-4 border p-4"><div><strong className="block">{label}</strong><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Toggle pressed={preferences[key]} variant="outline" disabled={isPending} onPressedChange={() => togglePreference(key)} aria-label={`${label}: ${preferences[key] ? "on" : "off"}`}>{preferences[key] ? "On" : "Off"}</Toggle></div>)}</CardContent></Card>
      <Card className="rounded-none"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Delivery rhythm</CardTitle><CardDescription>Control when alerts ask for your attention.</CardDescription><CardAction><ClockIcon className="size-6 text-primary"/></CardAction></CardHeader><CardContent className="grid gap-4"><Field><FieldLabel htmlFor="digest">Digest frequency</FieldLabel><select id="digest" value={digest} onChange={e=>setDigest(e.target.value)} className="h-10 border bg-background px-3"><option>Instant</option><option>Daily digest</option><option>Weekly digest</option></select></Field><div className="flex items-center justify-between border p-4"><div><strong>Quiet hours</strong><p className="text-sm text-muted-foreground">Mute non-deadline alerts from 22:00–08:00.</p></div><Toggle pressed={quietHours} onPressedChange={setQuietHours} variant="outline">{quietHours?"On":"Off"}</Toggle></div><p className="text-xs text-muted-foreground">Delivery controls are saved on this device while channel delivery is being prepared.</p></CardContent></Card>
      <Card className="rounded-none"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">League setup</CardTitle><CardDescription>Update the leagues you know and where you want help.</CardDescription><CardAction><UsersRoundIcon className="size-6 text-primary" /></CardAction></CardHeader><CardFooter className="gap-2"><Link href="/onboarding" className={buttonVariants({ variant: "outline" })}>Edit leagues</Link><Link href="/network" className={buttonVariants()}>Manage network</Link></CardFooter></Card>
      <Card className="rounded-none"><CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Account lifecycle</CardTitle><CardDescription>Your records are permanent evidence and cannot be selectively erased.</CardDescription><CardAction><ShieldAlertIcon className="size-6 text-primary" /></CardAction></CardHeader><CardContent><Alert><ShieldAlertIcon /><AlertTitle>Deletion requires support review</AlertTitle><AlertDescription>To protect settled records and source attribution, account removal is handled as an anonymization request. Contact support from your registered email.</AlertDescription></Alert></CardContent><CardFooter><Button variant="destructive" disabled>Request account deletion</Button></CardFooter></Card>
    </div>
  </main>;
}
