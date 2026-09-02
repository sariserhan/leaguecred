import type { Metadata } from "next";

import { SpecialistDirectory } from "@/components/specialists/specialist-directory";
import { getSpecialistDirectory } from "@/data/specialists";
import { enforceMaintenanceGate } from "@/lib/maintenance";
import { getRankThreshold } from "@/services/site-settings";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Find specialists", description: "Compare verified football specialists by league, record, and evidence.", alternates: { canonical: "/specialists" } };

export default async function SpecialistsPage({ searchParams }: PageProps<"/specialists">) {
  await enforceMaintenanceGate();
  const league = (await searchParams).league;
  return <SpecialistDirectory specialists={await getSpecialistDirectory()} initialLeague={typeof league === "string" ? league : undefined} rankThreshold={await getRankThreshold()} />;
}
