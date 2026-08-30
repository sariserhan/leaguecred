import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheckIcon, UsersRoundIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { getUserProfile } from "@/data/profile";
import { getSession } from "@/lib/auth-session";
import { enforceMaintenanceGate } from "@/lib/maintenance";

type ProfilePageProps = {
  params: Promise<{ userId: string }>;
};

export async function generateMetadata(props: ProfilePageProps): Promise<Metadata> {
  const { userId } = await props.params;
  const profile = await getUserProfile(userId);
  if (!profile) return { title: "Profile not found" };
  return {
    title: profile.name,
    description: `${profile.name}'s independent league records and followed specialists on LeagueCred.`,
  };
}

export default async function ProfilePage(props: ProfilePageProps) {
  await enforceMaintenanceGate();

  const { userId } = await props.params;
  const [profile, session] = await Promise.all([getUserProfile(userId), getSession()]);
  if (!profile) notFound();

  const isOwnProfile = session?.user.id === profile.id;
  const decisions = profile.totals.wins + profile.totals.losses;
  const accuracy = decisions === 0 ? null : (profile.totals.wins / decisions) * 100;
  const totalFollowers = profile.leagueRecords.reduce((sum, record) => sum + record.followerCount, 0);

  return (
    <div className="page-shell py-14 sm:py-20">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-muted-foreground">
          {isOwnProfile ? "Your profile" : "League specialist profile"}
        </p>
        <h1 className="display-title max-w-2xl normal-case">{profile.name}</h1>
        <p className="text-muted-foreground">
          {decisions > 0
            ? `${accuracy!.toFixed(1)}% across ${decisions} settled independent Weekly Locks.`
            : "No settled independent Weekly Locks yet."}
        </p>
      </header>

      {isOwnProfile && totalFollowers > 0 ? (
        <Card className="mt-8 rounded-sm border-primary">
          <CardContent className="flex items-center gap-3 py-5">
            <UsersRoundIcon aria-hidden="true" className="size-6 text-primary" />
            <p className="font-semibold">
              {totalFollowers} {totalFollowers === 1 ? "person follows" : "people follow"} your independent calls across the leagues below.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="mt-10">
        <h2 className="section-title">League records</h2>
        {profile.leagueRecords.length > 0 ? (
          <div className="mt-4 divide-y border-y">
            {profile.leagueRecords.map((record) => (
              <div
                key={record.leagueSlug}
                className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center sm:gap-6"
              >
                <Link href={`/leagues/${record.leagueSlug}`} className="font-bold hover:underline">
                  {record.leagueName}
                </Link>
                <span className="flex items-center gap-2 text-sm">
                  <ShieldCheckIcon aria-hidden="true" className="size-4 text-primary" />
                  {record.tier}
                </span>
                <span className="text-sm text-muted-foreground">
                  {record.wins}–{record.losses}
                </span>
                <span className="text-sm text-muted-foreground">
                  {record.followerCount} follower{record.followerCount === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">No independent picks settled yet.</p>
        )}
      </section>

      <section className="mt-10">
        <h2 className="section-title">Following</h2>
        {profile.following.length > 0 ? (
          <div className="mt-4 divide-y border-y">
            {profile.following.map((follow) => (
              <div key={follow.leagueSlug} className="flex items-center justify-between gap-4 py-4">
                <span className="text-muted-foreground">{follow.leagueName}</span>
                <Link href={`/u/${follow.specialistId}`} className="font-semibold hover:underline">
                  {follow.specialistName}
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-muted-foreground">Not following any specialists yet.</p>
        )}
      </section>
    </div>
  );
}
