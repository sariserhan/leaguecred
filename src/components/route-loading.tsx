import { Skeleton } from "@/components/ui/skeleton";

export function ManagementRouteLoading() {
  return <div className="page-shell py-8 sm:py-12" aria-label="Loading page" role="status"><Skeleton className="h-48 w-full rounded-none" /><div className="mt-5 grid gap-5 lg:grid-cols-2"><Skeleton className="h-80 rounded-none" /><Skeleton className="h-80 rounded-none" /><Skeleton className="h-56 rounded-none lg:col-span-2" /></div><span className="sr-only">Loading…</span></div>;
}
