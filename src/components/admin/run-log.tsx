"use client";

import { useCallback, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";

export type RunEntry = { id: string; at: string; label: string; line: string; failed: boolean };

/**
 * What a button in here just did, kept on screen.
 *
 * These panels call jobs whose commonest honest answer is "nothing to do", and
 * a button that reports nothing is indistinguishable from a broken one. Every
 * press adds a line rather than replacing the last, so a run of presses reads
 * as a sequence.
 */
export function useRunLog(limit = 12) {
  const [entries, setEntries] = useState<RunEntry[]>([]);

  const record = useCallback((label: string, line: string, failed = false) => {
    setEntries((current) => [
      { id: crypto.randomUUID(), at: new Date().toLocaleTimeString(), label, line, failed },
      ...current,
    ].slice(0, limit));
  }, [limit]);

  return { entries, record };
}

export function RunLog({ entries, emptyHint }: { entries: RunEntry[]; emptyHint: string }) {
  return (
    <section aria-label="Run log" className="border">
      <h3 className="border-b bg-muted px-4 py-2 text-xs font-bold tracking-[0.08em] uppercase">
        This session
      </h3>
      {entries.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">{emptyHint}</p>
      ) : (
        <ul className="divide-y" role="status">
          {entries.map((entry) => (
            <li key={entry.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[auto_auto_1fr] sm:items-baseline sm:gap-3">
              <time className="text-xs text-muted-foreground">{entry.at}</time>
              <strong className="text-sm">{entry.label}</strong>
              <span className={entry.failed ? "flex items-start gap-2 text-sm text-destructive" : "text-sm text-muted-foreground"}>
                {entry.failed ? <TriangleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /> : null}
                {entry.line}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
