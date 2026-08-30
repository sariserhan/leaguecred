import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LeagueComingSoon } from "@/components/leagues/league-coming-soon";
import { LeagueExperience } from "@/components/leagues/league-experience";
import { TeamCatalogSection } from "@/components/leagues/team-catalog-section";
import { getLeagueDirectory, getLeagueExperience, getLeagueTeamCatalog } from "@/data/leagues";
import { getSession } from "@/lib/auth-session";
import { enforceMaintenanceGate } from "@/lib/maintenance";
import {
  LEAGUE_LEADERBOARD_FLAG,
  LEAGUE_TEAM_CATALOG_FLAG,
  isFeatureEnabled,
} from "@/lib/site-settings";
import { getFeatureFlags } from "@/services/site-settings";

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
  await enforceMaintenanceGate();

  const [{ slug }, session, flags] = await Promise.all([
    props.params,
    getSession(),
    getFeatureFlags(),
  ]);
  const [leagueDirectory, experience, teamCatalog] = await Promise.all([
    getLeagueDirectory(session?.user.id),
    getLeagueExperience(slug, session?.user.id),
    getLeagueTeamCatalog(slug),
  ]);
  const league = leagueDirectory.find((item) => item.slug === slug);

  if (!league) notFound();
  if (!experience) return <LeagueComingSoon league={league} teamCatalog={teamCatalog} />;

  return (
    <>
      <LeagueExperience
        data={experience}
        leaderboardEnabled={isFeatureEnabled(flags, LEAGUE_LEADERBOARD_FLAG)}
      />
      {isFeatureEnabled(flags, LEAGUE_TEAM_CATALOG_FLAG) ? (
        <div className="page-shell pb-14 sm:pb-20">
          <TeamCatalogSection teamCatalog={teamCatalog} />
        </div>
      ) : null}
    </>
  );
}
