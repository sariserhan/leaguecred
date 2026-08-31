import Link from "next/link";
import { CheckCircle2Icon, RadioIcon, UserRoundCheckIcon } from "lucide-react";

import type { SpecialistProfileData } from "@/data/specialists";

export function DashboardActivity({ data }: { data: SpecialistProfileData }) {
  const activity = [
    ...data.recentLocks.map((lock) => ({ id: `lock-${lock.id}`, at: lock.submittedAt, icon: CheckCircle2Icon, title: `${lock.team} · ${lock.result === "win" ? "Correct" : lock.result === "loss" ? "Missed" : "Void"}`, body: `Independent Weekly Lock in ${lock.leagueName}`, href: `/leagues/${lock.leagueSlug}` })),
    ...data.followedHistory.map((entry) => ({ id: `followed-${entry.id}`, at: entry.followedAt, icon: UserRoundCheckIcon, title: `Followed ${entry.specialistName}'s ${entry.team} call`, body: `${entry.leagueName} · ${entry.result}`, href: `/specialists/${entry.specialistId}` })),
  ].toSorted((left, right) => Date.parse(right.at) - Date.parse(left.at)).slice(0, 10);

  return <section className="mb-8 border" aria-labelledby="activity-heading"><header className="flex items-center justify-between gap-4 border-b px-5 py-4"><div><h2 id="activity-heading" className="font-heading text-3xl font-bold uppercase">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">Your independent and followed actions, kept clearly attributed.</p></div><RadioIcon aria-hidden="true" className="size-6 text-primary" /></header>{activity.length ? <ol className="divide-y">{activity.map((item) => <li key={item.id}><Link href={item.href} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><span className="flex size-9 items-center justify-center border"><item.icon aria-hidden="true" className="size-4 text-primary" /></span><span><strong className="block">{item.title}</strong><span className="text-sm text-muted-foreground">{item.body}</span></span><time className="hidden text-xs text-muted-foreground sm:block" dateTime={item.at}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(item.at))}</time></Link></li>)}</ol> : <div className="p-6 sm:p-8"><strong className="font-heading text-2xl uppercase">Your activity starts with one lock.</strong><p className="mt-2 text-sm text-muted-foreground">Independent locks and followed calls will appear here as your record grows.</p></div>}</section>;
}
