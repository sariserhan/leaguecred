import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage(props: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await props.searchParams;

  // Better Auth redirects here with ?token= on success and ?error=INVALID_TOKEN
  // when the link is expired or already spent.
  return (
    <section className="page-shell grid min-h-[calc(100vh-5rem)] place-items-center py-12">
      <ResetPasswordForm token={error ? null : (token ?? null)} />
    </section>
  );
}
