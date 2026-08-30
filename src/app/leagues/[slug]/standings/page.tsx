import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getLeagueStandings } from "@/data/leagues";
import { enforceMaintenanceGate } from "@/lib/maintenance";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getLeagueStandings((await params).slug);
  return data ? { title: `${data.league.name} standings` } : { title: "Standings not found" };
}

export default async function LeagueStandingsPage({ params }: Props) {
  await enforceMaintenanceGate();
  const data = await getLeagueStandings((await params).slug);
  if (!data) notFound();
  return <div className="page-shell py-10 sm:py-14"><header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-6">{data.league.logoUrl ? <Image src={data.league.logoUrl} alt="" width={48} height={48} className="size-12 object-contain" /> : null}<h1 className="font-heading text-5xl font-extrabold uppercase">{data.league.name} standings</h1></header><p className="-mt-5 mb-5 text-sm text-muted-foreground">Updated from the current season&apos;s completed fixtures.</p><div className="overflow-x-auto border"><table className="w-full min-w-[680px] text-sm"><caption className="sr-only">{data.league.name} current-season standings</caption><thead className="border-b bg-muted text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase"><tr>{["#", "Team", "P", "W", "D", "L", "GD", "Pts"].map((heading) => <th key={heading} className="px-3 py-3 text-left">{heading}</th>)}</tr></thead><tbody className="divide-y">{data.standings.map((row) => <tr key={row.teamSlug} className="hover:bg-muted/50"><td className="px-3 py-4">{row.position}</td><th scope="row" className="px-3 py-4 text-left"><Link href={`/teams/${row.teamSlug}`} className="flex items-center gap-3 hover:text-primary">{row.logoUrl ? <Image src={row.logoUrl} alt="" width={32} height={32} className="size-8 object-contain" /> : null}{row.team}</Link></th><td className="px-3 py-4">{row.played}</td><td className="px-3 py-4">{row.wins}</td><td className="px-3 py-4">{row.draws}</td><td className="px-3 py-4">{row.losses}</td><td className="px-3 py-4">{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td className="px-3 py-4 font-bold">{row.points}</td></tr>)}</tbody></table></div></div>;
}
