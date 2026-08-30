import Link from "next/link";
import {
  ArrowRightIcon,
  ChartNoAxesColumnIncreasingIcon,
  ClipboardPenLineIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import { PitchBackdrop } from "@/components/home/pitch-backdrop";
import { ProductPreview } from "@/components/home/product-preview";
import { ParticipationPaths, RecordAndQuestions } from "@/components/home/product-explainer";
import { buttonVariants } from "@/components/ui/button";
import { enforceMaintenanceGate } from "@/lib/maintenance";

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
    title: "A Galatasaray fan knows a derby week.",
    description: "A derby is not a Tuesday in February. You can feel which one the squad has been pointing at, and the table records neither.",
  },
  {
    title: "An Ajax fan knows the academy.",
    description: "You can see which teenager is about to start weeks before a league table has any reason to mention them.",
  },
  {
    title: "A Flamengo fan knows the Maracanã.",
    description: "You know what a full house takes out of a visiting side, and which visitors have never handled it.",
  },
  {
    title: "A Celtic fan knows the fixture list.",
    description: "You know which week is being saved for Europe, and which one the manager intends to win by three.",
  },
] as const;

const trustRules = [
  {
    title: "One call per league, each week",
    description:
      "A single Weekly Lock in every league you know. There is no volume to hide behind and no quiet second guess.",
    icon: LockKeyholeIcon,
  },
  {
    title: "Locked the moment you submit",
    description:
      "A Weekly Lock cannot be edited, withdrawn, or deleted once the fixture turns against it. The record is permanent.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Reading the others costs you the week",
    description:
      "Reveal the specialist calls for a matchweek and you give up your own independent record for it. Nobody passes a borrowed call off as their own.",
    icon: EyeOffIcon,
  },
] as const;

const returnedCalls = [
  {
    league: "Serie A",
    specialist: "Marco",
    record: "79.2% · 19–5",
    call: "Atalanta",
    fixture: "vs Lecce",
  },
  {
    league: "La Liga",
    specialist: "LaLigaLens",
    record: "77.4% · 24–7",
    call: "Real Sociedad",
    fixture: "vs Getafe",
  },
  {
    league: "Liga MX",
    specialist: "Diego",
    record: "73.9% · 17–6",
    call: "Monterrey",
    fixture: "vs Necaxa",
  },
] as const;

export default async function HomePage() {
  await enforceMaintenanceGate();

  return (
    <>
      <section className="page-shell grid min-h-[650px] items-center gap-12 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:py-8">
        <div className="flex flex-col items-start gap-8">
          <h1 className="display-title max-w-[760px] normal-case">
            You know one league. Someone else knows the rest.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Give the one match you are sure of—the week you know Galatasaray win. Get one
            back from someone who watches La Liga every week.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link
              href="/leagues?intent=prove"
              className={buttonVariants({ size: "lg" })}
            >
              Make this week&apos;s call
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
            <Link
              href="/leagues?intent=follow"
              className="text-sm font-semibold underline underline-offset-4 transition-colors hover:text-primary"
            >
              or follow a proven specialist instead
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            className="pointer-events-none absolute inset-x-[-8%] top-1/2 -z-10 hidden -translate-y-1/2 text-foreground/15 lg:block"
            aria-hidden="true"
          >
            <PitchBackdrop className="w-full" />
          </div>
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

      <ParticipationPaths />

      <section className="page-shell py-14 sm:py-20">
        <div className="grid overflow-hidden border lg:grid-cols-2">
          <div className="bg-foreground p-7 text-background sm:p-10 lg:p-12">
            <h2 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-6xl">
              The table does not know what you know.
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
            <p className="mt-8 max-w-xl leading-7 text-background/75">
              A Weekly Lock is one fixture, so it can be your own club&apos;s match—the week you
              are sure they win. The record it builds belongs to that club&apos;s league, which is
              where someone looking for a specialist will find you.
            </p>
          </div>

          <div className="flex flex-col justify-center bg-background p-7 sm:p-10 lg:p-12">
            <h2 className="section-title max-w-lg">What makes a call worth trusting.</h2>
            <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
              Depth only counts once it is put on the record. Three rules keep every call
              in the exchange honest, and they hold for everyone.
            </p>

            <ol className="mt-8 divide-y border-y">
              {trustRules.map((rule) => {
                const Icon = rule.icon;
                return (
                  <li key={rule.title} className="flex items-start gap-4 py-5">
                    <Icon
                      aria-hidden="true"
                      className="mt-1 size-5 shrink-0 text-primary"
                      strokeWidth={1.5}
                    />
                    <div>
                      <h3 className="font-semibold">{rule.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {rule.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="mt-8 border">
              <div className="flex items-center gap-3 bg-primary px-5 py-4 text-primary-foreground">
                <ScrollTextIcon aria-hidden="true" className="size-6" />
                <h3 className="font-heading text-xl font-bold uppercase">Your week, back from the specialists</h3>
              </div>
              <div className="divide-y">
                {returnedCalls.map((entry) => (
                  <div
                    key={entry.league}
                    className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 px-5 py-4"
                  >
                    <span className="font-semibold">{entry.league}</span>
                    <span className="font-heading text-lg font-bold uppercase">{entry.call}</span>
                    <span className="text-sm text-muted-foreground">
                      {entry.specialist} · {entry.record}
                    </span>
                    <span className="text-sm text-muted-foreground">{entry.fixture}</span>
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

      <RecordAndQuestions />
    </>
  );
}
