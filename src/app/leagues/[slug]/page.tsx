import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeagueComingSoon } from "@/components/leagues/league-coming-soon";
import { LeagueExperience } from "@/components/leagues/league-experience";
import { getLeagueDirectory, getLeagueExperience } from "@/data/leagues";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type LeaguePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata(
  props: LeaguePageProps,
): Promise<Metadata> {
  const { slug } = await props.params;
  const league = (await getLeagueDirectory()).find((item) => item.slug === slug);

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
  const session = await getSession();
  const league = (await getLeagueDirectory(session?.user.id)).find((item) => item.slug === slug);

  if (!league) notFound();

  if (league.slug !== "super-lig") {
    return <LeagueComingSoon league={league} />;
  }

  const experience = await getLeagueExperience(slug, session?.user.id);
  if (!experience) notFound();

  return <LeagueExperience data={experience} />;
}
