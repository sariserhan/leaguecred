import Script from "next/script";

import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import { Suspense } from "react";

import { SiteBanner } from "@/components/site-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ViewerHeader } from "@/components/viewer-header";
import { MemberChrome } from "@/components/member-chrome";
import { getLeagueNavOptions } from "@/data/teams";
import { COMMUNITY_CHALLENGE_FLAG, LEAGUE_LEADERBOARD_FLAG, LIVE_LOCKS_FLAG, isFeatureEnabled } from "@/lib/site-settings";
import { getFeatureFlags } from "@/services/site-settings";
import { Toaster } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/theme-provider";
import { JsonLd } from "@/lib/json-ld";
import { ServiceWorkerManager } from "@/components/service-worker";

import "./globals.css";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
  // No title or description here on purpose. A value set at the root is
  // inherited by every page, so naming one made /live-locks, /communities and
  // the rest all share the homepage's card: the same headline whatever you
  // shared. Left unset, each page's own title and description fill these in.
  openGraph: {
    siteName: "LeagueCred",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
  },
  applicationName: "LeagueCred",
  // Installed on an iPhone, the site runs without Safari's chrome around it and
  // under this name rather than the page title of whatever route was open when
  // it was added.
  appleWebApp: {
    capable: true,
    title: "LeagueCred",
    statusBarStyle: "default",
  },
};

// Matched to the header, which is what sits under the browser's own bar: the
// page background in each theme, not the brand navy the manifest paints the
// splash screen with.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a121e" },
  ],
};

// Analytics runs on the real site only. leaguecred.com is served by Vercel, so a
// preview deploy and a local `next dev` are the same code on a different origin:
// left ungated, our own building and reviewing lands in the visitor numbers.
const isProduction = process.env.VERCEL_ENV === "production";

/**
 * Nothing here reads the session. Both of the reads it does make are cached and
 * tagged, so this whole shell prerenders and is served from the edge of the
 * response while the two boundaries below stream the viewer's own half in.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [leagues, flags] = await Promise.all([getLeagueNavOptions(), getFeatureFlags()]);
  const challengeEnabled = isFeatureEnabled(flags, COMMUNITY_CHALLENGE_FLAG);
  const liveLocksEnabled = isFeatureEnabled(flags, LIVE_LOCKS_FLAG);
  const leaderboardEnabled = isFeatureEnabled(flags, LEAGUE_LEADERBOARD_FLAG);
  const headerFlags = { challengeEnabled, liveLocksEnabled, leaderboardEnabled };

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
          <a href="#main-content" className="sr-only z-[100] bg-inverted px-4 py-3 font-semibold text-inverted-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Skip to main content</a>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "LeagueCred",
              url: "https://leaguecred.com",
              description,
            }}
          />
          {/* The banner reads the settings row, which is deliberately uncached so
              the maintenance switch stays immediate. Left in the open that one
              read would hold back the whole shell, so it streams like the rest
              of what depends on the moment. */}
          <Suspense fallback={null}>
            <SiteBanner />
          </Suspense>
          <Suspense
            fallback={
              <SiteHeader isAdmin={false} leagues={leagues} notificationCenter={null} viewerHandle={null} {...headerFlags} />
            }
          >
            <ViewerHeader leagues={leagues} {...headerFlags} />
          </Suspense>
          <main id="main-content" tabIndex={-1} className="flex-1">{children}</main>
          <Suspense fallback={null}>
            <MemberChrome liveLocksEnabled={liveLocksEnabled} />
          </Suspense>
          <SiteFooter challengeEnabled={challengeEnabled} liveLocksEnabled={liveLocksEnabled} leaderboardEnabled={leaderboardEnabled} />
          <Toaster timeout={4500} />
          <ServiceWorkerManager />
          {isProduction ? (
            <Script
              src="https://cdn.visitorping.com/site/vp_RJPP6CJD.js"
              strategy="afterInteractive"
              crossOrigin="anonymous"
              data-exclude="/admin*"
            />
          ) : null}
        </ThemeProvider>

        {/*
          Cloudflare Web Analytics. The token is a public identifier — it ships
          in the page source to every visitor — so it lives here rather than in
          a secret. leaguecred.com is not proxied through Cloudflare, so nothing
          is injected for us and this beacon is the whole measurement.
        */}
        {isProduction ? (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            strategy="afterInteractive"
            data-cf-beacon='{"token": "803a38ea71064b93b85e6887a1bf736a"}'
          />
        ) : null}
      </body>
    </html>
  );
}
