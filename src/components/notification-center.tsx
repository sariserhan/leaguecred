"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BellIcon, CheckCheckIcon, RefreshCwIcon, SettingsIcon, XIcon } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead, saveNotificationPreferences } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { AppNotification, NotificationPreferences } from "@/data/notifications";

/**
 * A visible tab already costs a query every 30 seconds whether or not anything
 * has happened, and most of the day nothing has. Each poll that finds nothing
 * doubles the wait, up to five minutes; anything new, or the member coming back
 * to the tab, drops it straight back to 30 seconds. An idle tab left open all
 * afternoon settles at a twelfth of the queries it used to make, and a tab
 * being watched during a matchweek is unchanged.
 */
const POLL_INTERVAL_MS = 30_000;
const MAX_POLL_INTERVAL_MS = 300_000;
const MAX_BACKOFF_STEPS = 4;
const preferenceOptions: Array<[keyof NotificationPreferences, string]> = [["lockDeadlines", "Lock deadlines"], ["specialistLocks", "Specialist locks"], ["pickResults", "My results"], ["followedResults", "Followed results"]];

function notificationGroup(item: AppNotification) {
  const created = new Date(item.createdAt);
  const today = new Date();
  if (created.toDateString() === today.toDateString()) return "Today";
  if (item.kind.includes("result") || item.kind.includes("settled")) return "Results";
  if (item.kind.includes("specialist")) return "Specialist activity";
  return "Earlier";
}

