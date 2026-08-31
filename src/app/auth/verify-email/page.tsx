import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getSafeInternalPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Address confirmed",
  robots: { index: false, follow: false },
};

/**
 * Better Auth verifies the token on its own route and redirects here, so this
 * page only reports the outcome.
 */
export default async function VerifyEmailPage({ searchParams }: PageProps<"/auth/verify-email">) {
  const nextPath = getSafeInternalPath((await searchParams).next, "/leagues");
  return (
    <section className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-12">
      <div className="flex max-w-xl flex-col items-start gap-6">
        <span className="flex size-14 items-center justify-center border bg-secondary">
          <ShieldCheckIcon aria-hidden="true" className="size-7 text-primary" strokeWidth={1.5} />
        </span>
        <h1 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-6xl">
          Address confirmed
        </h1>
        <p className="text-lg leading-8 text-muted-foreground">
          Your account can now be recovered if you ever lose your password. That matters here: a
          Daily Lock record is permanent and cannot be rebuilt.
        </p>
        <Link href={nextPath} className={buttonVariants({ size: "lg" })}>
          Continue to your league
        </Link>
      </div>
    </section>
  );
}
