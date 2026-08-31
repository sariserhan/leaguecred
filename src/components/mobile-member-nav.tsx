"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellIcon, CalendarDaysIcon, CircleUserRoundIcon, TrophyIcon, UsersRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileMemberNav({ userId }: { userId: string }) {
  const pathname = usePathname();
  const items = [
    { href: `/specialists/${userId}`, label: "Dashboard", icon: CircleUserRoundIcon },
    { href: "/calendar", label: "Calendar", icon: CalendarDaysIcon },
    { href: "/slip", label: "Slip", icon: TrophyIcon },
    { href: "/network", label: "Network", icon: UsersRoundIcon },
    { href: "/notifications", label: "Alerts", icon: BellIcon },
  ];
  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden" aria-label="Member navigation"><ul className="grid grid-cols-5">{items.map(({href,label,icon:Icon})=>{const active=pathname===href||pathname.startsWith(`${href}/`);return <li key={href}><Link href={href} aria-current={active?"page":undefined} className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground",active&&"bg-muted text-foreground")}><Icon aria-hidden="true" className={cn("size-5",active&&"text-primary")}/><span>{label}</span></Link></li>})}</ul></nav>;
}
