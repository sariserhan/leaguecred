import Link from "next/link";
import {
  ArrowRightIcon,
  ChartNoAxesColumnIncreasingIcon,
  ClipboardPenLineIcon,
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
    </>
  );
}
