import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getLeagueStandings } from "@/data/leagues";
import { enforceMaintenanceGate } from "@/lib/maintenance";
import { Crest } from "@/components/ui/crest";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getLeagueStandings((await params).slug);
  if (!data) return { title: "Standings not found" };
  const description = `Current-season ${data.league.name} table.`;
  return {
    title: `${data.league.name} standings`,
    description,
    alternates: { canonical: `/leagues/${data.league.slug}/standings` },
    openGraph: { title: `${data.league.name} standings · LeagueCred`, description, type: "website", images: ["/opengraph-image"] },
  };
}

export default async function LeagueStandingsPage({ params }: Props) {
  await enforceMaintenanceGate();
  const data = await getLeagueStandings((await params).slug);
  if (!data) notFound();
  return <div className="page-shell py-10 sm:py-14"><header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6">{data.league.logoUrl ? <Crest src={data.league.logoUrl} size={48} plate /> : null}<h1 className="font-heading text-5xl font-extrabold uppercase">{data.league.name} standings</h1></header><p className="-mt-5 mb-5 text-sm text-muted-foreground">{data.source === "espn" ? "The official table, including any points deduction." : "Counted from this season\u2019s completed fixtures."}</p><div className="overflow-x-auto border"><table className="w-full min-w-[680px] text-sm"><caption className="sr-only">{data.league.name} current-season standings</caption><thead className="border-b bg-muted text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"><tr>{["#", "Team", "P", "W", "D", "L", "GD", "Pts"].map((heading) => <th key={heading} className="px-3 py-3 text-left">{heading}</th>)}</tr></thead><tbody className="divide-y">{data.standings.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">Standings will appear when completed fixtures are available.</td></tr> : data.standings.map((row) => <tr key={row.teamSlug ?? row.team} className="hover:bg-muted/50"><td className={`px-3 py-4 font-semibold ${row.position <= 4 ? "text-primary" : "text-muted-foreground"}`} title={row.position <= 4 ? "Champions League position" : undefined}>{row.position}</td><th scope="row" className="px-3 py-4 text-left">{(() => { const label = <>{row.logoUrl ? <Crest src={row.logoUrl} size={32} /> : null}{row.team}</>; return row.teamSlug ? <Link href={`/teams/${row.teamSlug}`} className="flex items-center gap-3 hover:text-primary">{label}</Link> : <span className="flex items-center gap-3">{label}</span>; })()}</th><td className="px-3 py-4">{row.played}</td><td className="px-3 py-4">{row.wins}</td><td className="px-3 py-4">{row.draws}</td><td className="px-3 py-4">{row.losses}</td><td className="px-3 py-4">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="px-3 py-4 font-bold">{row.points}</td></tr>)}</tbody></table></div></div>;
}
