"use client";
import { CircleAlertIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function SettingsError({ reset }: { error: Error; reset: () => void }) { return <main className="page-shell py-16"><div className="flex min-h-96 flex-col items-center justify-center border text-center"><CircleAlertIcon className="size-10 text-destructive" /><h1 className="mt-5 font-heading text-4xl font-bold uppercase">Settings unavailable</h1><p className="mt-2 max-w-lg text-muted-foreground">Nothing was changed. Reload the page to try again.</p><Button className="mt-6" onClick={reset}><RotateCcwIcon data-icon="inline-start" />Try again</Button></div></main>; }
