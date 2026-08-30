"use client";

import { useState, useTransition } from "react";
import { FlagIcon, TriangleAlertIcon } from "lucide-react";

import { toggleFeatureFlag } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ResolvedFeatureFlag } from "@/lib/site-settings";

export function FeatureFlagControls({ flags }: { flags: ResolvedFeatureFlag[] }) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [, startTransition] = useTransition();

  function toggle(key: string, enabled: boolean) {
    setError(null);
    setPendingKey(key);
    startTransition(async () => {
      const result = await toggleFeatureFlag(key, enabled);
      if (!result.ok) setError({ key, message: result.message });
      setPendingKey(null);
    });
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
          <FlagIcon aria-hidden="true" className="size-5" />
          Feature flags
        </CardTitle>
        <CardDescription>
          Each flag turns a real surface on or off for everyone immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y border-t">
          {flags.map((flag) => (
            <li
              key={flag.key}
              className="grid gap-3 px-6 py-5 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{flag.label}</h3>
                  {flag.known ? null : <Badge variant="outline">Undefined</Badge>}
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{flag.description}</p>
                <code className="mt-1 block text-xs text-muted-foreground">{flag.key}</code>
                {error?.key === flag.key ? (
                  <p
                    role="alert"
                    className="mt-2 flex items-center gap-2 text-sm font-semibold text-destructive"
                  >
                    <TriangleAlertIcon aria-hidden="true" className="size-4" />
                    {error.message}
                  </p>
                ) : null}
              </div>
              <ToggleGroup
                value={[flag.enabled ? "on" : "off"]}
                onValueChange={(values) => {
                  const next = values[0];
                  if (next === "on" || next === "off") toggle(flag.key, next === "on");
                }}
                variant="outline"
                aria-label={flag.label}
                disabled={pendingKey !== null || !flag.known}
              >
                <ToggleGroupItem value="off">Off</ToggleGroupItem>
                <ToggleGroupItem value="on">On</ToggleGroupItem>
              </ToggleGroup>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
