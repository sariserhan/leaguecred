"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldCheckIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { TeamNavOption } from "@/data/teams";

const navItems = [
  { href: "/leagues", label: "Leagues" },
  { href: "/specialists", label: "Specialists" },
  { href: "/#how-it-works", label: "How it works" },
] as const;

export function SiteHeader({
  isAdmin = false,
  teams,
}: {
  isAdmin?: boolean;
  teams: TeamNavOption[];
}) {
  const pathname = usePathname();
  const router = useRouter();
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
          <label className="sr-only" htmlFor="team-picker">Open a team page</label>
          <select
            id="team-picker"
            defaultValue=""
            onChange={(event) => {
              if (event.target.value) router.push(`/teams/${event.target.value}`);
            }}
            className="h-9 max-w-40 border bg-background px-2 text-sm font-semibold text-muted-foreground outline-none transition-colors hover:border-foreground focus:border-ring focus:ring-2 focus:ring-ring/30"
          >
            <option value="">Teams</option>
            {teams.map((team) => (
              <option key={team.slug} value={team.slug}>
                {team.name}{team.country ? ` · ${team.country}` : ""}
              </option>
            ))}
          </select>
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
