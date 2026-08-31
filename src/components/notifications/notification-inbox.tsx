"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { BellRingIcon, CheckCheckIcon, SearchIcon } from "lucide-react";
import { markAllNotificationsRead } from "@/app/notifications/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { AppNotification } from "@/data/notifications";

const filters = ["All", "Unread", "Results", "Specialists", "Deadlines"] as const;

export function NotificationInbox({ initialItems }: { initialItems: AppNotification[] }) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.toLowerCase());
  const filtered = items.filter((item) => {
    if (deferredQuery && !`${item.title} ${item.body}`.toLowerCase().includes(deferredQuery)) return false;
    if (filter === "Unread") return !item.readAt;
    if (filter === "Results") return item.kind.includes("result") || item.kind.includes("settled");
    if (filter === "Specialists") return item.kind.includes("specialist");
    if (filter === "Deadlines") return item.kind.includes("deadline") || item.kind.includes("reminder");
    return true;
  });

  async function readAll() {
    const result = await markAllNotificationsRead();
    if (!result.ok) return toast.add({ title: "Notifications not cleared", description: result.message, type: "error" });
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    toast.add({ title: "Inbox cleared", description: "Everything is marked as read.", type: "success" });
  }

  return <div className="page-shell py-10 sm:py-16"><header className="grid gap-6 border-b pb-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><h1 className="font-heading text-[clamp(3.5rem,7vw,6.5rem)] leading-[.88] font-extrabold uppercase">Notification inbox.</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">Every deadline, specialist call, and settled result in one searchable history.</p></div><Button variant="outline" onClick={readAll} disabled={!items.some((item) => !item.readAt)}><CheckCheckIcon data-icon="inline-start" />Mark all read</Button></header><section className="mt-7 grid gap-4 border-y py-5" aria-label="Inbox filters"><label className="relative"><span className="sr-only">Search notifications</span><SearchIcon aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search notification history" className="h-12 rounded-none pl-10" /></label><div className="flex gap-2 overflow-x-auto pb-1">{filters.map((option) => <Button key={option} size="sm" variant={filter === option ? "default" : "outline"} aria-pressed={filter === option} onClick={() => setFilter(option)}>{option}</Button>)}</div></section>{filtered.length ? <ol className="mt-7 divide-y border-y">{filtered.map((item) => <li key={item.id}><Link href={item.href} className="grid gap-3 px-4 py-5 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className={item.readAt ? "flex size-10 items-center justify-center border text-muted-foreground" : "flex size-10 items-center justify-center bg-primary text-primary-foreground"}><BellRingIcon aria-hidden="true" className="size-4" /></span><span><span className="flex flex-wrap items-center gap-2"><strong>{item.title}</strong>{!item.readAt ? <Badge>New</Badge> : null}</span><span className="mt-1 block text-sm text-muted-foreground">{item.body}</span></span><time className="text-xs text-muted-foreground" dateTime={item.createdAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time></Link></li>)}</ol> : <div className="mt-7 border p-10 text-center"><BellRingIcon className="mx-auto size-7 text-primary" /><h2 className="mt-3 font-heading text-3xl font-bold uppercase">Nothing matches</h2><p className="mt-2 text-sm text-muted-foreground">Try another filter or search phrase.</p></div>}</div>;
}
