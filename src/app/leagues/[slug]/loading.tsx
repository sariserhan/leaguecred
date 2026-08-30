import { Skeleton } from "@/components/ui/skeleton";

export default function LeagueLoading() {
  return (
    <div className="page-shell flex flex-col gap-6 py-12" aria-label="Loading league">
      <Skeleton className="h-52 w-full rounded-sm" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-24 rounded-sm" />
        <Skeleton className="h-24 rounded-sm" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <Skeleton className="h-[460px] rounded-sm" />
        <Skeleton className="h-[460px] rounded-sm" />
      </div>
    </div>
  );
}
