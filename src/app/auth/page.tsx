import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/auth/auth-form";
import { getSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your LeagueCred identity.",
};

export default async function AuthPage() {
  const session = await getSession();
  if (session) redirect("/leagues/super-lig");

  return (
    <section className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-12">
      <AuthForm />
    </section>
  );
}
