"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LockKeyholeIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function chooseMode(values: string[]) {
    const nextMode = values[0] as AuthMode | undefined;
    if (!nextMode) return;
    setMode(nextMode);
    setError(null);
  }

  function submit(formData: FormData) {
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    setError(null);
    startTransition(async () => {
      const response =
        mode === "sign-up"
          ? await authClient.signUp.email({ email, password, name })
          : await authClient.signIn.email({ email, password });

      if (response.error) {
        setError(response.error.message ?? "Authentication failed. Please try again.");
        return;
      }

      router.push("/leagues/super-lig");
      router.refresh();
    });
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="font-heading text-4xl font-bold uppercase">
          Enter LeagueCred
        </CardTitle>
        <CardDescription>
          Your identity connects every immutable pick to one permanent league record.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit}>
          <FieldGroup>
            <ToggleGroup
              value={[mode]}
              onValueChange={chooseMode}
              aria-label="Choose authentication mode"
              className="grid grid-cols-2"
            >
              <ToggleGroupItem value="sign-in">Sign in</ToggleGroupItem>
              <ToggleGroupItem value="sign-up">Create account</ToggleGroupItem>
            </ToggleGroup>

            {mode === "sign-up" ? (
              <Field>
                <FieldLabel htmlFor="name">Display name</FieldLabel>
                <Input id="name" name="name" autoComplete="name" minLength={2} required />
              </Field>
            ) : null}

            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                minLength={10}
                required
                aria-invalid={Boolean(error)}
              />
              {mode === "sign-up" ? (
                <p className="text-sm text-muted-foreground">Use at least 10 characters.</p>
              ) : null}
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>

            <Button type="submit" size="lg" disabled={pending}>
              {pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
              {mode === "sign-up" ? "Create account" : "Sign in"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Alert>
          <LockKeyholeIcon />
          <AlertTitle>One identity, separate records</AlertTitle>
          <AlertDescription>
            Followed calls never count as proof of your independent expertise.
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}
