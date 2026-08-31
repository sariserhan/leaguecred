import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

import {
  AbuseSignalsPanel,
  AdminAuditLogPanel,
  DiagnosticsHeading,
  OperationalSummaryPanel,
  SettlementCorrectionsPanel,
  SiteFeedbackPanel,
  SyncRunsPanel,
} from "@/components/admin/diagnostics-panels";
import { FeatureFlagControls } from "@/components/admin/feature-flag-controls";
import { SiteControls } from "@/components/admin/site-controls";
import { AdminManagementPanels } from "@/components/admin/management-panels";
import { CatalogHealthPanel } from "@/components/admin/catalog-health-panel";
import { MemberSeedingPanel } from "@/components/admin/member-seeding-panel";
import { DistributionAnalyticsPanel } from "@/components/admin/distribution-analytics";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { getSharedIpAccounts, getSuspiciousFollows } from "@/services/abuse-signals";
import { getAdminAuditLog } from "@/services/admin-audit-log";
import { refreshLeagueFixtures } from "@/app/admin/actions";
import { getLeagueNavOptions } from "@/data/teams";
import {
  getOperationalSummary,
  getAdminManagementSummary,
  getSettlementCorrections,
  getSyncRunDiagnostics,
} from "@/services/admin-diagnostics";
import { getFeatureFlags, getSiteSettings } from "@/services/site-settings";
import { getDistributionAnalytics } from "@/data/distribution";
import { listMembers } from "@/services/member-seeding";
import { getSiteFeedback } from "@/services/site-feedback";
import { TOLERATED_CATALOG_FAULTS, measureCatalogHealth } from "@/services/catalog-health";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Authorization runs before anything is read, so a member never triggers a query.
  const viewer = await requireAdmin();

  const [
    settings,
    flags,
    summary,
    syncRuns,
    corrections,
    auditLog,
    management,
    leagues,
    sharedIpClusters,
    suspiciousFollows,
    distribution,
    members,
    catalogHealth,
    feedback,
  ] = await Promise.all([
    getSiteSettings(),
    getFeatureFlags(),
    getOperationalSummary(),
    getSyncRunDiagnostics(),
    getSettlementCorrections(),
    getAdminAuditLog(),
    getAdminManagementSummary(),
    getLeagueNavOptions(),
    getSharedIpAccounts(),
    getSuspiciousFollows(),
    getDistributionAnalytics(),
    listMembers(),
    measureCatalogHealth(TOLERATED_CATALOG_FAULTS),
    getSiteFeedback(),
  ]);

  return (
    <div className="page-shell flex flex-col gap-10 py-12 sm:py-16">
      <header className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
            <ShieldCheckIcon aria-hidden="true" className="size-4 text-primary" />
            Admin
          </span>
          <h1 className="mt-3 font-heading text-5xl leading-none font-extrabold uppercase sm:text-6xl">
            Site controls
          </h1>
          <p className="mt-4 max-w-xl leading-7 text-muted-foreground">
            Signed in as {viewer.name}. Every change here applies to all visitors as soon as it is
            saved.
          </p>
        </div>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          View the site
        </Link>
      </header>

      <OperationalSummaryPanel summary={summary} />

      <DistributionAnalyticsPanel data={distribution} />

      <SiteControls settings={settings} />

      <section className="border p-5 sm:p-6"><h2 className="font-heading text-2xl font-bold uppercase">Refresh league data</h2><p className="mt-1 text-sm text-muted-foreground">Refresh one league’s fixtures and standings without touching other competitions.</p><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{leagues.map((league) => <form key={league.slug} action={refreshLeagueFixtures.bind(null, league.slug)}><button type="submit" className="flex w-full items-center justify-between border px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted"><span>{league.name}</span><span className="text-xs text-muted-foreground">Refresh</span></button></form>)}</div></section>

      <FeatureFlagControls flags={flags} />

      <CatalogHealthPanel health={catalogHealth} />

      <MemberSeedingPanel members={members} leagues={leagues} />

      <AdminManagementPanels data={management} />

      <section className="flex flex-col gap-6">
        <DiagnosticsHeading />
        <SyncRunsPanel runs={syncRuns} />
        <SettlementCorrectionsPanel corrections={corrections} />
        <AdminAuditLogPanel entries={auditLog} />
        <AbuseSignalsPanel sharedIpClusters={sharedIpClusters} suspiciousFollows={suspiciousFollows} />
        <SiteFeedbackPanel bug={feedback.bug} contact={feedback.contact} support={feedback.support} />
      </section>
    </div>
  );
}
