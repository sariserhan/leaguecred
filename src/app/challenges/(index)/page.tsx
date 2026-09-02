import type { Metadata } from "next";
import { CommunityChallenge } from "@/components/challenges/community-challenge";
import { getCommunityChallenge, getCommunityIdentity } from "@/data/distribution";
import { getSession } from "@/lib/auth-session";
import { enforceFeatureGate } from "@/lib/feature-gate";
import { COMMUNITY_CHALLENGE_FLAG } from "@/lib/site-settings";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Community Challenge", description: "See which football supporters are building the strongest transparent record.", alternates: { canonical: "/challenges" } };
export default async function ChallengesPage() { await enforceFeatureGate(COMMUNITY_CHALLENGE_FLAG); const session = await getSession(); const [data, identity] = await Promise.all([getCommunityChallenge(), session ? getCommunityIdentity(session.user.id) : null]); if (!data) return <main className="page-shell py-20 text-center"><h1 className="display-title">The next challenge is forming.</h1><p className="mx-auto mt-4 max-w-xl text-muted-foreground">As soon as the next scheduled fixture is available, its two supporter communities will meet here.</p></main>; return <CommunityChallenge data={data} identity={identity} />; }
