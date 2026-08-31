import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Cookie Notice", alternates: { canonical: "/cookies" } };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Notice">
      <section><h2>Essential cookies</h2><p>LeagueCred uses essential session cookies to keep you signed in and protect authenticated actions such as submitting a Daily Lock. These cookies are necessary for the service to work.</p></section>
      <section><h2>Analytics and local storage</h2><p>LeagueCred measures traffic with two analytics tools, neither of which uses advertising cookies. Cloudflare Web Analytics is cookieless and stores nothing on your device. visitorping is our own product rather than an outside vendor, and it stores a visitor identifier and a session identifier in your browser&rsquo;s local storage rather than in cookies: the visitor identifier is a random value that stays until you clear this site&rsquo;s data, and the session identifier is replaced after thirty minutes without activity. Neither is linked to your LeagueCred account.</p></section>
      <section><h2>What analytics records</h2><p>These tools record the pages you open, the site that referred you, any campaign or ad-click parameters carried in the link you arrived through, and engagement signals such as scroll depth, outbound clicks, form submissions, page timing, and page performance. They do not receive your name or email address. If we add or change an analytics tool, this notice will be updated.</p></section>
      <section><h2>Managing cookies</h2><p>You can control or remove cookies through your browser settings, and clear the analytics identifiers described above by clearing this site&rsquo;s local storage in the same settings. Blocking essential cookies can prevent sign-in and other authenticated LeagueCred features from working correctly.</p></section>
    </LegalPage>
  );
}
