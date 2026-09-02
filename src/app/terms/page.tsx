import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = { title: "Terms of Use", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <section><h2>Using LeagueCred</h2><p>LeagueCred lets members build a public record from one independent Daily Lock in the football leagues they know. By using the service, you agree to use it lawfully, provide accurate account information, and protect your sign-in credentials.</p></section>
      <section><h2>Not betting advice</h2><p>LeagueCred is a football knowledge and reputation product. Picks, records, specialist calls, fixtures, and results are informational only. They are not financial, betting, or investment advice, and no result is guaranteed.</p></section>
      <section><h2>Independent records</h2><p>Your independent Daily Lock may not be changed after it is submitted. Followed calls are kept separate from independent records and never count toward specialist rank. We may correct a settled record when an official fixture result changes, while preserving the settlement history.</p></section>
      <section><h2>Fair use</h2><p>You may not manipulate records, create misleading identities, automate the service without permission, interfere with other members, or use LeagueCred to break applicable law. We may restrict or suspend access to protect the integrity of the network.</p></section>
      <section><h2>Service changes</h2><p>Fixture information depends on third-party sources and may change, be delayed, or be unavailable. We may update, suspend, or improve parts of the service and will update these terms when a material change requires it.</p></section>
    </LegalPage>
  );
}
