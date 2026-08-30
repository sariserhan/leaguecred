import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-16 text-center">
      <div className="flex max-w-xl flex-col items-center gap-6">
        <span className="font-heading text-8xl font-extrabold text-primary">404</span>
        <h1 className="section-title">That league is off the fixture list.</h1>
        <p className="text-muted-foreground">
          The page may have moved, or this league is not active on LeagueCred yet.
        </p>
        <Link href="/leagues" className={buttonVariants({ size: "lg" })}>
          <ArrowLeftIcon data-icon="inline-start" />
          Explore active leagues
        </Link>
      </div>
    </div>
  );
}
