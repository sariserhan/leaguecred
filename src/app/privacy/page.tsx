import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice">
      <section><h2>Information we store</h2><p>When you create an account, we store your name, email address, authentication details, and session metadata such as IP address and browser user agent. When you use LeagueCred, we store your independent picks, followed calls, league follows, and the reputation records produced from settled picks.</p></section>
      <section><h2>How we use it</h2><p>We use this information to authenticate you, operate the Weekly Lock and follow flows, calculate reputation, prevent misuse, and maintain the security and reliability of the service.</p></section>
      <section><h2>What is public</h2><p>Your specialist name, independent record, rank, and eligible specialist calls may be visible to other members. Your email address, session metadata, and authentication details are not part of the public product experience.</p></section>
      <section><h2>Service providers</h2><p>We use hosting, database, authentication, and football-data providers to operate LeagueCred. They process only the information needed to provide their part of the service. We do not sell personal information or use advertising trackers in the application.</p></section>
      <section><h2>Your choices</h2><p>You can stop using LeagueCred at any time. If you need access, correction, or deletion help for account information, use the support channel published by LeagueCred. Some settled record history may need to remain where necessary to protect the integrity of public reputation records.</p></section>
    </LegalPage>
  );
}
