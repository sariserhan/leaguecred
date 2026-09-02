import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { SpecialistProfile } from "@/components/specialists/specialist-profile";
import { getSpecialistProfile } from "@/data/specialists";
import { getSession } from "@/lib/auth-session";
import { getPersonalizedRecommendations } from "@/data/recommendations";
import { getLeaguePreferences } from "@/data/league-preferences";
import { JsonLd } from "@/lib/json-ld";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type SpecialistPageProps = { params: Promise<{ specialistId: string }> };

export async function generateMetadata(props: SpecialistPageProps): Promise<Metadata> {
  const { specialistId } = await props.params;
  const data = await getSpecialistProfile(specialistId);
  // Canonical at the handle, since that is the address worth sharing and the
  // one an id redirects to.
  return data ? { title: data.specialist.name, description: `Verified football league record for ${data.specialist.name}.`, alternates: { canonical: `/specialists/${data.specialist.handle ?? data.specialist.id}` }, openGraph: { title: `${data.specialist.name} · LeagueCred`, description: `${data.totals.wins}–${data.totals.losses} across ${data.totals.settledPicks} independent Daily Locks.`, type: "profile" } } : { title: "Specialist not found" };
}

export default async function SpecialistPage(props: SpecialistPageProps) {
  const [{ specialistId }, session] = await Promise.all([props.params, getSession()]);
  const data = await getSpecialistProfile(specialistId, session?.user.id);
  if (!data) notFound();
  // Links made before handles existed - shared, indexed, sitting in someone's
  // notifications - carry the id. They still resolve; they just land on the
  // address this profile now has.
  if (data.specialist.handle && specialistId !== data.specialist.handle) {
    permanentRedirect(`/specialists/${data.specialist.handle}`);
  }
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
            url: `https://leaguecred.com/specialists/${data.specialist.handle ?? data.specialist.id}`,
          },
        }}
      />
      <SpecialistProfile data={data} recommendations={recommendations} hasHelpPreferences={Boolean(preferences?.help.length)} hasLeaguePreferences={Boolean(preferences && (preferences.known.length || preferences.help.length))} />
    </>
  );
}
