"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@base-ui/react/menu";
import Image from "next/image";
import { ChevronDownIcon, ShieldCheckIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { loadLeagueTeams } from "@/app/actions";
import type { LeagueNavOption, TeamNavTeam } from "@/data/teams";

const navItems = [
  { href: "/leagues", label: "Leagues" },
  { href: "/specialists", label: "Specialists" },
  { href: "/#how-it-works", label: "How it works" },
] as const;

export function SiteHeader({
  isAdmin = false,
  leagues,
}: {
  isAdmin?: boolean;
  leagues: LeagueNavOption[];
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

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b bg-background">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link
          href="/"
          className="font-heading text-3xl leading-none font-extrabold tracking-[-0.04em] uppercase sm:text-4xl"
          aria-label="LeagueCred home"
        >
          League<span className="text-primary">Cred</span>
        </Link>

        <nav className="hidden items-center gap-9 text-sm font-semibold md:flex" aria-label="Primary navigation">
          {navItems.map((item) => {
            const active = item.href === "/leagues"
              ? pathname.startsWith("/leagues")
              : item.href === "/specialists"
                ? pathname.startsWith("/specialists")
                : false;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative py-2 transition-colors hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 -bottom-[1.58rem] h-0.5 bg-primary" />
                ) : null}
              </Link>
            );
          })}
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
        </nav>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link href="/admin" className={buttonVariants({ variant: "ghost", size: "lg" })}>
              <ShieldCheckIcon data-icon="inline-start" />
              Admin
            </Link>
          ) : null}
          {session ? (
            <>
              <Link href={`/specialists/${session.user.id}`} className={buttonVariants({ variant: "ghost", size: "lg" })}>
                My dashboard
              </Link>
              <Button variant="outline" size="lg" onClick={signOut}>
                Sign out · {session.user.name.split(" ")[0]}
              </Button>
            </>
          ) : (
            <Link
              href="/auth"
              aria-disabled={isPending}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
