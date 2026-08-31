import Link from "next/link";
import { BrandMark } from "@/components/brand-logo";

const footerGroups = [
  {
    title: "Product",
    links: [
      { href: "/leagues", label: "Leagues" },
      { href: "/#how-it-works", label: "How it works" },
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

export function SiteFooter() {
  return (
    <footer className="border-t bg-foreground text-background">
      <div className="page-shell grid gap-10 py-10 sm:grid-cols-[1fr_auto_auto] sm:gap-16">
        <div>
          <Link href="/" className="flex items-center gap-2.5 font-heading text-3xl font-extrabold uppercase">
            <BrandMark size={32} className="size-8" />
            <span>League<span className="text-primary">Cred</span></span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-background/70">
            One near-certain Daily Lock from the league you know. Proven expertise everywhere else.
          </p>
        </div>
        {footerGroups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-bold text-primary">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm text-background/75">
              {group.links.map((link) => (
                <li key={link.href}><Link href={link.href} className="transition-colors hover:text-background">{link.label}</Link></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-background/20">
        <div className="page-shell py-4 text-xs text-background/60">© {new Date().getFullYear()} LeagueCred. Built on independent records.</div>
      </div>
    </footer>
  );
}
