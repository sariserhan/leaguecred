import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Cookie Notice" };

export default function CookiesPage() {
  return (
    <LegalPage title="Cookie Notice">
      <section><h2>Essential cookies</h2><p>LeagueCred uses essential session cookies to keep you signed in and protect authenticated actions such as submitting a Daily Lock. These cookies are necessary for the service to work.</p></section>
      <section><h2>No advertising cookies</h2><p>The application does not currently use advertising cookies or in-app analytics trackers. If that changes, this notice will be updated before the new use takes effect.</p></section>
      <section><h2>Managing cookies</h2><p>You can control or remove cookies through your browser settings. Blocking essential cookies can prevent sign-in and other authenticated LeagueCred features from working correctly.</p></section>
    </LegalPage>
  );
}
