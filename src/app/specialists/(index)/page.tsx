import type { Metadata } from "next";

import { SpecialistDirectory } from "@/components/specialists/specialist-directory";
import { getSpecialistDirectory } from "@/data/specialists";
import { getRankThreshold } from "@/services/site-settings";

export const metadata: Metadata = { title: "Find specialists", description: "Compare verified football specialists by league, record, and evidence.", alternates: { canonical: "/specialists" } };

export default async function SpecialistsPage({ searchParams }: PageProps<"/specialists">) {
  const league = (await searchParams).league;
  return <SpecialistDirectory specialists={await getSpecialistDirectory()} initialLeague={typeof league === "string" ? league : undefined} rankThreshold={await getRankThreshold()} />;
}
