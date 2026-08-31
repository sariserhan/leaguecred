"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { saveLeaguePreferences } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { LeaguePreferences } from "@/data/league-preferences";
type League = { name: string; slug: string; country: string };

export function OnboardingFlow({ leagues, initialPreferences }: { leagues: League[]; initialPreferences: LeaguePreferences }) {
  const [step,setStep]=useState(0), [known,setKnown]=useState<string[]>(initialPreferences.known), [help,setHelp]=useState<string[]>(initialPreferences.help);
  const [error,setError]=useState(""), [pending,startTransition]=useTransition();
  const selected=step===0?known:help, setSelected=step===0?setKnown:setHelp;
  const toggle=(slug:string)=>setSelected(selected.includes(slug)?selected.filter(x=>x!==slug):[...selected,slug]);
  function continueFlow(){setError("");if(step===0){setHelp(current=>current.filter(slug=>!known.includes(slug)));setStep(1);return}startTransition(async()=>{const result=await saveLeaguePreferences({known,help});if(result.ok){setStep(2);toast.add({title:"League preferences saved",description:"Your recommendations and network are now personalized.",type:"success"})}else{setError(result.message);toast.add({title:"Preferences not saved",description:result.message,type:"error"})}})}
  return <main className="page-shell max-w-3xl py-12 sm:py-20"><h1 className="display-title">Build your football network.</h1><ol className="mt-8 grid grid-cols-3 border-y py-4 text-center text-sm font-bold uppercase">{["Know","Help","Lock"].map((x,i)=><li key={x} aria-current={i===step?"step":undefined} className={i===step?"text-primary":"text-muted-foreground"}>{i+1}. {x}</li>)}</ol>{step<2?<section className="mt-8"><h2 className="section-title">{step===0?"Leagues I know":"Leagues I want help with"}</h2><p className="mt-2 text-muted-foreground">{step===0?"Choose leagues you follow closely.":"Choose leagues where specialist guidance would help."}</p><div className="mt-6 divide-y border-y">{leagues.filter(l=>step===0||!known.includes(l.slug)).map(l=><button key={l.slug} type="button" aria-pressed={selected.includes(l.slug)} onClick={()=>toggle(l.slug)} className="flex w-full items-center gap-3 px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 hover:bg-muted"><span className="flex size-6 items-center justify-center border">{selected.includes(l.slug)?<CheckIcon className="size-4"/>:null}</span><strong>{l.name}</strong><span className="ml-auto text-sm text-muted-foreground">{l.country}</span></button>)}</div>{error?<p className="mt-4 text-sm text-destructive" role="alert">{error}</p>:null}<Button className="mt-6 w-full" size="lg" onClick={continueFlow} disabled={!selected.length||pending}>{pending?<Spinner data-icon="inline-start"/>:null}{step===1?"Save preferences":"Continue"}</Button></section>:<section className="mt-10 border bg-foreground p-7 text-background"><h2 className="section-title">Your preferences are saved.</h2><p className="mt-3 text-background/70">Your dashboard and league discovery now follow your football network across devices.</p><Link href={`/leagues/${known[0]}`} className="mt-6 inline-flex h-12 items-center bg-primary px-6 font-bold text-primary-foreground">Make my first Weekly Lock</Link></section>}</main>;
}
