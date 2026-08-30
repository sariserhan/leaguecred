import type { ReactNode } from "react";

export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="page-shell max-w-4xl py-14 sm:py-20">
      <h1 className="font-heading text-5xl leading-none font-extrabold uppercase sm:text-7xl">{title}</h1>
      <p className="mt-5 text-sm text-muted-foreground">Last updated: August 30, 2026</p>
      <div className="mt-12 space-y-10 text-[1.02rem] leading-8 text-muted-foreground [&_h2]:font-heading [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:uppercase [&_h2]:text-foreground [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
