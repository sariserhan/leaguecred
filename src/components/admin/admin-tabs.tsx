"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";

export type AdminSection = { value: string; label: string; content: ReactNode };

const STORAGE_KEY = "leaguecred-admin-tab";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function storedTab() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // A browser refusing storage still gets working tabs, just not remembered ones.
    return null;
  }
}

/**
 * The admin page is a dozen unrelated panels: site controls, jobs, member
 * seeding, diagnostics. Stacked, finding one meant scrolling past the rest,
 * so each group gets a tab.
 *
 * The chosen tab is remembered per browser. Admin work is repetitive - pull
 * results, look at sync runs, pull again - and landing back on Overview after
 * every action made that worse rather than better. Read through
 * useSyncExternalStore rather than in an effect, so the server render and the
 * first client render agree and the remembered tab needs no second paint.
 */
export function AdminTabs({ sections }: { sections: AdminSection[] }) {
  const [chosen, setChosen] = useState<string | null>(null);
  const remembered = useSyncExternalStore(subscribe, storedTab, () => null);
  const fallback = sections[0]?.value ?? "";
  const value = chosen
    ?? (remembered && sections.some((section) => section.value === remembered) ? remembered : fallback);

  function select(next: string) {
    setChosen(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // As above.
    }
  }

  return (
    <Tabs value={value} onValueChange={(next) => { if (typeof next === "string") select(next); }}>
      <TabsList aria-label="Admin sections">
        {sections.map((section) => (
          <TabsTab key={section.value} value={section.value}>{section.label}</TabsTab>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsPanel key={section.value} value={section.value}>{section.content}</TabsPanel>
      ))}
    </Tabs>
  );
}
