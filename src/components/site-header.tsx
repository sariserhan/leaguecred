"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Button, buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/leagues", label: "Leagues" },
  { href: "/leagues/super-lig#specialists", label: "Specialists" },
  { href: "/#how-it-works", label: "How it works" },
] as const;

export function SiteHeader() {
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
            const active =
              item.href === "/leagues"
                ? pathname === "/leagues"
                : pathname.startsWith(item.href.split("#")[0]) &&
                  item.href.includes("specialists");

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
        </nav>

        {session ? (
          <Button variant="outline" size="lg" onClick={signOut}>
            Sign out · {session.user.name.split(" ")[0]}
          </Button>
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
    </header>
  );
}
