import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";

import { SiteHeader } from "@/components/site-header";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={inter.variable + " " + barlowCondensed.variable + " antialiased"}
    >
      <body className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
