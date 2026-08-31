"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import Image from "next/image";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleUserRoundIcon,
  LogOutIcon,
  MenuIcon,
  ShieldCheckIcon,
  Settings2Icon,
  TrophyIcon,
  UsersRoundIcon,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { loadLeagueTeams } from "@/app/actions";
import type { LeagueNavOption, TeamNavTeam } from "@/data/teams";
import { BrandMark } from "@/components/brand-logo";
import { NotificationCenter } from "@/components/notification-center";
import { GlobalSearch } from "@/components/global-search";
import type { AppNotification, NotificationPreferences } from "@/data/notifications";
import { HowItWorksDialog } from "@/components/how-it-works-dialog";

const navItems = [
  { href: "/leagues", label: "Leagues", icon: TrophyIcon },
  { href: "/specialists", label: "Specialists", icon: UsersRoundIcon },
] as const;

export function SiteHeader({
  isAdmin = false,
  leagues,
  notificationCenter,
}: {
  isAdmin?: boolean;
  leagues: LeagueNavOption[];
  notificationCenter: { items: AppNotification[]; preferences: NotificationPreferences } | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [selectedLeague, setSelectedLeague] = useState<LeagueNavOption | null>(null);
  // Clubs arrive from the server the first time a league is opened, then stay.
  const [teamsByLeague, setTeamsByLeague] = useState<Record<string, TeamNavTeam[]>>({});
  const [isLoadingTeams, startLoadingTeams] = useTransition();

  const openLeague = useCallback((league: LeagueNavOption) => {
    setSelectedLeague(league);
    if (teamsByLeague[league.slug]) return;
    startLoadingTeams(async () => {
      const loaded = await loadLeagueTeams(league.slug);
      setTeamsByLeague((current) => ({ ...current, [league.slug]: loaded }));
    });
  }, [teamsByLeague]);

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
                <DialogTitle className="font-heading text-3xl font-extrabold uppercase">
                  <DialogClose nativeButton={false} render={<Link href="/" className="inline-flex items-center gap-2.5 outline-none hover:opacity-90" aria-label="LeagueCred home" />}>
                    <BrandMark size={28} />
                    <span>League<span className="text-primary">Cred</span></span>
                  </DialogClose>
                </DialogTitle>
                <DialogDescription>Navigate your football network.</DialogDescription>
              </DialogHeader>
              <nav className="divide-y" aria-label="Mobile navigation">
                {navItems.map(({ href, label, icon: Icon }) => (
                  <DialogClose nativeButton={false} key={href} render={<Link href={href} className="flex min-h-16 items-center gap-3 px-5 font-semibold hover:bg-muted" />}>
                    <Icon className="size-5 text-primary" />{label}<ChevronRightIcon className="ml-auto size-5 text-muted-foreground" />
                  </DialogClose>
                ))}
                <HowItWorksDialog mobile />
                {session ? <><DialogClose nativeButton={false} render={<Link href="/network" className="flex min-h-16 items-center gap-3 px-5 font-semibold hover:bg-muted" />}><Settings2Icon className="size-5 text-primary" />My network<ChevronRightIcon className="ml-auto size-5 text-muted-foreground" /></DialogClose><DialogClose nativeButton={false} render={<Link href="/slip" className="flex min-h-16 items-center gap-3 px-5 font-semibold hover:bg-muted" />}><CircleUserRoundIcon className="size-5 text-primary" />Weekly Slip<ChevronRightIcon className="ml-auto size-5 text-muted-foreground" /></DialogClose><DialogClose nativeButton={false} render={<Link href="/settings" className="flex min-h-16 items-center gap-3 px-5 font-semibold hover:bg-muted" />}><Settings2Icon className="size-5 text-primary" />Settings<ChevronRightIcon className="ml-auto size-5 text-muted-foreground" /></DialogClose></> : null}
              </nav>
            </DialogContent>
          </Dialog>
          <Link
            href="/"
            className="group flex items-center gap-2.5 rounded-sm font-heading text-3xl leading-none font-extrabold tracking-[-0.04em] uppercase transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-4xl"
            aria-label="LeagueCred home"
          >
            <BrandMark size={32} className="size-7 transition-transform group-hover:scale-105 sm:size-8" />
            <span>League<span className="text-primary">Cred</span></span>
          </Link>
        </div>

        <nav className="hidden items-center gap-9 text-sm font-semibold md:flex" aria-label="Primary navigation">
          <Link href="/leagues" className={cn("relative py-2 transition-colors hover:text-foreground", pathname.startsWith("/leagues") ? "text-foreground" : "text-muted-foreground")}>Leagues{pathname.startsWith("/leagues") ? <span className="absolute inset-x-0 -bottom-[1.58rem] h-0.5 bg-primary" /> : null}</Link>
          <Menu.Root onOpenChange={(open) => { if (!open) setSelectedLeague(null); }}>
            <Menu.Trigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                pathname.startsWith("/teams") ? "text-foreground" : "text-muted-foreground",
              )}
            >
              Teams
              <ChevronDownIcon className="size-4 transition-transform data-[pressed]:rotate-180" aria-hidden="true" />
            </Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner sideOffset={8} align="start" className="z-50 outline-none">
                <Menu.Popup className="w-72 border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
                  {selectedLeague ? (
                    <>
                      <div className="flex items-center gap-2 border-b px-3 py-2">
                        <Menu.Item
                          aria-label="Back to leagues"
                          closeOnClick={false}
                          onClick={() => setSelectedLeague(null)}
                          className="cursor-pointer flex size-7 items-center justify-center text-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
                        >
                          ←
                        </Menu.Item>
                        {selectedLeague.logoUrl ? <Image src={selectedLeague.logoUrl} alt="" width={28} height={28} className="size-7 object-contain" /> : null}
                        <span className="truncate text-sm font-bold">{selectedLeague.name}</span>
                      </div>
                      <Menu.LinkItem href={`/leagues/${selectedLeague.slug}/standings`} className="cursor-pointer flex items-center px-3 py-2 text-sm font-semibold text-foreground outline-none hover:bg-muted hover:text-primary">View standings</Menu.LinkItem>
                      <div className="max-h-80 overflow-y-auto py-1">
                        {(teamsByLeague[selectedLeague.slug] ?? []).map((team) => (
                          <Menu.LinkItem
                            key={team.slug}
                            href={`/teams/${team.slug}`}
                            className="cursor-pointer flex items-center gap-3 px-3 py-2 text-sm font-medium outline-none transition-colors data-highlighted:bg-muted data-highlighted:text-foreground"
                          >
                            {team.logoUrl ? <Image src={team.logoUrl} alt="" width={28} height={28} className="size-7 object-contain" /> : <span className="flex size-7 items-center justify-center bg-muted text-[10px] font-bold">{team.name.slice(0, 3).toUpperCase()}</span>}
                            <span className="truncate">{team.name}</span>
                          </Menu.LinkItem>
                        ))}
                        {!teamsByLeague[selectedLeague.slug] ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
                            {isLoadingTeams ? "Loading clubs\u2026" : "No clubs are cataloged yet."}
                          </p>
                        ) : teamsByLeague[selectedLeague.slug].length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted-foreground">No clubs are cataloged yet.</p>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="max-h-96 overflow-y-auto py-1">
                      {leagues.map((league) => (
                        <Menu.Item
                          key={league.slug}
                          closeOnClick={false}
                          onClick={() => openLeague(league)}
                          className="cursor-pointer flex items-center gap-3 px-3 py-2 text-sm font-medium outline-none transition-colors data-highlighted:bg-muted data-highlighted:text-foreground"
                        >
                          {league.logoUrl ? <Image src={league.logoUrl} alt="" width={32} height={32} className="size-8 object-contain" /> : <span className="flex size-8 items-center justify-center bg-muted text-xs font-bold">{league.name.slice(0, 2).toUpperCase()}</span>}
                          <span className="min-w-0 flex-1 truncate">{league.name}</span>
                          <span aria-hidden="true" className="text-muted-foreground">→</span>
                        </Menu.Item>
                      ))}
                    </div>
                  )}
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
          <Link href="/specialists" className={cn("relative py-2 transition-colors hover:text-foreground", pathname.startsWith("/specialists") ? "text-foreground" : "text-muted-foreground")}>Specialists{pathname.startsWith("/specialists") ? <span className="absolute inset-x-0 -bottom-[1.58rem] h-0.5 bg-primary" /> : null}</Link>
          <HowItWorksDialog />
        </nav>

        <div className="flex items-center gap-1"><GlobalSearch />{session && notificationCenter ? <NotificationCenter initialItems={notificationCenter.items} initialPreferences={notificationCenter.preferences} /> : null}{session ? (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="cursor-pointer" aria-label={`Open account menu for ${session.user.name}`} />}><Avatar className="size-8"><AvatarFallback>{initials}</AvatarFallback></Avatar></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none p-2">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-2">{session.user.name}</DropdownMenuLabel>
                <DropdownMenuItem render={<Link href={`/specialists/${session.user.id}`} />} className="cursor-pointer rounded-none px-2 py-2.5"><CircleUserRoundIcon />My dashboard</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/slip" />} className="cursor-pointer rounded-none px-2 py-2.5"><TrophyIcon />Weekly Slip</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/network" />} className="cursor-pointer rounded-none px-2 py-2.5"><Settings2Icon />My network</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/onboarding" />} className="cursor-pointer rounded-none px-2 py-2.5"><UsersRoundIcon />Set up leagues</DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/settings" />} className="cursor-pointer rounded-none px-2 py-2.5"><Settings2Icon />Settings</DropdownMenuItem>
                {isAdmin ? <DropdownMenuItem render={<Link href="/admin" />} className="cursor-pointer rounded-none px-2 py-2.5"><ShieldCheckIcon />Admin</DropdownMenuItem> : null}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup><DropdownMenuItem onClick={signOut} className="cursor-pointer rounded-none px-2 py-2.5"><LogOutIcon />Sign out</DropdownMenuItem></DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : <Link href="/auth" aria-disabled={isPending} className={buttonVariants({ variant: "outline", size: "lg" })}>Sign in</Link>}</div>
      </div>
    </header>
  );
}
