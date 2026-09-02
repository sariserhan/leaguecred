import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDaysIcon, TrophyIcon } from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";

import type { TeamFixture } from "@/data/teams";
import { getTeamProfile, getTeamSlugByFormerSlug, getTeamSlugById } from "@/data/teams";
import { cn } from "@/lib/utils";
import { JsonLd } from "@/lib/json-ld";
import { teamIdFromPath } from "@/lib/team-path";
import { Crest } from "@/components/ui/crest";
import { AddToSlipButton } from "@/components/slip/add-to-slip-button";
import { getSession } from "@/lib/auth-session";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type TeamPageProps = { params: Promise<{ team: string }> };

function TeamMark({ name, logoUrl, size = 40 }: { name: string; logoUrl: string | null; size?: number }) {
  return <Crest src={logoUrl} size={size} fallback={<span className="text-xs font-bold text-black">{name.slice(0, 3).toUpperCase()}</span>} />;
}

function FixtureRow({ fixture, teamName, recent, signedIn = false }: { fixture: TeamFixture; teamName: string; recent?: boolean; signedIn?: boolean }) {
  const date = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" }).format(new Date(fixture.kickoff));
  const result = fixture.teamScore === null || fixture.opponentScore === null ? "—" : fixture.home ? String(fixture.teamScore) + " - " + String(fixture.opponentScore) : String(fixture.opponentScore) + " - " + String(fixture.teamScore);
  const won = recent && fixture.teamScore !== null && fixture.opponentScore !== null && fixture.teamScore > fixture.opponentScore;
  const lost = recent && fixture.teamScore !== null && fixture.opponentScore !== null && fixture.teamScore < fixture.opponentScore;
  return <article className="grid gap-3 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div className="flex items-center gap-3"><TeamMark name={fixture.opponent} logoUrl={fixture.opponentLogoUrl} /><div><Link href={`/leagues/${fixture.leagueSlug}`} className="font-semibold hover:text-primary">{fixture.home ? teamName + " - " + fixture.opponent : fixture.opponent + " - " + teamName}</Link><p className="text-sm text-muted-foreground">{fixture.home ? "Home" : "Away"} · {fixture.leagueName}</p></div></div><span className="text-sm text-muted-foreground">{date}</span><span className="flex items-center justify-end gap-3"><strong className={cn("font-heading text-3xl", won && "text-primary", lost && "text-destructive")}>{result}</strong>{!recent && signedIn ? <AddToSlipButton fixtureId={fixture.id} label={fixture.home ? `${teamName} v ${fixture.opponent}` : `${fixture.opponent} v ${teamName}`} /> : null}</span></article>;
}

export async function generateMetadata(props: TeamPageProps): Promise<Metadata> {
  const { team } = await props.params;
  const data = await getTeamProfile(team);
  return data ? { title: data.team.name, description: `${data.team.name} fixtures, recent results, and current-season record.`, alternates: { canonical: `/teams/${data.team.slug}` }, openGraph: { title: `${data.team.name} fixtures and results`, description: `${data.team.name} fixtures, recent results, and current-season record.`, images: ["/opengraph-image"] } } : { title: "Team not found" };
}

export default async function TeamPage(props: TeamPageProps) {
  const session = await getSession();
  const signedIn = Boolean(session);
  const { team } = await props.params;
  const data = await getTeamProfile(team);
  if (!data) {
    // Before slugs, a team page was /teams/<name>-<uuid>. Shared links and
    // anything already indexed still carry that shape, so honour the id in it
    // rather than losing the page to a 404.
    const legacyId = teamIdFromPath(team);
    const slug = legacyId
      ? await getTeamSlugById(legacyId)
      // Correcting a club's name moves its page. Anything already linking to
      // the old address should still arrive.
      : await getTeamSlugByFormerSlug(team);
    if (slug) permanentRedirect(`/teams/${slug}`);
    notFound();
  }
  const { record } = data;

  return <><JsonLd data={{ "@context": "https://schema.org", "@type": "SportsTeam", name: data.team.name, url: `https://leaguecred.com/teams/${data.team.slug}`, logo: data.team.logoUrl ?? undefined, sport: "Soccer" }} /><div className="page-shell py-8 sm:py-12"><header className="border-b border-inverted bg-inverted px-5 py-8 text-inverted-foreground sm:px-8 sm:py-10"><div className="flex items-center gap-5"><TeamMark name={data.team.name} logoUrl={data.team.logoUrl} size={96} /><div><p className="font-semibold text-primary">{data.team.country ?? "Football club"}</p><h1 className="mt-1 font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">{data.team.name}</h1><p className="mt-3 text-inverted-foreground/75">{data.leagues.map((league) => league.name).join(" · ") || "League catalog team"}</p></div></div></header><section className="grid border-x border-b sm:grid-cols-2 xl:grid-cols-5" aria-label="Current season team record">{[["Played", record.played], ["Wins", record.wins], ["Draws", record.draws], ["Losses", record.losses], ["Goals", `${record.goalsFor}–${record.goalsAgainst}`]].map(([label, value]) => <div key={label} className="border-b p-5 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0"><strong className="block font-heading text-4xl leading-none">{value}</strong><span className="mt-1 block text-sm text-muted-foreground">{label}</span></div>)}</section><div className="mt-7 grid gap-7 xl:grid-cols-2"><section className="border" aria-labelledby="upcoming-heading"><div className="flex items-center gap-2 border-b px-5 py-4"><CalendarDaysIcon aria-hidden="true" className="size-5 text-primary" /><h2 id="upcoming-heading" className="font-heading text-2xl font-bold uppercase">Upcoming games</h2></div>{data.upcoming.length > 0 ? <div>{data.upcoming.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} teamName={data.team.name} signedIn={signedIn} />)}</div> : <p className="p-5 text-muted-foreground">No upcoming fixture is currently available.</p>}</section><section className="border" aria-labelledby="recent-heading"><div className="flex items-center gap-2 border-b px-5 py-4"><TrophyIcon aria-hidden="true" className="size-5 text-primary" /><h2 id="recent-heading" className="font-heading text-2xl font-bold uppercase">Recent results</h2></div>{data.recent.length > 0 ? <div>{data.recent.map((fixture) => <FixtureRow key={fixture.id} fixture={fixture} teamName={data.team.name} recent />)}</div> : <p className="p-5 text-muted-foreground">No completed result is available yet.</p>}</section></div></div></>;
}
