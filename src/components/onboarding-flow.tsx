"use client";

import { useDeferredValue, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CheckIcon, MapPinIcon, SearchIcon, ShieldCheckIcon } from "lucide-react";
import { saveLeaguePreferences } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { IdentityTeam } from "@/data/distribution";
import type { LeaguePreferences } from "@/data/league-preferences";
import { cn } from "@/lib/utils";

type League = { name: string; slug: string; country: string };

export function OnboardingFlow({ leagues, teams, initialPreferences, initialTeamId, initialRegion, nextPath }: { leagues: League[]; teams: IdentityTeam[]; initialPreferences: LeaguePreferences; initialTeamId: string | null; initialRegion: string | null; /** Where this person was going before they were asked to sign up. Empty when they simply arrived here. */ nextPath?: string }) {
  const [step, setStep] = useState(0), [known, setKnown] = useState<string[]>(initialPreferences.known), [help, setHelp] = useState<string[]>(initialPreferences.help);
  const [teamId, setTeamId] = useState<string | null>(initialTeamId), [region, setRegion] = useState(initialRegion ?? ""), [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [error, setError] = useState(""), [pending, startTransition] = useTransition();
  const selected = step === 0 ? known : help, setSelected = step === 0 ? setKnown : setHelp;
  const eligibleTeams = teams.filter((team) => known.includes(team.leagueSlug) && (!deferredQuery || `${team.name} ${team.leagueName} ${team.country}`.toLowerCase().includes(deferredQuery)));
  const chosenTeam = teams.find((team) => team.id === teamId) ?? null;

  function toggle(slug: string) { setSelected(selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug]); }
  function continueFlow() {
    setError("");
    if (step === 0) { setHelp((current) => current.filter((slug) => !known.includes(slug))); if (chosenTeam && !known.includes(chosenTeam.leagueSlug)) setTeamId(null); setStep(1); return; }
    if (step === 1) { setStep(2); return; }
    startTransition(async () => {
      const result = await saveLeaguePreferences({ known, help, primaryTeamId: teamId, region });
      if (result.ok) { setStep(3); toast.add({ title: "Football identity saved", description: "Your club, leagues, and recommendations now work together.", type: "success" }); }
      else { setError(result.message); toast.add({ title: "Preferences not saved", description: result.message, type: "error" }); }
    });
  }

  return <main className="page-shell max-w-4xl py-12 sm:py-20">
    <h1 className="display-title">Build your football identity.</h1>
    <ol className="mt-8 grid grid-cols-4 border-y py-4 text-center text-xs font-bold uppercase sm:text-sm">{["Know", "Help", "Club", "Lock"].map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} className={index === step ? "text-primary" : "text-muted-foreground"}>{index + 1}. {label}</li>)}</ol>
    {step < 2 ? <section className="mt-8">
      <h2 className="section-title">{step === 0 ? "Leagues I know" : "Leagues I want help with"}</h2><p className="mt-2 text-muted-foreground">{step === 0 ? "Choose leagues you follow closely." : "Choose leagues where specialist guidance would help."}</p>
      <div className="mt-6 divide-y border-y">{leagues.filter((league) => step === 0 || !known.includes(league.slug)).map((league) => <button key={league.slug} type="button" aria-pressed={selected.includes(league.slug)} onClick={() => toggle(league.slug)} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"><span className="flex size-6 items-center justify-center border">{selected.includes(league.slug) ? <CheckIcon className="size-4" /> : null}</span><strong>{league.name}</strong><span className="ml-auto text-sm text-muted-foreground">{league.country}</span></button>)}</div>
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}<Button className="mt-6 w-full" size="lg" onClick={continueFlow} disabled={!selected.length || pending}>Continue</Button>
    </section> : step === 2 ? <section className="mt-8">
      <h2 className="section-title">Which club do you represent?</h2><p className="mt-2 max-w-2xl text-muted-foreground">Choose one primary club. It gives your profile and contributions a clear football identity. You can change it later.</p>
      <FieldGroup className="mt-6"><Field><FieldLabel htmlFor="club-search">Find your club</FieldLabel><div className="relative"><SearchIcon aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="club-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clubs in your leagues" className="pl-10" /></div></Field>
        <div className="max-h-[430px] overflow-y-auto border" role="listbox" aria-label="Choose your primary club">{eligibleTeams.map((team) => <button key={team.id} type="button" role="option" aria-selected={team.id === teamId} onClick={() => setTeamId(team.id)} className={cn("flex w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted", team.id === teamId && "bg-primary text-primary-foreground")}><span className="flex size-10 shrink-0 items-center justify-center">{team.logoUrl ? <Image src={team.logoUrl} alt="" width={40} height={40} className="size-10 object-contain" /> : <ShieldCheckIcon className="size-6" />}</span><span className="min-w-0 flex-1"><strong className="block truncate">{team.name}</strong><span className={cn("text-xs", team.id === teamId ? "text-primary-foreground/75" : "text-muted-foreground")}>{team.leagueName} · {team.country}</span></span>{team.id === teamId ? <CheckIcon className="size-5" /> : null}</button>)}{eligibleTeams.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">No matching club was found in the leagues you selected.</p> : null}</div>
        <Field><FieldLabel htmlFor="home-region">Your region <span className="font-normal text-muted-foreground">(optional)</span></FieldLabel><div className="relative"><MapPinIcon aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="home-region" value={region} onChange={(event) => setRegion(event.target.value)} maxLength={80} placeholder="City or region" className="pl-10" /></div></Field></FieldGroup>
      {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}<div className="mt-6 flex flex-col gap-3 sm:flex-row"><Button variant="outline" size="lg" onClick={() => setStep(1)}>Back</Button><Button size="lg" className="flex-1" onClick={continueFlow} disabled={!teamId || pending}>{pending ? <Spinner data-icon="inline-start" /> : null}Save my identity</Button></div>
    </section> : <section className="mt-10 grid gap-6 border bg-inverted p-7 text-inverted-foreground md:grid-cols-[1fr_auto] md:items-center"><div><h2 className="section-title">You represent {chosenTeam?.name ?? "your community"}.</h2><p className="mt-3 text-inverted-foreground/70">Your football identity and specialist network are ready. Your first contribution is one selective Daily Lock.</p></div><div className="flex flex-col gap-3"><Link href={nextPath || `/leagues/${known[0]}`} className="inline-flex h-12 items-center justify-center bg-primary px-6 font-bold text-primary-foreground">Make my first Daily Lock</Link><Link href="/invite" className="text-center text-sm font-semibold text-primary underline">Invite another supporter</Link></div></section>}
  </main>;
}
