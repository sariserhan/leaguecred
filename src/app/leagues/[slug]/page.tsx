import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeagueComingSoon } from "@/components/leagues/league-coming-soon";
import { LeagueExperience } from "@/components/leagues/league-experience";
import {
  getLeagueBySlug,
  leagues,
  superLigFixtures,
  superLigSpecialists,
} from "@/lib/league-data";

type LeaguePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return leagues.map((league) => ({ slug: league.slug }));
}

export async function generateMetadata(
  props: LeaguePageProps,
): Promise<Metadata> {
  const { slug } = await props.params;
  const league = getLeagueBySlug(slug);

  if (!league) {
    return { title: "League not found" };
  }

  return {
    title: league.name,
    description:
      "Build an independent " +
      league.name +
      " record or follow proven league specialists.",
  };
}

export default async function LeaguePage(props: LeaguePageProps) {
  const { slug } = await props.params;
  const league = getLeagueBySlug(slug);

  if (!league) notFound();

  if (league.slug !== "super-lig") {
    return <LeagueComingSoon league={league} />;
  }

  return (
    <LeagueExperience
      fixtures={superLigFixtures}
      specialists={superLigSpecialists}
    />
  );
}
