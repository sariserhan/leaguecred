"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyholeIcon } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");

    if (password !== confirmation) {
      setError("Those passwords do not match.");
      return;
    }
    if (!token) {
      setError("This reset link is no longer valid.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const response = await authClient.resetPassword({ newPassword: password, token });

      if (response.error) {
        setError(
          response.error.message ??
            "This reset link has expired or was already used. Request a new one.",
        );
        return;
      }

      router.push("/auth");
      router.refresh();
    });
  }

  if (!token) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading text-4xl font-bold uppercase">Link expired</CardTitle>
          <CardDescription>
            A reset link works once and lasts one hour. Request a fresh one and it will arrive in a
            moment.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link
            href="/auth/forgot-password"
            className={buttonVariants({ size: "lg" })}
          >
            Request a new link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-heading text-4xl font-bold uppercase">Choose a new password</CardTitle>
        <CardDescription>Use at least 10 characters.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">New password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                aria-invalid={Boolean(error)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="confirmation">Confirm new password</FieldLabel>
              <Input
                id="confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                minLength={10}
                required
                aria-invalid={Boolean(error)}
              />
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
              Save new password
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
