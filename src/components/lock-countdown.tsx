"use client";

import { useEffect, useState } from "react";
import { LockKeyholeIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function remaining(target: string) {
  const seconds = Math.max(0, Math.floor((Date.parse(target) - Date.now()) / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return { seconds, label: days > 0 ? `${days}d ${hours}h ${minutes}m` : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` };
}

export function LockCountdown({ lockAt, compact = false }: { lockAt: string; compact?: boolean }) {
  const [time, setTime] = useState(() => remaining(lockAt));
  useEffect(() => {
    const timer = window.setInterval(() => setTime(remaining(lockAt)), 1000);
    return () => window.clearInterval(timer);
  }, [lockAt]);
  return <div className={cn("inline-flex items-center gap-2 border border-primary px-3 py-2", compact ? "text-sm" : "min-w-40 justify-center")}><LockKeyholeIcon className="size-4 text-primary" /><span><span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{time.seconds > 0 ? "Locks in" : "Locked"}</span><strong className={cn("font-heading text-primary tabular-nums", compact ? "text-xl" : "text-3xl")}>{time.label}</strong></span></div>;
}
