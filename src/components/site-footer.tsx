import Link from "next/link";
import { BrandMark } from "@/components/brand-logo";
import { FooterHelpLinks } from "@/components/site-footer-feedback";
import { ThemeToggle } from "@/components/theme-toggle";
import { COMMUNITY_CHALLENGE_FLAG, LEAGUE_LEADERBOARD_FLAG, LIVE_LOCKS_FLAG } from "@/lib/site-settings";

const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/leagues", label: "Leagues" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/challenges", label: "Community challenge", flag: COMMUNITY_CHALLENGE_FLAG },
      { href: "/fixtures", label: "Fixtures by day" },
      { href: "/live-locks", label: "Global active locks", flag: LIVE_LOCKS_FLAG },
      { href: "/leaderboard", label: "Leaderboard", flag: LEAGUE_LEADERBOARD_FLAG },
      { href: "/communities", label: "Communities" },
      { href: "/recaps", label: "Weekly recap" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of Use" },
      { href: "/privacy", label: "Privacy Notice" },
      { href: "/cookies", label: "Cookie Notice" },
    ],
  },
] as const;

export function SiteFooter({ challengeEnabled, liveLocksEnabled, leaderboardEnabled }: { challengeEnabled: boolean; liveLocksEnabled: boolean; leaderboardEnabled: boolean }) {
  // A footer link to a route the flag has turned into a 404 is worse than no
  // link, so a flagged entry is dropped along with the page it points at.
  const enabledByFlag: Record<string, boolean> = {
    [COMMUNITY_CHALLENGE_FLAG]: challengeEnabled,
    [LIVE_LOCKS_FLAG]: liveLocksEnabled,
    [LEAGUE_LEADERBOARD_FLAG]: leaderboardEnabled,
  };

  return (
    <footer className="border-t bg-inverted text-inverted-foreground">
      <div className="page-shell grid gap-10 py-10 sm:grid-cols-[1fr_auto_auto_auto] sm:gap-16">
        <div>
          <Link href="/" className="flex items-center gap-2.5 font-heading text-3xl font-extrabold uppercase">
            <BrandMark size={32} className="size-8" />
            <span>League<span className="text-primary">Cred</span></span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-inverted-foreground/70">
            One near-certain Daily Lock from the league you know. Proven expertise everywhere else.
          </p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-bold text-primary">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-inverted-foreground/75">
              {group.links.filter((link) => !("flag" in link) || enabledByFlag[link.flag]).map((link) => (
                <li key={link.href}><Link href={link.href} className="transition-colors hover:text-inverted-foreground">{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
        <nav aria-label="Help">
          <h2 className="text-sm font-bold text-primary">Help</h2>
          <FooterHelpLinks />
        </nav>
      </div>
      <div className="border-t border-inverted-foreground/20">
        <div className="page-shell flex flex-col items-start justify-between gap-3 py-4 text-xs text-inverted-foreground/60 sm:flex-row sm:items-center">
          <div>© {new Date().getFullYear()} LeagueCred. Built on independent records.</div>
          <div className="flex items-center gap-2 text-inverted-foreground/80">
            <span>Theme:</span>
            <ThemeToggle variant="dropdown" className="size-8 text-inverted-foreground/80 hover:text-inverted-foreground" />
          </div>
        </div>
      </div>
    </footer>
  );
}
