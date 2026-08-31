import { CheckIcon, Clock3Icon } from "lucide-react";

import type { WeeklySlipEntry } from "@/data/weekly-slip";
import { cn } from "@/lib/utils";

export function LockTimeline({ entry, now }: { entry: WeeklySlipEntry; now: string }) {
  const steps = [
    { label: "Locked", complete: true },
    { label: "Revealed", complete: Date.parse(now) >= Date.parse(entry.lockAt) },
    { label: "Played", complete: entry.fixture.status === "finished" || entry.result !== "pending" },
    { label: "Settled", complete: entry.result !== "pending" },
  ];
  const current = Math.min(steps.findIndex((step) => !step.complete), steps.length - 1);

  return <ol className="mt-4 grid grid-cols-4" aria-label={`${entry.selectedTeam.name} lock timeline`}>
    {steps.map((step, index) => <li key={step.label} className="relative text-center"><span aria-hidden="true" className={cn("absolute top-3 right-1/2 left-[-50%] h-px bg-border", index === 0 && "hidden", step.complete && "bg-primary")} /><span className={cn("relative mx-auto flex size-6 items-center justify-center rounded-full border bg-background", step.complete ? "border-primary bg-primary text-primary-foreground" : index === current ? "border-foreground" : "border-border text-muted-foreground")}>{step.complete ? <CheckIcon className="size-3.5" /> : <Clock3Icon className="size-3" />}</span><span className={cn("mt-1.5 block text-[10px] font-bold uppercase", step.complete ? "text-foreground" : "text-muted-foreground")}>{step.label}</span></li>)}
  </ol>;
}
