"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
type League = { name: string; slug: string; country: string };
export function OnboardingFlow({ leagues }: { leagues: League[] }) {
  const [step,setStep]=useState(0), [known,setKnown]=useState<string[]>([]), [help,setHelp]=useState<string[]>([]);
  useEffect(()=>{const saved=localStorage.getItem("leaguecred:onboarding"); if(saved) queueMicrotask(()=>{const value=JSON.parse(saved); setKnown(value.known??[]); setHelp(value.help??[]);});},[]);
  useEffect(()=>localStorage.setItem("leaguecred:onboarding",JSON.stringify({known,help})),[known,help]);
  const selected=step===0?known:help, setSelected=step===0?setKnown:setHelp;
  const toggle=(slug:string)=>setSelected(selected.includes(slug)?selected.filter(x=>x!==slug):[...selected,slug]);
  return <main className="page-shell max-w-3xl py-12 sm:py-20"><h1 className="display-title">Build your football network.</h1><ol className="mt-8 grid grid-cols-3 border-y py-4 text-center text-sm font-bold uppercase">{["Know","Help","Lock"].map((x,i)=><li key={x} aria-current={i===step?"step":undefined} className={i===step?"text-primary":"text-muted-foreground"}>{i+1}. {x}</li>)}</ol>{step<2?<section className="mt-8"><h2 className="section-title">{step===0?"Leagues I know":"Leagues I want help with"}</h2><p className="mt-2 text-muted-foreground">{step===0?"Choose leagues you follow closely.":"Choose leagues where specialist guidance would help."}</p><div className="mt-6 divide-y border-y">{leagues.map(l=><button key={l.slug} type="button" aria-pressed={selected.includes(l.slug)} onClick={()=>toggle(l.slug)} className="flex w-full items-center gap-3 px-4 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 hover:bg-muted"><span className="flex size-6 items-center justify-center border">{selected.includes(l.slug)?<CheckIcon className="size-4"/>:null}</span><strong>{l.name}</strong><span className="ml-auto text-sm text-muted-foreground">{l.country}</span></button>)}</div><Button className="mt-6 w-full" size="lg" onClick={()=>setStep(step+1)} disabled={!selected.length}>Continue</Button></section>:<section className="mt-10 border bg-foreground p-7 text-background"><h2 className="section-title">Your first lock is waiting.</h2><p className="mt-3 text-background/70">Start with the league you know best. Your choices are saved on this device and can be changed from your account menu.</p><Link href={`/leagues/${known[0]}`} className="mt-6 inline-flex h-12 items-center bg-primary px-6 font-bold text-primary-foreground">Make my first Weekly Lock</Link></section>}</main>;
}
