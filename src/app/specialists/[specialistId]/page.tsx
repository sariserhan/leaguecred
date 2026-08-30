import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SpecialistProfile } from "@/components/specialists/specialist-profile";
import { getSpecialistProfile } from "@/data/specialists";
import { getSession } from "@/lib/auth-session";
import { enforceMaintenanceGate } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

type SpecialistPageProps = { params: Promise<{ specialistId: string }> };

export async function generateMetadata(props: SpecialistPageProps): Promise<Metadata> {
  const { specialistId } = await props.params;
  const data = await getSpecialistProfile(specialistId);
  return data ? { title: data.specialist.name, description: `Verified football league record for ${data.specialist.name}.`, openGraph: { title: `${data.specialist.name} · LeagueCred`, description: `${data.totals.wins}–${data.totals.losses} across ${data.totals.settledPicks} independent Weekly Locks.`, type: "profile" } } : { title: "Specialist not found" };
}

export default async function SpecialistPage(props: SpecialistPageProps) {
  await enforceMaintenanceGate();

  const [{ specialistId }, session] = await Promise.all([props.params, getSession()]);
  const data = await getSpecialistProfile(specialistId, session?.user.id);
  if (!data) notFound();
  return <SpecialistProfile data={data} />;
}
