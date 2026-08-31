import Script from "next/script";

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
import { MobileMemberNav } from "@/components/mobile-member-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd } from "@/lib/json-ld";

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

const description =
  "Build a verified record in the football league you know and follow proven specialists everywhere else.";

export const metadata: Metadata = {
  metadataBase: new URL("https://leaguecred.com"),
  title: {
    default: "LeagueCred — Know one league",
    template: "%s · LeagueCred",
  },
  description,
  openGraph: {
    siteName: "LeagueCred",
    type: "website",
    locale: "en_US",
    title: "LeagueCred — Know one league",
    description,
  },
  twitter: {
    card: "summary",
    title: "LeagueCred — Know one league",
    description,
  },
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
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={inter.variable + " " + barlowCondensed.variable + " antialiased"}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('leaguecred-theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}else{document.documentElement.classList.remove('dark');document.documentElement.style.colorScheme='light';}}catch(e){}})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-screen flex-col bg-background text-foreground">
        <ThemeProvider>
          <a href="#main-content" className="sr-only z-[100] bg-foreground px-4 py-3 font-semibold text-background focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to main content</a>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LeagueCred",
              url: "https://leaguecred.com",
              description,
            }}
          />
          <SiteBanner />
          <SiteHeader isAdmin={isAdmin} leagues={leagues} notificationCenter={notificationCenter} />
          <main id="main-content" tabIndex={-1} className={session ? "flex-1 pb-16 md:pb-0" : "flex-1"}>{children}</main>
          <SiteFooter />
          {session ? <MobileMemberNav userId={session.user.id} unread={notificationCenter?.items.filter((item) => !item.readAt).length ?? 0} /> : null}
          <Toaster timeout={4500} />
          <Script
            src="https://cdn.visitorping.com/site/vp_RJPP6CJD.js"
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
