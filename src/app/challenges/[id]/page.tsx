import { notFound } from "next/navigation";
import { CommunityChallenge } from "@/components/challenges/community-challenge";
import { getCommunityChallenge, getCommunityIdentity } from "@/data/distribution";
import { getSession } from "@/lib/auth-session";
export const dynamic = "force-dynamic";
export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; const session = await getSession(); const [data, identity] = await Promise.all([getCommunityChallenge(id), session ? getCommunityIdentity(session.user.id) : null]); if (!data) notFound(); return <CommunityChallenge data={data} identity={identity} />; }
