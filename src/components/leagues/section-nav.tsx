"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type SectionLink = { id: string; label: string };

/**
 * The league page's own tabs, marking the section actually on screen.
 *
 * They were plain anchors with the first one painted as selected, so the green
 * underline sat under Fixtures however far down the page you were. These are
 * still anchors - the sections are all rendered, and a link to one should work
 * without JavaScript - but the mark follows the reader.
 */
export function SectionNav({ sections, children }: { sections: SectionLink[]; children?: React.ReactNode }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const ids = sections.map((section) => section.id).join(",");

  useEffect(() => {
    const elements = ids.split(",").map((id) => document.getElementById(id)).filter((element) => element !== null);
    if (elements.length === 0) return undefined;

    // The topmost section still intersecting the viewport is the one being
    // read. Measured against the sticky bar's own height, so a section counts
    // as reached when it clears the bar rather than when it touches the window.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-56px 0px -55% 0px", threshold: 0 },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [ids]);

  return (
    <nav className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur" aria-label="League sections">
      <div className="page-shell flex overflow-x-auto">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={active === section.id ? "true" : undefined}
            onClick={() => setActive(section.id)}
            className={cn(
              "shrink-0 border-b-2 px-4 py-3 text-sm font-bold transition-colors",
              active === section.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {section.label}
          </a>
        ))}
        {children}
      </div>
    </nav>
  );
}
