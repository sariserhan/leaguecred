import type { Metadata } from "next";

import { SpecialistDirectory } from "@/components/specialists/specialist-directory";
import { getSpecialistDirectory } from "@/data/specialists";
import { enforceMaintenanceGate } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Find specialists", description: "Compare verified football specialists by league, record, and evidence." };

export default async function SpecialistsPage() {
  await enforceMaintenanceGate();
  return <SpecialistDirectory specialists={await getSpecialistDirectory()} />;
}
