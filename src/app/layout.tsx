import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import { SiteBanner } from "@/components/site-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { viewerIsAdmin } from "@/lib/admin";
import { getLeagueNavOptions } from "@/data/teams";
import { getSession } from "@/lib/auth-session";
import { getNotificationCenter } from "@/data/notifications";
import { Toaster } from "@/components/ui/toast";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://leaguecred.com"),
  title: {
    default: "LeagueCred — Know one league",
    template: "%s · LeagueCred",
  },
  description:
    "Build a verified record in the football league you know and follow proven specialists everywhere else.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [isAdmin, session, leagues] = await Promise.all([
    viewerIsAdmin(),
    getSession(),
    getLeagueNavOptions(),
  ]);
  const notificationCenter = session ? await getNotificationCenter(session.user.id) : null;

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={inter.variable + " " + barlowCondensed.variable + " antialiased"}
    >
      <body suppressHydrationWarning className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteBanner />
        <SiteHeader isAdmin={isAdmin} leagues={leagues} notificationCenter={notificationCenter} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster timeout={4500} />
      </body>
    </html>
  );
}
