"use client";

import { useEffect } from "react";
import { HomeIcon, RotateCcwIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

import "./globals.css";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="grid min-h-screen place-items-center bg-background px-5 text-foreground">
        <main className="flex max-w-xl flex-col items-center gap-6 text-center">
          <span className="font-heading text-8xl font-extrabold text-primary">
            500
          </span>
          <h1 className="section-title">The scoreboard is unavailable.</h1>
          <p className="text-muted-foreground">
            LeagueCred could not load safely. No picks or records have been
            changed.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" onClick={() => window.location.reload()}>
              <RotateCcwIcon data-icon="inline-start" />
              Reload LeagueCred
            </Button>
            <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
              <HomeIcon data-icon="inline-start" />
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
