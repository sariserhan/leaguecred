"use client";

import Link from "next/link";
import { ArrowRightIcon, LockKeyholeIcon, ShieldCheckIcon, TargetIcon, UsersRoundIcon } from "lucide-react";
import { useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Create your free account",
    text: "Tell us the club, region, and leagues you genuinely know—not every competition on the screen.",
    icon: UsersRoundIcon,
  },
  {
    title: "Make one 99% call",
    text: "Each day, lock only the match you are almost completely sure will be won. If no match feels that strong, do not force one.",
    icon: TargetIcon,
  },
  {
    title: "Leave volume behind",
    text: "This is not about clicking every possible winner and celebrating the few that land. One permanent call keeps the record honest.",
    icon: LockKeyholeIcon,
  },
  {
    title: "Build the week together",
    text: "Somewhere else, another supporter knows their team and league just as deeply. Together, our strongest local knowledge can shape a smarter week for everyone.",
    icon: ShieldCheckIcon,
  },
] as const;

export function HowItWorksDialog({ mobile = false }: { mobile?: boolean }) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            className={cn(
              mobile ? "h-16 w-full justify-start rounded-none px-5 font-semibold" : "px-0 text-muted-foreground hover:text-foreground",
            )}
          />
        }
      >
        <UsersRoundIcon data-icon="inline-start" className={mobile ? "text-primary" : "hidden"} />
        How it works
        {mobile ? <ArrowRightIcon data-icon="inline-end" className="ml-auto text-muted-foreground" /> : null}
      </DialogTrigger>
      <DialogContent initialFocus={titleRef} className="max-h-[min(90dvh,760px)] gap-0 overflow-y-auto rounded-sm p-0 sm:max-w-3xl">
        <DialogHeader className="bg-inverted p-6 pr-14 text-inverted-foreground sm:p-8 sm:pr-16">
          <DialogTitle ref={titleRef} tabIndex={-1} className="font-heading text-4xl leading-none font-extrabold uppercase sm:text-6xl">
            Your 99% call. Our stronger week.
          </DialogTitle>
          <DialogDescription className="max-w-2xl text-base leading-7 text-inverted-foreground/70">
            LeagueCred is a free community for football supporters who believe the person closest to a team often knows what the table cannot show.
          </DialogDescription>
        </DialogHeader>

        <ol className="grid sm:grid-cols-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="border-b p-5 odd:sm:border-r sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold">{index + 1}</span>
                  <Icon aria-hidden="true" className="size-6" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 font-heading text-2xl font-bold uppercase">{step.title}</h3>
                <p className="mt-2 leading-6 text-muted-foreground">{step.text}</p>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <p className="font-heading text-3xl leading-tight font-bold uppercase">
            A community for people who want to win through shared knowledge—not noise.
          </p>
          <Alert>
            <ShieldCheckIcon aria-hidden="true" />
            <AlertTitle>Knowledge, not a bookmaker</AlertTitle>
            <AlertDescription>
              LeagueCred records predictions and reputation. It does not accept bets, handle money, guarantee winners, or remove the risk from wagering.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="m-0 rounded-none px-5 py-4 sm:px-6">
          <DialogClose render={<Button variant="outline" />}>Keep exploring</DialogClose>
          <DialogClose nativeButton={false} render={<Link href="/auth" className={buttonVariants()} />}>
            Create a free account<ArrowRightIcon data-icon="inline-end" />
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
