import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeagueComingSoon } from "@/components/leagues/league-coming-soon";
import { LeagueExperience } from "@/components/leagues/league-experience";
import { TeamCatalogSection } from "@/components/leagues/team-catalog-section";
import { getLeagueDirectory, getLeagueExperience, getLeagueTeamCatalog } from "@/data/leagues";
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
    const teamCatalog = await getLeagueTeamCatalog(slug);
    return <LeagueComingSoon league={league} teamCatalog={teamCatalog} />;
  }

  const [experience, teamCatalog] = await Promise.all([
    getLeagueExperience(slug, session?.user.id),
    getLeagueTeamCatalog(slug),
  ]);
  if (!experience) notFound();

  return (
    <>
      <LeagueExperience data={experience} />
      <div className="page-shell pb-14 sm:pb-20">
        <TeamCatalogSection teamCatalog={teamCatalog} />
      </div>
    </>
  );
}
