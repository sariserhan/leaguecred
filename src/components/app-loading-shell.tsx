import { Skeleton } from "@/components/ui/skeleton";

type AppLoadingShellProps = {
  variant?: "home" | "directory" | "form";
};

export function AppLoadingShell({ variant = "home" }: AppLoadingShellProps) {
  if (variant === "form") {
    return (
      <div className="w-full max-w-md space-y-5" aria-label="Loading sign in">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    );
  }

  if (variant === "directory") {
    return (
      <div className="space-y-8" aria-label="Loading leagues">
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-20 w-full max-w-3xl" />
          <Skeleton className="h-7 w-full max-w-xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10" aria-label="Loading LeagueCred">
      <section className="grid min-h-[32rem] items-end gap-8 border-b pb-12 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-28 w-full max-w-3xl" />
          <Skeleton className="h-7 w-full max-w-xl" />
          <Skeleton className="h-11 w-44" />
        </div>
        <Skeleton className="h-72 rounded-sm" />
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-44 rounded-sm" />
        ))}
      </div>
    </div>
  );
}
