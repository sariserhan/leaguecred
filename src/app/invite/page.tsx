import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReferralCenter } from "@/components/invite/referral-center";
import { getCommunityIdentity, getReferralDashboard } from "@/data/distribution";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invite supporters", description: "Invite football specialists into your LeagueCred community.", robots: { index: false, follow: false } };
export default async function InvitePage() { const session = await getSession(); if (!session) redirect("/auth?next=/invite"); const [data, identity] = await Promise.all([getReferralDashboard(session.user.id), getCommunityIdentity(session.user.id)]); const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://leaguecred.com"; return <ReferralCenter data={data} identity={identity} inviteUrl={`${baseUrl}/r/${data.code}`} />; }
