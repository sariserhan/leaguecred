import { AppLoadingShell } from "@/components/app-loading-shell";

export default function LeaguesLoading() {
  return (
    <div className="page-shell py-14 sm:py-20">
      <AppLoadingShell variant="directory" />
    </div>
  );
}
