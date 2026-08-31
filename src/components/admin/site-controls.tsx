"use client";

import { useState, useTransition } from "react";
import { CircleCheckIcon, MegaphoneIcon, TriangleAlertIcon, TrophyIcon, WrenchIcon } from "lucide-react";

import { saveSiteSettings } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/components/ui/toast";
import type { BannerTone } from "@/db/schema";
import {
  BANNER_MESSAGE_MAX_LENGTH,
  MAINTENANCE_MESSAGE_MAX_LENGTH,
  MAX_SETTLED_PICKS_FOR_RANK,
  MIN_SETTLED_PICKS_FOR_RANK,
  STANDARD_SETTLED_PICKS_FOR_RANK,
  type SiteSettings,
} from "@/lib/site-settings";

const textareaClassName =
  "w-full min-h-20 rounded-sm border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const bannerTones: Array<{ value: BannerTone; label: string }> = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

function BooleanToggle({
  value,
  onChange,
  label,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <ToggleGroup
      value={[value ? "on" : "off"]}
      onValueChange={(values) => {
        const next = values[0];
        if (next === "on" || next === "off") onChange(next === "on");
      }}
      variant="outline"
      aria-label={label}
      className="w-full grid-cols-2 sm:w-fit"
      disabled={disabled}
    >
      <ToggleGroupItem value="off">Off</ToggleGroupItem>
      <ToggleGroupItem value="on">On</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function SiteControls({ settings }: { settings: SiteSettings }) {
  const [rankThreshold, setRankThreshold] = useState(String(settings.minimumSettledPicksForRank));
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(settings.maintenanceEnabled);
  const [maintenanceMessage, setMaintenanceMessage] = useState(settings.maintenanceMessage ?? "");
  const [bannerEnabled, setBannerEnabled] = useState(settings.bannerEnabled);
  const [bannerMessage, setBannerMessage] = useState(settings.bannerMessage ?? "");
  const [bannerTone, setBannerTone] = useState<BannerTone>(settings.bannerTone);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setStatus(null);
    startTransition(async () => {
      const result = await saveSiteSettings({
        minimumSettledPicksForRank: rankThreshold,
        maintenanceEnabled,
        maintenanceMessage: maintenanceMessage || null,
        bannerEnabled,
        bannerMessage: bannerMessage || null,
        bannerTone,
      });

      setStatus(
        result.ok
          ? { ok: true, message: "Site settings saved and live." }
          : { ok: false, message: result.message },
      );
      toast.add({ title: result.ok ? "Site settings saved" : "Settings not saved", description: result.ok ? "The changes are live for visitors." : result.message, type: result.ok ? "success" : "error" });
    });
  }

  return (
    <div className="grid gap-7 lg:grid-cols-2">
      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
            <TrophyIcon aria-hidden="true" className="size-5 text-primary" />
            Rank threshold
          </CardTitle>
          <CardDescription>
            Settled independent Weekly Locks a record needs before it is ranked and can be
            followed. The standard is {STANDARD_SETTLED_PICKS_FOR_RANK}. A founding season has
            nobody who can reach that for {STANDARD_SETTLED_PICKS_FOR_RANK} gameweeks, so it can
            open lower and be raised once a cohort has cleared it. Lowering it does not rank
            anyone retroactively \u2014 it changes who qualifies from now on.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="rank-threshold">Settled locks required</Label>
          <input
            id="rank-threshold"
            type="number"
            inputMode="numeric"
            min={MIN_SETTLED_PICKS_FOR_RANK}
            max={MAX_SETTLED_PICKS_FOR_RANK}
            value={rankThreshold}
            onChange={(event) => setRankThreshold(event.target.value)}
            className="mt-2 h-10 w-28 rounded-sm border border-input bg-transparent px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </CardContent>
      </Card>

      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
            <WrenchIcon aria-hidden="true" className="size-5" />
            Maintenance page
          </CardTitle>
          <CardDescription>
            Sends every signed-out visitor and member to the maintenance page. Admins keep browsing
            the real site so this can be switched back off.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label htmlFor="maintenance-state">Maintenance mode</Label>
            <BooleanToggle
              value={maintenanceEnabled}
              onChange={setMaintenanceEnabled}
              label="Maintenance mode"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="maintenance-message">Message shown on the maintenance page</Label>
            <textarea
              id="maintenance-message"
              className={textareaClassName}
              maxLength={MAINTENANCE_MESSAGE_MAX_LENGTH}
              value={maintenanceMessage}
              disabled={pending}
              onChange={(event) => setMaintenanceMessage(event.target.value)}
              placeholder="We are applying a database upgrade and will be back shortly."
            />
            <p className="text-xs text-muted-foreground">
              {maintenanceMessage.length} / {MAINTENANCE_MESSAGE_MAX_LENGTH} characters. Leave empty
              to use the default wording.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
            <MegaphoneIcon aria-hidden="true" className="size-5" />
            Site banner
          </CardTitle>
          <CardDescription>
            Shows one announcement strip above the header on every page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <Label>Banner</Label>
            <BooleanToggle
              value={bannerEnabled}
              onChange={setBannerEnabled}
              label="Site banner"
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="banner-message">Banner message</Label>
            <textarea
              id="banner-message"
              className={textareaClassName}
              maxLength={BANNER_MESSAGE_MAX_LENGTH}
              value={bannerMessage}
              disabled={pending}
              onChange={(event) => setBannerMessage(event.target.value)}
              placeholder="Matchweek 6 locks on Saturday at 12:00 UTC."
            />
            <p className="text-xs text-muted-foreground">
              {bannerMessage.length} / {BANNER_MESSAGE_MAX_LENGTH} characters.
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Tone</Label>
            <ToggleGroup
              value={[bannerTone]}
              onValueChange={(values) => {
                const next = values[0] as BannerTone | undefined;
                if (next) setBannerTone(next);
              }}
              variant="outline"
              aria-label="Banner tone"
              disabled={pending}
            >
              {bannerTones.map((tone) => (
                <ToggleGroupItem key={tone.value} value={tone.value}>
                  {tone.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:col-span-2">
        <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
          <AlertDialogTrigger
            render={
              <Button size="lg" disabled={pending}>
                {pending ? <Spinner data-icon="inline-start" /> : <CircleCheckIcon data-icon="inline-start" />}
                Save site settings
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply these site-wide changes?</AlertDialogTitle>
              <AlertDialogDescription>
                Maintenance mode can prevent members from using the site, while banner changes are
                immediately visible to every visitor.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setConfirmationOpen(false);
                  save();
                }}
              >
                Apply changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {status ? (
          <p
            role="status"
            className={
              status.ok
                ? "flex items-center gap-2 text-sm font-semibold"
                : "flex items-center gap-2 text-sm font-semibold text-destructive"
            }
          >
            {status.ok ? null : <TriangleAlertIcon aria-hidden="true" className="size-4" />}
            {status.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
