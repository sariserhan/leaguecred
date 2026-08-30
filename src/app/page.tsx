import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ChartNoAxesColumnIncreasingIcon,
  ClipboardPenLineIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import { ProductPreview } from "@/components/home/product-preview";
import { buttonVariants } from "@/components/ui/button";

const steps = [
  {
    title: "Give your surest call",
    description:
      "Not 10 guesses and six wins. Give one team you believe will win with near-total confidence.",
    icon: ClipboardPenLineIcon,
  },
  {
    title: "Earn trust with results",
    description:
      "Your record is tracked forever. Accuracy and consistency earn trust over time.",
    icon: ChartNoAxesColumnIncreasingIcon,
  },
  {
    title: "Receive another expert's call",
    description:
      "Your league knowledge helps someone else; their strongest call helps you in a league you do not know.",
    icon: UsersRoundIcon,
  },
] as const;

const knowledgeExchange = [
  {
    title: "You know La Liga.",
    description: "You watch it every week. You know the injuries, the mood, and which next game is the one to trust.",
  },
  {
    title: "I know Serie A.",
    description: "I have the same depth in Italy, so my one call gives you knowledge you would not get from a table alone.",
  },
  {
    title: "A Chelsea fan knows Chelsea.",
    description: "They follow every press conference, lineup change, and reaction around the club better than an outsider can.",
  },
  {
    title: "A Galatasaray fan knows Galatasaray.",
    description: "They understand the squad, the atmosphere, and what the next match means for their team.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <section className="page-shell grid min-h-[650px] items-center gap-12 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:py-8">
        <div className="flex flex-col items-start gap-8">
          <h1 className="display-title max-w-[760px] normal-case">
            Not 10 guesses. One near-certain winner.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            We are not asking which teams might win across a list of games. Give us
            one team you believe will win with near-total confidence from the league
            you know best—then receive someone else&apos;s strongest call from theirs.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/leagues/super-lig"
              className={buttonVariants({ size: "lg" })}
            >
              Prove your league
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="/leagues"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Find a specialist
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            className="pitch-mark absolute -inset-6 -z-10 hidden h-44 lg:block"
            aria-hidden="true"
          />
          <ProductPreview />
        </div>
      </section>

      <section id="how-it-works" className="border-y bg-secondary">
        <div className="page-shell grid gap-10 py-14 lg:grid-cols-[0.75fr_1.25fr] lg:py-16">
          <div className="flex flex-col gap-4">
            <h2 className="section-title">One near-certain winner—not six correct guesses.</h2>
            <p className="max-w-md leading-7 text-muted-foreground">
              LeagueCred rewards the person who can name one team they are almost sure
              will win, week after week—not someone who throws out ten picks and gets six right.
            </p>
          </div>
          <ol className="grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold">
                      {index + 1}
                    </span>
                    <Icon aria-hidden="true" className="size-8" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="page-shell py-14 sm:py-20">
        <div className="grid overflow-hidden border lg:grid-cols-2">
          <div className="bg-foreground p-7 text-background sm:p-10 lg:p-12">
            <h2 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-6xl">
              You know your league better than anyone.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-background/75">
              The table cannot tell the whole story. Fans who live with a league know
              how a team will react to its next game—and which one is almost too strong
              to ignore.
            </p>
            <ol className="mt-10 divide-y divide-background/20 border-y border-background/20">
              {knowledgeExchange.map((member) => (
                <li key={member.title} className="py-5">
                  <h3 className="font-heading text-2xl font-bold uppercase text-primary">{member.title}</h3>
                  <p className="mt-2 max-w-xl leading-7 text-background/75">{member.description}</p>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-col justify-center bg-background p-7 sm:p-10 lg:p-12">
            <h2 className="section-title max-w-lg">Exchange your strongest call. Build the week together.</h2>
            <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
              Everyone gives one team they believe will win with near-total confidence
              from the league or club they truly understand. In return, everyone gets
              the same kind of trusted call from the others.
            </p>

            <div className="mt-8 space-y-2">
              {knowledgeExchange.map((member, index) => (
                <div key={member.title}>
                  <div className="flex items-center gap-4 border p-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-primary">
                      <UsersRoundIcon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="font-semibold">{member.title.replace(".", "")} call</span>
                  </div>
                  {index < knowledgeExchange.length - 1 ? <ArrowDownIcon aria-hidden="true" className="mx-auto my-1 size-5 text-primary" /> : null}
                </div>
              ))}
            </div>

            <div className="mt-8 border">
              <div className="flex items-center gap-3 bg-primary px-5 py-4 text-primary-foreground">
                <ShieldCheckIcon aria-hidden="true" className="size-6" />
                <h3 className="font-heading text-xl font-bold uppercase">One community slip. Built from real league knowledge.</h3>
              </div>
              <div className="divide-y">
                {knowledgeExchange.map((member) => (
                  <div key={member.title} className="flex items-center justify-between gap-4 px-5 py-4">
                    <span className="font-semibold">{member.title.replace(".", "")}</span>
                    <span className="text-sm text-muted-foreground">One almost-sure winner</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              We do not win because one person guessed every league. We build the week together,
              each person contributing the one call they know best.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
