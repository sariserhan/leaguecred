import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import { SiteBanner } from "@/components/site-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { viewerIsAdmin } from "@/lib/admin";

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
  title: {
    default: "LeagueCred — Know one league",
    template: "%s · LeagueCred",
  },
  description:
    "Build a verified record in the football league you know and follow proven specialists everywhere else.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const isAdmin = await viewerIsAdmin();

  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={inter.variable + " " + barlowCondensed.variable + " antialiased"}
    >
      <body className="flex min-h-screen flex-col bg-background text-foreground">
        <SiteBanner />
        <SiteHeader isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
