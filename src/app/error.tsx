"use client";

import { useEffect } from "react";
import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-16 text-center">
      <div className="flex max-w-xl flex-col items-center gap-6">
        <span className="font-heading text-8xl font-extrabold text-primary">90+4</span>
        <h1 className="section-title">Something went wrong late in the match.</h1>
        <p className="text-muted-foreground">
          Your data has not been changed. Try loading this LeagueCred view again.
        </p>
        <Button size="lg" onClick={reset}>
          <RotateCcwIcon data-icon="inline-start" />
          Try again
        </Button>
      </div>
    </div>
  );
}
