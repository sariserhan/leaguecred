"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CopyCheckIcon, SearchIcon, TriangleAlertIcon } from "lucide-react";

import { mergeDuplicateClubs, scanDuplicateClubs } from "@/app/admin/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RunLog, useRunLog } from "@/components/admin/run-log";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { DedupeReport } from "@/services/team-dedupe-plan";

/**
 * The `pnpm teams:dedupe` report, on screen, with the merge it proposes
 * attached to a button.
 *
 * Catalog health above says how many duplicate names there are; this says which
 * clubs they are and what the evidence for each is, which is the part that
 * decides whether a pair is a fault at all. Two clubs are allowed to be called
 * Liverpool.
 */
export function DuplicateClubsPanel() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<DedupeReport | null>(null);
  const [confirming, setConfirming] = useState<DedupeReport["merges"][number] | null>(null);
  const { entries, record } = useRunLog();

  function scan() {
    startTransition(async () => {
      const result = await scanDuplicateClubs();
      if (!result.ok) {
        record("Scan", result.message, true);
        toast.add({ title: "Scan failed", description: result.message, type: "error" });
        return;
      }

      setReport(result.report);
      const { merges, suspects, leftAlone, namesDisagree } = result.report;
      record("Scan", `${merges.length} merge${merges.length === 1 ? "" : "s"} proposed · ${suspects.length} to check by hand · ${leftAlone.length} left alone · ${namesDisagree.length} where the names disagree`);
    });
  }

  function merge(group: DedupeReport["merges"][number]) {
    setConfirming(null);
    startTransition(async () => {
      const result = await mergeDuplicateClubs(group.canonical.id);
      if (!result.ok) {
        record(group.canonical.name, result.message, true);
        toast.add({ title: "Clubs not merged", description: result.message, type: "error" });
        return;
      }

      record(group.canonical.name, `merged ${result.merged} duplicate${result.merged === 1 ? "" : "s"} into ${result.canonical}`);
      toast.add({ title: "Clubs merged", description: `${result.merged} row(s) folded into ${result.canonical}.`, type: "success" });
      const rescan = await scanDuplicateClubs();
      if (rescan.ok) setReport(rescan.report);
      router.refresh();
    });
  }

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
          <CopyCheckIcon aria-hidden="true" className="size-5" />
          Duplicate clubs
        </CardTitle>
        <CardDescription>
          The same report as <code>pnpm teams:dedupe</code>. A merge moves every fixture, pick and
          alias onto the surviving club and deletes the other rows: it cannot be undone, so read the
          evidence before pressing it. Clubs in different confederations are never merged — two
          clubs really are called Liverpool.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 border-t pt-6">
        <div>
          <Button onClick={scan} disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : <SearchIcon data-icon="inline-start" />}
            Scan the catalogue
          </Button>
        </div>

        {report ? (
          <div className="grid gap-6">
            <section aria-labelledby="merge-heading">
              <h3 id="merge-heading" className="text-sm font-bold tracking-[0.08em] uppercase">
                Proposed merges
              </h3>
              {report.merges.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nothing the evidence says is one club twice.</p>
              ) : (
                <ul className="mt-3 divide-y border">
                  {report.merges.map((group) => (
                    <li key={group.canonical.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                      <div className="min-w-0">
                        <strong className="block">
                          Keep {group.canonical.name}{" "}
                          <span className="font-normal text-muted-foreground">
                            ({group.canonical.slug} · {group.canonical.provider} · {group.canonical.memberships} membership{group.canonical.memberships === 1 ? "" : "s"})
                          </span>
                        </strong>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Fold in {group.duplicates.map((team) => `${team.name} (${team.slug} · ${team.provider})`).join(", ")}
                        </p>
                        {group.blockedByFixtures > 0 ? (
                          <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                            <TriangleAlertIcon aria-hidden="true" className="size-4" />
                            {group.blockedByFixtures} fixture{group.blockedByFixtures === 1 ? "" : "s"} list both as opponents, so merging would make a club play itself.
                          </p>
                        ) : null}
                      </div>
                      <Button
                        variant="destructive"
                        disabled={pending || group.blockedByFixtures > 0}
                        onClick={() => setConfirming(group)}
                      >
                        Merge
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="suspect-heading">
              <h3 id="suspect-heading" className="text-sm font-bold tracking-[0.08em] uppercase">
                For a person to judge
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                One side has never played a match. That is either a leftover catalogue entry or a
                club not synced yet, and only you can tell which. Nothing here is merged
                automatically.
              </p>
              {report.suspects.length === 0 && report.namesDisagree.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Nothing to check.</p>
              ) : (
                <ul className="mt-3 divide-y border text-sm">
                  {report.suspects.map((pair) => (
                    <li key={`${pair.nameA}-${pair.nameB}`} className="flex flex-wrap items-center gap-2 p-4">
                      <Badge variant="outline">Suspect</Badge>
                      <span>{pair.nameA} · {pair.nameB}</span>
                    </li>
                  ))}
                  {report.namesDisagree.map((pair) => (
                    <li key={`${pair.nameA}-${pair.nameB}-names`} className="flex flex-wrap items-center gap-2 p-4">
                      <Badge variant="outline">Fixtures say one club</Badge>
                      <span>{pair.nameA} · {pair.nameB} — the names do not agree, so they were left alone.</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="left-alone-heading">
              <h3 id="left-alone-heading" className="text-sm font-bold tracking-[0.08em] uppercase">
                Same name, different clubs
              </h3>
              {report.leftAlone.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None.</p>
              ) : (
                <ul className="mt-3 divide-y border text-sm">
                  {report.leftAlone.map((group) => (
                    <li key={group.map((team) => team.id).join("-")} className="p-4">
                      <strong>{group[0]?.name}</strong>
                      <span className="text-muted-foreground">
                        {" — "}
                        {group.map((team) => `${team.slug} [${team.regions.join("/") || "no league"}]`).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-sm text-muted-foreground">
                These count towards Duplicate club names in Catalog health above, and are not faults.
              </p>
            </section>
          </div>
        ) : null}

        <RunLog entries={entries} emptyHint="Nothing scanned yet in this session." />
      </CardContent>

      <AlertDialog open={confirming !== null} onOpenChange={(open) => { if (!open) setConfirming(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-3xl font-bold uppercase">
              Merge into {confirming?.canonical.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirming?.duplicates.map((team) => team.name).join(", ")} will be deleted, and every
              fixture, pick and alias pointing at them moved onto {confirming?.canonical.name}. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep both</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (confirming) merge(confirming); }}
              className="bg-destructive text-destructive-foreground"
            >
              Merge them
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
