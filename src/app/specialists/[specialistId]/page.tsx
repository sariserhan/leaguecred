import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpecialistProfile } from "@/components/specialists/specialist-profile";
import { getSpecialistProfile } from "@/data/specialists";
import { getSession } from "@/lib/auth-session";
import { enforceMaintenanceGate } from "@/lib/maintenance";
import { getPersonalizedRecommendations } from "@/data/recommendations";
import { getLeaguePreferences } from "@/data/league-preferences";
import { JsonLd } from "@/lib/json-ld";

export const dynamic = "force-dynamic";

type SpecialistPageProps = { params: Promise<{ specialistId: string }> };

export async function generateMetadata(props: SpecialistPageProps): Promise<Metadata> {
  const { specialistId } = await props.params;
  const data = await getSpecialistProfile(specialistId);
  return data ? { title: data.specialist.name, description: `Verified football league record for ${data.specialist.name}.`, alternates: { canonical: `/specialists/${data.specialist.id}` }, openGraph: { title: `${data.specialist.name} · LeagueCred`, description: `${data.totals.wins}–${data.totals.losses} across ${data.totals.settledPicks} independent Daily Locks.`, type: "profile" } } : { title: "Specialist not found" };
}

export default async function SpecialistPage(props: SpecialistPageProps) {
  await enforceMaintenanceGate();

  const [{ specialistId }, session] = await Promise.all([props.params, getSession()]);
  const data = await getSpecialistProfile(specialistId, session?.user.id);
  if (!data) notFound();
  const preferences = data.viewer.isSelf ? await getLeaguePreferences(data.specialist.id) : null;
  const recommendations = data.viewer.isSelf ? await getPersonalizedRecommendations(data.specialist.id) : [];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          mainEntity: {
            "@type": "Person",
            name: data.specialist.name,
            url: `https://leaguecred.com/specialists/${data.specialist.id}`,
          },
        }}
      />
      <SpecialistProfile data={data} recommendations={recommendations} hasHelpPreferences={Boolean(preferences?.help.length)} hasLeaguePreferences={Boolean(preferences && (preferences.known.length || preferences.help.length))} />
    </>
  );
}
