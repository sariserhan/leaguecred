"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { MailIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();

    startTransition(async () => {
      await authClient.requestPasswordReset({
        email,
        redirectTo: "/auth/reset-password",
      });
      // Always report the same outcome. Branching on the result would turn this
      // form into a way to test whether an address has an account.
      setSent(true);
    });
  }

  if (sent) {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="font-heading text-4xl font-bold uppercase">Check your inbox</CardTitle>
          <CardDescription>
            If that address has a LeagueCred account, a reset link is on its way. The link expires in
            one hour and can only be used once.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Link href="/auth" className={buttonVariants({ variant: "outline", size: "lg" })}>
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-heading text-4xl font-bold uppercase">Reset your password</CardTitle>
        <CardDescription>
          Enter the address on your account and we will send a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <MailIcon data-icon="inline-start" />}
              Send reset link
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Alert>
          <MailIcon />
          <AlertTitle>Your record is untouched</AlertTitle>
          <AlertDescription>
            Resetting a password never changes a settled Weekly Lock or a league record.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}
