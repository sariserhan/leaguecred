import { AppLoadingShell } from "@/components/app-loading-shell";

export default function AuthLoading() {
  return (
    <section className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-12">
      <AppLoadingShell variant="form" />
    </section>
  );
}
