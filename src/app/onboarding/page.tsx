import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { getSession } from "@/lib/auth-session";
import { getLeagueDirectory } from "@/data/leagues";
export const dynamic = "force-dynamic";
export default async function OnboardingPage() { const session = await getSession(); if (!session) redirect("/auth?next=/onboarding"); return <OnboardingFlow leagues={(await getLeagueDirectory(session.user.id)).slice(0, 12).map(({ name, slug, country }) => ({ name, slug, country }))} />; }
