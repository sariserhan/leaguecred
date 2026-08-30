"use client";
import { useEffect, useState } from "react";
export function LocalTime({ value, relative = false }: { value: string; relative?: boolean }) {
  const [label, setLabel] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => { const date = new Date(value); const delta = date.getTime() - Date.now(); const day = Math.round(delta / 86400000); setLabel(relative && day >= 0 && day <= 1 ? `${day === 0 ? "Today" : "Tomorrow"}, ${new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)}` : new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(date)); }, 0); return () => window.clearTimeout(timer); }, [relative, value]);
  return <time dateTime={value} suppressHydrationWarning>{label || "Local time"}</time>;
}
