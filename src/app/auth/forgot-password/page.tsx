import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getSession } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a link to choose a new LeagueCred password.",
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  const session = await getSession();
  if (session) redirect("/leagues/super-lig");

  return (
    <section className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-12">
      <ForgotPasswordForm />
    </section>
  );
}
