import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { WrenchIcon } from "lucide-react";

import { viewerIsAdmin } from "@/lib/admin";
import { getSiteSettings } from "@/services/site-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maintenance",
  robots: { index: false, follow: false },
};

const defaultMessage =
  "LeagueCred is briefly unavailable while we finish scheduled work. Weekly Locks, records, and settlement history are untouched.";

export default async function MaintenancePage() {
  const [settings, isAdmin] = await Promise.all([getSiteSettings(), viewerIsAdmin()]);

  // Nothing to explain once maintenance is over.
  if (!settings.maintenanceEnabled) redirect("/");

  return (
    <section className="page-shell flex min-h-[560px] max-w-3xl flex-col items-start justify-center gap-6 py-20">
      <span className="flex size-14 items-center justify-center border bg-secondary">
        <WrenchIcon aria-hidden="true" className="size-7" strokeWidth={1.5} />
      </span>
      <h1 className="display-title normal-case">We are working on the pitch.</h1>
      <p className="max-w-xl text-lg leading-8 text-muted-foreground">
        {settings.maintenanceMessage ?? defaultMessage}
      </p>
      {isAdmin ? (
        <p className="border border-primary bg-secondary px-4 py-3 text-sm font-semibold">
          You are signed in as an admin, so the rest of the site stays available to you.
        </p>
      ) : null}
    </section>
  );
}
