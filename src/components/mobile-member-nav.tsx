"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRoundIcon, HomeIcon, LockKeyholeIcon, RadioIcon, UsersRoundIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileMemberNav({ userId, unread = 0, liveLocksEnabled = true }: { userId: string; unread?: number; liveLocksEnabled?: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: HomeIcon },
    ...(liveLocksEnabled ? [{ href: "/live-locks", label: "Live", icon: RadioIcon, pulse: true }] : []),
    { href: "/leagues?intent=prove", activeHref: "/leagues", label: "Lock", icon: LockKeyholeIcon, primary: true },
    { href: "/communities", label: "Communities", icon: UsersRoundIcon },
    { href: `/specialists/${userId}`, label: "Me", icon: CircleUserRoundIcon, badge: unread },
  ];
  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background md:hidden" aria-label="Member navigation"><ul className={cn("grid",liveLocksEnabled?"grid-cols-5":"grid-cols-4")}>{items.map(({href,label,icon:Icon,...item})=>{const target="activeHref" in item?item.activeHref:href;const active=pathname===target||(target!=="/"&&pathname.startsWith(`${target}/`));return <li key={href}><Link href={href} aria-current={active?"page":undefined} className={cn("relative flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold text-muted-foreground",active&&"bg-muted text-foreground",item.primary&&"text-foreground")}><span className={cn("relative flex size-7 items-center justify-center",item.primary&&"-mt-5 size-12 rounded-full bg-primary text-primary-foreground shadow-lg")}><Icon aria-hidden="true" className={cn("size-5",active&&!item.primary&&"text-primary")}/>{item.pulse?<span className="absolute top-0 right-0 size-2 rounded-full bg-primary"/>:null}{item.badge?<span className="absolute -top-1 -right-2 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] text-destructive-foreground">{Math.min(item.badge,99)}</span>:null}</span><span>{label}</span></Link></li>})}</ul></nav>;
}
