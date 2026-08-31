import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarDaysIcon } from "lucide-react";
import { CalendarPlanner } from "@/components/calendar/calendar-planner";
import { getMatchweekCalendar } from "@/data/member-planning";
import { getSession } from "@/lib/auth-session";

export const dynamic="force-dynamic"; export const metadata:Metadata={title:"Matchweek calendar"};
export default async function CalendarPage(){const session=await getSession();if(!session)redirect("/auth?next=/calendar");const weeks=await getMatchweekCalendar(session.user.id);return <div className="page-shell py-10 sm:py-16"><header className="border-b pb-8"><CalendarDaysIcon className="size-7 text-primary"/><h1 className="mt-5 font-heading text-[clamp(3.5rem,7vw,6.5rem)] leading-[.88] font-extrabold uppercase">Matchweek calendar.</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">Deadlines, fixtures, submitted locks, and missing actions across every league.</p></header><CalendarPlanner weeks={weeks}/></div>}
