import { ActivityIcon, CircleAlertIcon, RefreshCwIcon, ScrollTextIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  OperationalSummary,
  SettlementCorrectionDiagnostic,
  SyncRunDiagnostic,
} from "@/services/admin-diagnostics";

const dateTimeFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
  timeZoneName: "short",
});

function formatMoment(value: string | null) {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}

function statusBadgeVariant(status: SyncRunDiagnostic["status"]) {
  if (status === "failed") return "destructive" as const;
  if (status === "running") return "outline" as const;
  return "secondary" as const;
}

export function OperationalSummaryPanel({ summary }: { summary: OperationalSummary }) {
  const tiles = [
    { label: "Pending picks", value: String(summary.pendingPicks) },
    { label: "Settled picks", value: String(summary.settledPicks) },
    { label: "Failed syncs (24h)", value: String(summary.failedSyncRuns) },
    { label: "Last successful sync", value: formatMoment(summary.lastSuccessfulSyncAt) },
  ];

  return (
    <dl className="grid gap-px overflow-hidden border bg-border sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-background px-5 py-4">
          <dt className="text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
            {tile.label}
          </dt>
          <dd className="mt-2 font-heading text-2xl font-bold">{tile.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SyncRunsPanel({ runs }: { runs: SyncRunDiagnostic[] }) {
  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
          <RefreshCwIcon aria-hidden="true" className="size-5" />
          Fixture sync runs
        </CardTitle>
        <CardDescription>
          The most recent provider synchronizations, newest first. A failed run is the usual reason
          a matchweek looks stale.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {runs.length === 0 ? (
          <p className="border-t px-6 py-8 text-sm text-muted-foreground">
            No synchronization has been recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-6 py-3">Status</th>
                  <th scope="col" className="px-6 py-3">Provider</th>
                  <th scope="col" className="px-6 py-3">Kind</th>
                  <th scope="col" className="px-6 py-3">Started</th>
                  <th scope="col" className="px-6 py-3 text-right">Requests</th>
                  <th scope="col" className="px-6 py-3 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {runs.map((run) => (
                  <tr key={run.id} className="align-top">
                    <td className="px-6 py-4">
                      <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
                      {run.error ? (
                        <p className="mt-2 flex max-w-sm items-start gap-2 text-xs leading-5 text-destructive">
                          <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                          <span className="break-words">{run.error}</span>
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 font-semibold">{run.provider}</td>
                    <td className="px-6 py-4 text-muted-foreground">{run.kind}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatMoment(run.startedAt)}</td>
                    <td className="px-6 py-4 text-right tabular-nums">{run.requestCount}</td>
                    <td className="px-6 py-4 text-right tabular-nums text-muted-foreground">
                      {run.durationSeconds === null ? "—" : `${run.durationSeconds}s`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SettlementCorrectionsPanel({
  corrections,
}: {
  corrections: SettlementCorrectionDiagnostic[];
}) {
  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-heading text-2xl font-bold uppercase">
          <ScrollTextIcon aria-hidden="true" className="size-5" />
          Settlement corrections
        </CardTitle>
        <CardDescription>
          Every reversal and correction written to the append-only ledger. These entries can never
          be edited or removed.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {corrections.length === 0 ? (
          <p className="border-t px-6 py-8 text-sm text-muted-foreground">
            No settlement has been corrected yet.
          </p>
        ) : (
          <ul className="divide-y border-t">
            {corrections.map((correction) => (
              <li key={correction.id} className="px-6 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={correction.eventType === "reversal" ? "outline" : "secondary"}>
                    {correction.eventType}
                  </Badge>
                  <Badge variant="outline">{correction.result}</Badge>
                  <span className="text-sm font-semibold">{correction.leagueName}</span>
                  <span className="text-sm text-muted-foreground">{correction.userName}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatMoment(correction.createdAt)}
                  </span>
                </div>
                {correction.reason ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{correction.reason}</p>
                ) : null}
                <code className="mt-2 block text-xs text-muted-foreground">
                  pick {correction.pickId}
                </code>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DiagnosticsHeading() {
  return (
    <div className="flex items-center gap-2">
      <ActivityIcon aria-hidden="true" className="size-5" />
      <h2 className="font-heading text-3xl font-bold uppercase">Diagnostics</h2>
    </div>
  );
}
