"use client";

import { useEffect, useState } from "react";

type Mode = "datetime" | "time";

/**
 * A timestamp in the reader's own clock.
 *
 * The server has no idea what timezone anybody is in, so this renders whatever
 * the server could work out — UTC, normally — and swaps it for the local
 * reading once the component mounts. That order matters: the previous version
 * showed the words "Local time" until it mounted, which meant a fixtures board
 * full of placeholders on first paint and nothing at all without JavaScript.
 * A kickoff in UTC is merely inconvenient; a kickoff that says "Local time" is
 * no information at all.
 *
 * `suppressHydrationWarning` because the two readings are meant to differ.
 */
export function LocalTime({
  value,
  relative = false,
  mode = "datetime",
  fallback,
}: {
  value: string;
  /** "Today, 7:00 PM" for something within a day. */
  relative?: boolean;
  /** `time` for a kickoff beside a fixture; `datetime` when the day matters too. */
  mode?: Mode;
  /** What the server renders. Usually the same instant formatted in UTC. */
  fallback?: string;
}) {
  const [label, setLabel] = useState(fallback ?? "");

  useEffect(() => {
    const timer = window.setTimeout(() => setLabel(format(value, relative, mode)), 0);
    return () => window.clearTimeout(timer);
  }, [mode, relative, value]);

  return <time dateTime={value} suppressHydrationWarning>{label || "Local time"}</time>;
}

function format(value: string, relative: boolean, mode: Mode) {
  const date = new Date(value);

  if (relative) {
    const days = Math.round((date.getTime() - Date.now()) / 86_400_000);
    if (days >= 0 && days <= 1) {
      const clock = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
      return `${days === 0 ? "Today" : "Tomorrow"}, ${clock}`;
    }
  }

  if (mode === "time") {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    }).format(date);
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(date);
}
