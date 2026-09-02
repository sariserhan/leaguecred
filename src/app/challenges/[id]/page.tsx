import { notFound } from "next/navigation";
import { CommunityChallenge } from "@/components/challenges/community-challenge";
import { getCommunityChallenge, getCommunityIdentity } from "@/data/distribution";
import { getSession } from "@/lib/auth-session";
import { enforceFeatureGate } from "@/lib/feature-gate";
import { COMMUNITY_CHALLENGE_FLAG } from "@/lib/site-settings";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) { await enforceFeatureGate(COMMUNITY_CHALLENGE_FLAG); const { id } = await params; const session = await getSession(); const [data, identity] = await Promise.all([getCommunityChallenge(id), session ? getCommunityIdentity(session.user.id) : null]); if (!data) notFound(); return <CommunityChallenge data={data} identity={identity} />; }
