"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { buttonVariants } from "@/components/ui/button";

export function MobileHomeCta() {
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-x-0 bottom-16 z-30 border-t bg-background/95 p-3 shadow-[0_-8px_24px_color-mix(in_oklab,var(--foreground)_12%,transparent)] backdrop-blur md:hidden">
      <Link href="/leagues?intent=prove" className={buttonVariants({ className: "w-full" })}>Make this week&apos;s call<ArrowRightIcon data-icon="inline-end" /></Link>
    </div>,
    document.body,
  );
}
