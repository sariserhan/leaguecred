import { Skeleton } from "@/components/ui/skeleton";

export default function StandingsLoading() {
  return <div className="page-shell py-10 sm:py-14" aria-label="Loading standings"><Skeleton className="mb-8 h-16 w-2/3 rounded-sm" /><Skeleton className="h-[520px] rounded-sm" /></div>;
}
