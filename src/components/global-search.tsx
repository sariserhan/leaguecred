"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { SearchIcon } from "lucide-react";

import type { GlobalSearchResult } from "@/app/api/search/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [resultsQuery, setResultsQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); }
      if (event.key === "/" && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) { event.preventDefault(); setOpen(true); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open || deferredQuery.trim().length < 2) return;
    const controller = new AbortController();
    void fetch(`/api/search?q=${encodeURIComponent(deferredQuery)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ results: GlobalSearchResult[] }> : Promise.reject(new Error("Search unavailable")))
      .then((data) => { setResults(data.results); setResultsQuery(deferredQuery); })
      .catch((error) => { if (!(error instanceof DOMException && error.name === "AbortError")) setResults([]); })
    return () => controller.abort();
  }, [deferredQuery, open]);

  const loading = deferredQuery.trim().length >= 2 && resultsQuery !== deferredQuery;

  return <><Button variant="ghost" size="icon" aria-label="Search LeagueCred" onClick={() => setOpen(true)}><SearchIcon aria-hidden="true" /></Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="top-[12vh] max-h-[76dvh] max-w-xl translate-y-0 content-start overflow-hidden rounded-none p-0"><DialogHeader className="border-b p-5"><DialogTitle className="font-heading text-3xl font-bold uppercase">Search LeagueCred</DialogTitle><DialogDescription>Find leagues, clubs, specialists, or pages. Press Ctrl K anywhere to return.</DialogDescription><label className="relative mt-3 block"><SearchIcon aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Premier League, Galatasaray, Aylin…" className="h-12 rounded-none pl-10" /></label></DialogHeader><div className="max-h-[48dvh] overflow-y-auto" aria-live="polite">{loading ? <p className="p-6 text-sm text-muted-foreground">Searching…</p> : query.trim().length < 2 ? <p className="p-6 text-sm text-muted-foreground">Enter at least two characters.</p> : results.length ? <ul className="divide-y">{results.map((result) => <li key={`${result.type}:${result.id}`}><DialogClose render={<Link href={result.href} className="flex min-h-16 items-center gap-3 px-5 py-3 hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />}><span className="min-w-0 flex-1"><strong className="block truncate">{result.label}</strong><span className="block truncate text-xs text-muted-foreground">{result.detail}</span></span><Badge variant="outline">{result.type}</Badge></DialogClose></li>)}</ul> : <p className="p-6 text-sm text-muted-foreground">No matching leagues, clubs, or specialists.</p>}</div></DialogContent></Dialog></>;
}
