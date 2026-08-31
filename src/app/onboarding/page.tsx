import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { getSession } from "@/lib/auth-session";
import { getLeagueDirectory } from "@/data/leagues";
import { getLeaguePreferences } from "@/data/league-preferences";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Get started", robots: { index: false, follow: false } };
export default async function OnboardingPage() { const session = await getSession(); if (!session) redirect("/auth?next=/onboarding"); const [leagues,preferences]=await Promise.all([getLeagueDirectory(session.user.id),getLeaguePreferences(session.user.id)]); return <OnboardingFlow leagues={leagues.slice(0, 25).map(({ name, slug, country }) => ({ name, slug, country }))} initialPreferences={preferences} />; }
