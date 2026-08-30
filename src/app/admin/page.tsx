import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

import {
  DiagnosticsHeading,
  OperationalSummaryPanel,
  SettlementCorrectionsPanel,
  SyncRunsPanel,
} from "@/components/admin/diagnostics-panels";
import { FeatureFlagControls } from "@/components/admin/feature-flag-controls";
import { SiteControls } from "@/components/admin/site-controls";
import { buttonVariants } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin";
import {
  getOperationalSummary,
  getSettlementCorrections,
  getSyncRunDiagnostics,
} from "@/services/admin-diagnostics";
import { getFeatureFlags, getSiteSettings } from "@/services/site-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // Authorization runs before anything is read, so a member never triggers a query.
  const viewer = await requireAdmin();

  const [settings, flags, summary, syncRuns, corrections] = await Promise.all([
    getSiteSettings(),
    getFeatureFlags(),
    getOperationalSummary(),
    getSyncRunDiagnostics(),
    getSettlementCorrections(),
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

      <SiteControls settings={settings} />

      <FeatureFlagControls flags={flags} />

      <section className="flex flex-col gap-6">
        <DiagnosticsHeading />
        <SyncRunsPanel runs={syncRuns} />
        <SettlementCorrectionsPanel corrections={corrections} />
      </section>
    </div>
  );
}