export function NotificationCenter({ initialItems, initialPreferences }: { initialItems: AppNotification[]; initialPreferences: NotificationPreferences }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [pending, startTransition] = useTransition();
  const knownIds = useRef(new Set(initialItems.map((item) => item.id)));
  const pollErrorShown = useRef(false);
  const unread = items.filter((item) => !item.readAt).length;

  /** Returns how many notifications were new, which is what the poll interval
   *  below backs off on. */
  const refresh = useCallback(async (announce = false): Promise<number> => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      const result = await response.json() as { items?: AppNotification[]; message?: string };
      if (!response.ok || !result.items) throw new Error(result.message ?? "Try again shortly.");
      const freshItems = result.items.filter((item) => !knownIds.current.has(item.id));
      for (const item of freshItems.toReversed()) {
        knownIds.current.add(item.id);
        toast.add({ id: `notification-${item.id}`, title: item.title, description: item.body, type: "info", priority: "low", timeout: 8_000, actionProps: { children: "View", onClick: () => router.push(item.href) } });
      }
      setItems(result.items);
      pollErrorShown.current = false;
      if (announce) toast.add({ title: "Notifications refreshed", description: freshItems.length ? `${freshItems.length} new update${freshItems.length === 1 ? "" : "s"}.` : "You are up to date.", type: "success" });
      return freshItems.length;
    } catch (error) {
      if (announce || !pollErrorShown.current) toast.add({ title: "Notifications unavailable", description: error instanceof Error ? error.message : "Try again shortly.", type: "error" });
      pollErrorShown.current = true;
      // A failed poll backs off like a quiet one: a server that is down does
      // not get retried harder for being down.
      return 0;
    }
  }, [router]);

  useEffect(() => {
    let timer = 0;
    let stopped = false;
    let quietPolls = 0;

    const schedule = () => {
      if (stopped) return;
      timer = window.setTimeout(poll, Math.min(POLL_INTERVAL_MS * 2 ** quietPolls, MAX_POLL_INTERVAL_MS));
    };

    const poll = async () => {
      if (document.visibilityState === "visible") {
        const fresh = await refresh();
        quietPolls = fresh > 0 ? 0 : Math.min(quietPolls + 1, MAX_BACKOFF_STEPS);
      }
      schedule();
    };

    // Coming back to the tab is the moment to be current, so it polls now
    // rather than at whatever point the backoff had drifted to.
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      quietPolls = 0;
      window.clearTimeout(timer);
      void poll();
    };

    schedule();
    document.addEventListener("visibilitychange", wake);
    return () => { stopped = true; window.clearTimeout(timer); document.removeEventListener("visibilitychange", wake); };
  }, [refresh]);

  function read(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, readAt: new Date().toISOString() } : item));
    startTransition(async () => {
      try { const result = await markNotificationRead(id); if (!result.ok) throw new Error(result.message); }
      catch (error) { toast.add({ title: "Notification not updated", description: error instanceof Error ? error.message : "Try again.", type: "error" }); void refresh(); }
    });
  }

  function readAll() {
    const previous = items;
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    startTransition(async () => {
      try { const result = await markAllNotificationsRead(); if (!result.ok) throw new Error(result.message); toast.add({ title: "Notifications cleared", description: "Everything is marked as read.", type: "success" }); }
      catch (error) { setItems(previous); toast.add({ title: "Notifications not cleared", description: error instanceof Error ? error.message : "Try again.", type: "error" }); }
    });
  }

  function dismiss(item: AppNotification) {
    setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    startTransition(async () => {
      try {
        const result = await markNotificationRead(item.id);
        if (!result.ok) throw new Error(result.message);
      } catch (error) {
        setItems((current) => current.some((candidate) => candidate.id === item.id) ? current : [item, ...current].toSorted((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)));
        toast.add({ title: "Notification not dismissed", description: error instanceof Error ? error.message : "Try again.", type: "error" });
      }
    });
  }

  function toggle(key: keyof NotificationPreferences) {
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    startTransition(async () => {
      try { const result = await saveNotificationPreferences(next); if (!result.ok) throw new Error(result.message); toast.add({ title: "Notification preference saved", description: "Future alerts will follow this setting.", type: "success" }); }
      catch (error) { setPreferences(previous); toast.add({ title: "Preference not saved", description: error instanceof Error ? error.message : "Try again.", type: "error" }); }
    });
  }

  return <>
    <Button variant="ghost" size="icon" className="relative" aria-label={`${unread} unread notifications`} onClick={() => setOpen(true)}><BellIcon aria-hidden="true" />{unread ? <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{unread > 9 ? "9+" : unread}</span> : null}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto rounded-none p-0">
        <DialogHeader className="border-b p-5"><div className="flex items-center justify-between gap-3"><DialogTitle className="font-heading text-3xl font-bold uppercase">Notifications</DialogTitle><div className="flex items-center gap-1"><Button variant="ghost" size="icon-sm" onClick={() => void refresh(true)} disabled={pending} aria-label="Refresh notifications"><RefreshCwIcon aria-hidden="true" /></Button><Button variant="ghost" size="icon-sm" onClick={() => setSettings((current) => !current)} aria-label="Notification preferences"><SettingsIcon aria-hidden="true" /></Button></div></div><DialogDescription>Live updates for deadlines, specialist activity, and results.</DialogDescription></DialogHeader>
        {settings ? <div className="grid gap-1 p-4">{preferenceOptions.map(([key, label]) => <button key={key} type="button" aria-pressed={preferences[key]} onClick={() => toggle(key)} className="flex min-h-11 items-center justify-between border px-4 py-3 text-left font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><span>{label}</span><span className={preferences[key] ? "text-primary" : "text-muted-foreground"}>{preferences[key] ? "On" : "Off"}</span></button>)}</div> : items.length ? <div>{["Today", "Results", "Specialist activity", "Earlier"].map((group) => { const grouped = items.filter((item) => notificationGroup(item) === group); return grouped.length ? <section key={group} aria-labelledby={`notifications-${group.replaceAll(" ", "-").toLowerCase()}`}><h3 id={`notifications-${group.replaceAll(" ", "-").toLowerCase()}`} className="border-y bg-muted px-4 py-2 text-xs font-bold tracking-[0.1em] uppercase first:border-t-0">{group}</h3><ul className="divide-y">{grouped.map((item) => <li key={item.id} className={item.readAt ? "grid grid-cols-[1fr_auto] text-muted-foreground" : "grid grid-cols-[1fr_auto] border-l-4 border-primary"}><Link href={item.href} onClick={() => read(item.id)} className="min-w-0 p-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><strong className="block text-foreground">{item.title}</strong><span className="mt-1 block text-sm">{item.body}</span><time className="mt-2 block text-xs" dateTime={item.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></Link><Button variant="ghost" size="icon-sm" className="m-2" aria-label={`Dismiss ${item.title}`} onClick={() => dismiss(item)}><XIcon aria-hidden="true" /></Button></li>)}</ul></section> : null; })}</div> : <p className="p-8 text-center text-muted-foreground">You are all caught up.</p>}
        <div className="border-t p-4"><Button variant="outline" className="w-full" disabled={!unread || pending} onClick={readAll}><CheckCheckIcon data-icon="inline-start" />Mark all as read</Button></div>
      </DialogContent>
    </Dialog>
  </>;
}
