import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth-session";
import { getSafeInternalPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your LeagueCred identity.",
  robots: { index: false, follow: false },
};

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const nextPath = getSafeInternalPath((await searchParams).next, "/leagues");
  const session = await getSession();
  if (session) redirect(nextPath);

  return (
    <section className="page-shell grid min-h-[calc(100vh-5rem)] items-center gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
      <div>
        <h1 className="font-heading text-[clamp(3.5rem,6vw,6.4rem)] leading-[0.88] font-extrabold tracking-[-0.03em] uppercase">
          Your first Weekly Lock is one step away.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
          Sign in to lock one team from the league you chose. Your pick stays hidden until the window closes, then becomes part of your permanent record.
        </p>
        <ol className="mt-8 grid grid-cols-3 border-y lg:block lg:max-w-lg lg:border-y-0">
          {[
            ["1", "Choose your league", "complete"],
            ["2", "Sign in or create an account", "active"],
            ["3", "Make one Weekly Lock", "next"],
          ].map(([number, label, state]) => (
            <li key={number} className="relative flex min-w-0 flex-col items-center gap-2 px-2 py-5 text-center lg:flex-row lg:gap-5 lg:px-0 lg:py-4 lg:text-left">
              <span className={state === "active" ? "flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground bg-primary font-bold" : "flex size-10 shrink-0 items-center justify-center rounded-full border border-foreground bg-background font-bold"}>{number}</span>
              <span className={state === "active" ? "text-xs font-bold text-primary lg:text-base" : "text-xs font-semibold lg:text-base"}>{label}</span>
            </li>
          ))}
        </ol>
      </div>
      <AuthForm nextPath={nextPath} />
    </section>
  );
}
