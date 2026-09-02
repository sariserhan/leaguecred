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
import { ResultPullPanel } from "@/components/admin/result-pull-panel";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { LeagueRefreshPanel } from "@/components/admin/league-refresh-panel";
import { DuplicateClubsPanel } from "@/components/admin/duplicate-clubs-panel";
import { MemberSeedingPanel } from "@/components/admin/member-seeding-panel";
import { DistributionAnalyticsPanel } from "@/components/admin/distribution-analytics";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import { getSharedIpAccounts, getSuspiciousFollows } from "@/services/abuse-signals";
import { getAdminAuditLog } from "@/services/admin-audit-log";
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

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Refreshing every league in one press walks 23 competitions, so the actions on
// this page get the same room the nightly route has rather than the default.
export const maxDuration = 300;

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

      <AdminTabs
        sections={[
          {
            value: "overview",
            label: "Overview",
            content: (
              <>
                <OperationalSummaryPanel summary={summary} />
                <DistributionAnalyticsPanel data={distribution} />
              </>
            ),
          },
          {
            value: "site",
            label: "Site",
            content: (
              <>
                <SiteControls settings={settings} />
                <FeatureFlagControls flags={flags} />
              </>
            ),
          },
          {
            value: "data",
            label: "Fixtures & results",
            content: (
              <>
                <ResultPullPanel leagues={leagues} />
                <LeagueRefreshPanel leagues={leagues} />
                <CatalogHealthPanel health={catalogHealth} />
                <DuplicateClubsPanel />
              </>
            ),
          },
          {
            value: "members",
            label: "Members",
            content: (
              <>
                <MemberSeedingPanel members={members} leagues={leagues} />
                <AdminManagementPanels data={management} />
              </>
            ),
          },
          {
            value: "diagnostics",
            label: "Diagnostics",
            content: (
              <>
                <DiagnosticsHeading />
                <SyncRunsPanel runs={syncRuns} />
                <SettlementCorrectionsPanel corrections={corrections} />
                <AdminAuditLogPanel entries={auditLog} />
                <AbuseSignalsPanel sharedIpClusters={sharedIpClusters} suspiciousFollows={suspiciousFollows} />
              </>
            ),
          },
          {
            value: "feedback",
            label: "Feedback",
            content: <SiteFeedbackPanel bug={feedback.bug} contact={feedback.contact} support={feedback.support} />,
          },
        ]}
      />

    </div>
  );
}
