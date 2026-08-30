"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRightIcon, CircleUserRoundIcon, LogOutIcon, MenuIcon, ShieldCheckIcon, TrophyIcon, UsersRoundIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { NotificationCenter } from "@/components/notification-center";
import type { AppNotification, NotificationPreferences } from "@/data/notifications";

const navItems = [
  { href: "/leagues", label: "Leagues", icon: TrophyIcon },
  { href: "/specialists", label: "Specialists", icon: UsersRoundIcon },
  { href: "/#how-it-works", label: "How it works", icon: CircleUserRoundIcon },
] as const;

export function SiteHeader({ isAdmin = false, notificationCenter }: { isAdmin?: boolean; notificationCenter: { items: AppNotification[]; preferences: NotificationPreferences } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const initials = session?.user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "";

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b bg-background">
      <div className="page-shell flex h-16 items-center justify-between gap-3 sm:h-20">
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation" />}><MenuIcon /></DialogTrigger>
            <DialogContent className="inset-y-0 left-0 h-dvh max-w-[min(88vw,380px)] translate-x-0 translate-y-0 content-start rounded-none p-0 sm:max-w-[380px]" showCloseButton>
              <DialogHeader className="border-b p-5">
                <DialogTitle className="font-heading text-3xl font-extrabold uppercase">League<span className="text-primary">Cred</span></DialogTitle>
                <DialogDescription>Navigate your football network.</DialogDescription>
              </DialogHeader>
              <nav className="divide-y" aria-label="Mobile navigation">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <DialogClose key={href} render={<Link href={href} className="flex min-h-16 items-center gap-3 px-5 font-semibold hover:bg-muted" />}>
                    <Icon className="size-5 text-primary" />{label}<ChevronRightIcon className="ml-auto size-5 text-muted-foreground" />
                  </DialogClose>
                ))}
                {session ? <DialogClose render={<Link href="/slip" className="flex min-h-16 items-center gap-3 px-5 font-semibold hover:bg-muted" />}><CircleUserRoundIcon className="size-5 text-primary" />Weekly Slip<ChevronRightIcon className="ml-auto size-5 text-muted-foreground" /></DialogClose> : null}
              </nav>
            </DialogContent>
          </Dialog>
          <Link href="/" className="font-heading text-3xl leading-none font-extrabold tracking-[-0.04em] uppercase sm:text-4xl" aria-label="LeagueCred home">League<span className="text-primary">Cred</span></Link>
        </div>

        <nav className="hidden items-center gap-9 text-sm font-semibold md:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = item.href === "/leagues" ? pathname.startsWith("/leagues") : item.href === "/specialists" ? pathname.startsWith("/specialists") : false;
            return <Link key={item.href} href={item.href} className={cn("relative py-2 transition-colors hover:text-foreground", active ? "text-foreground" : "text-muted-foreground")}>{item.label}{active ? <span className="absolute inset-x-0 -bottom-[1.58rem] h-0.5 bg-primary" /> : null}</Link>;
          })}
        </nav>

        <div className="flex items-center gap-1">{session && notificationCenter ? <NotificationCenter initialItems={notificationCenter.items} initialPreferences={notificationCenter.preferences} /> : null}{session ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" aria-label={`Open account menu for ${session.user.name}`} />}><Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none p-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-2">{session.user.name}</DropdownMenuLabel>
                <DropdownMenuItem render={<Link href={`/specialists/${session.user.id}`} />} className="rounded-none px-2 py-2.5"><CircleUserRoundIcon />My dashboard</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/slip" />} className="rounded-none px-2 py-2.5"><TrophyIcon />Weekly Slip</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/onboarding" />} className="rounded-none px-2 py-2.5"><UsersRoundIcon />Set up leagues</DropdownMenuItem>
                {isAdmin ? <DropdownMenuItem render={<Link href="/admin" />} className="rounded-none px-2 py-2.5"><ShieldCheckIcon />Admin</DropdownMenuItem> : null}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup><DropdownMenuItem onClick={signOut} className="rounded-none px-2 py-2.5"><LogOutIcon />Sign out</DropdownMenuItem></DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : <Link href="/auth" aria-disabled={isPending} className={buttonVariants({ variant: "outline", size: "lg" })}>Sign in</Link>}</div>
      </div>
    </header>
  );
}
