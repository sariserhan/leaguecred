import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ChartNoAxesColumnIncreasingIcon, ClipboardPenLineIcon, UsersRoundIcon } from "lucide-react";

import { ActivityAndStats, FinalCallToAction, LeagueRail, MemberVoices, SpecialistProof } from "@/components/home/home-proof";
import { InteractiveDemo } from "@/components/home/interactive-demo";
import { MobileHomeCta } from "@/components/home/mobile-home-cta";
import { HeroBackdrop } from "@/components/home/hero-backdrop";
import { ParticipationPaths, RecordAndQuestions } from "@/components/home/product-explainer";
import { buttonVariants } from "@/components/ui/button";
import { getHomeData } from "@/data/home";
import { getSession } from "@/lib/auth-session";
import { enforceMaintenanceGate } from "@/lib/maintenance";
import { HOMEPAGE_ACTIVITY_FLAG, isFeatureEnabled } from "@/lib/site-settings";
import { getFeatureFlags } from "@/services/site-settings";

/** The hero photograph. Swap the file to change it. */
const HERO_IMAGE = "/2.webp";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "LeagueCred — Football knowledge, proven over time",
  description: "Make one permanent Daily Lock in the league you know, or follow a football specialist with a transparent record.",
};

const steps = [
  { title: "Give your surest call", description: "One team you believe will win—not a list of guesses to hide behind.", icon: ClipboardPenLineIcon },
  { title: "Earn trust with results", description: "Every settled call stays visible. Accuracy and evidence build your reputation.", icon: ChartNoAxesColumnIncreasingIcon },
  { title: "Exchange real knowledge", description: "Use your league expertise and find someone proven in the leagues you do not know.", icon: UsersRoundIcon },
] as const;

export default async function HomePage() {
  await enforceMaintenanceGate();
  const [session, data, flags] = await Promise.all([getSession(), getHomeData(), getFeatureFlags()]);
  const showActivity = isFeatureEnabled(flags, HOMEPAGE_ACTIVITY_FLAG);
  const returningHref = session ? "/slip" : "/leagues?intent=prove";
  const returningLabel = session ? "Continue to your Weekly Slip" : "Make today's call";

  return (
    <>
      <section className="page-shell grid min-h-[650px] items-center gap-12 py-14 lg:grid-cols-[0.86fr_1.14fr] lg:py-10">
        <div className="flex flex-col items-start gap-7">
          <h1 className="display-title max-w-[760px] normal-case">
            {session ? `Welcome back, ${session.user.name.split(" ")[0]}. Your next call is waiting.` : "You know one league. Someone else knows the rest."}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Make one permanent call in the league you truly follow. Build a record people can inspect—and borrow expertise everywhere else.
          </p>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <Link href={returningHref} className={buttonVariants({ size: "lg" })}>{returningLabel}<ArrowRightIcon data-icon="inline-end" /></Link>
            <Link href={session ? "/network" : "/specialists"} className="text-sm font-semibold underline underline-offset-4 transition-colors hover:text-primary">
              {session ? "Review your league network" : "See who has already proved it"}
            </Link>
          </div>
          <p className="text-sm font-semibold">Free for everyone. No subscriptions, no paywalls—let&apos;s win together.</p>
        </div>
        <div className="relative">
          <HeroBackdrop src={HERO_IMAGE} />
          <InteractiveDemo leagues={data.leagues} />
        </div>
      </section>

      {showActivity ? <ActivityAndStats data={data} /> : null}
      <LeagueRail leagues={data.leagues} />

      <section id="how-it-works" className="border-y bg-secondary">
        <div className="page-shell grid gap-10 py-14 lg:grid-cols-[0.75fr_1.25fr] lg:py-16">
          <div className="flex flex-col gap-4"><h2 className="section-title">One near-certain winner—not six correct guesses.</h2><p className="max-w-md leading-7 text-muted-foreground">LeagueCred rewards repeatable football knowledge. Every call is independent, permanent, and attached to the league where it was made.</p></div>
          <ol className="grid gap-8 md:grid-cols-3">{steps.map((step, index) => { const Icon = step.icon; return <li key={step.title} className="flex flex-col gap-4"><div className="flex items-center gap-3"><span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold">{index + 1}</span><Icon aria-hidden="true" className="size-8" strokeWidth={1.5} /></div><h3 className="text-lg font-bold">{step.title}</h3><p className="text-sm leading-6 text-muted-foreground">{step.description}</p></li>; })}</ol>
        </div>
      </section>

      <SpecialistProof data={data} />
      <ParticipationPaths />
      <MemberVoices />
      <RecordAndQuestions />
      <FinalCallToAction />
      {session ? null : <MobileHomeCta />}
    </>
  );
}
