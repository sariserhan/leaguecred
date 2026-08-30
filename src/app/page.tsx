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
      "Choose the one team you are closest to certain will win from the league you truly know.",
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
            Bring your surest winner. Find theirs.
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            This is not a place for casual “maybe this team wins” picks. Give one
            team you are almost certain will win from the league you know best,
            then receive a proven specialist&apos;s surest call from a league you do not.
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
            <h2 className="section-title">Not a guess. An exchange of real league knowledge.</h2>
            <p className="max-w-md leading-7 text-muted-foreground">
              You bring one near-certain winner from your league each week. In return,
              you can follow someone whose record proves they know theirs.
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
