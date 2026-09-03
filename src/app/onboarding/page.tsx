import type { Metadata } from "next";
import { getSafeInternalPath } from "@/lib/safe-redirect";
import { redirect } from "next/navigation";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { getSession } from "@/lib/auth-session";
import { getLeagueDirectory } from "@/data/leagues";
import { getLeaguePreferences } from "@/data/league-preferences";
import { getCommunityIdentity, getIdentityTeams } from "@/data/distribution";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Get started", robots: { index: false, follow: false } };
export default async function OnboardingPage({ searchParams }: PageProps<"/onboarding">) { const session = await getSession(); if (!session) redirect("/auth?next=/onboarding"); const nextPath = getSafeInternalPath((await searchParams).next, ""); const [leagues,preferences,teams,identity]=await Promise.all([getLeagueDirectory(session.user.id),getLeaguePreferences(session.user.id),getIdentityTeams(),getCommunityIdentity(session.user.id)]); return <OnboardingFlow leagues={leagues.slice(0, 25).map(({ name, slug, country }) => ({ name, slug, country }))} teams={teams} initialPreferences={preferences} initialTeamId={identity.teamId} initialRegion={identity.region} nextPath={nextPath} />; }
