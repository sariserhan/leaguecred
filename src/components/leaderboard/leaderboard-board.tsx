"use client";

import { useState } from "react";
import Link from "next/link";
import { TrophyIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LeaderboardData, LeaderboardRow } from "@/data/leaderboard";

function Table({ rows, showLeague }: { rows: LeaderboardRow[]; showLeague: boolean }) {
  return (
    <div className="overflow-x-auto border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b bg-muted text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Rank</th>
            <th scope="col" className="px-4 py-3">Specialist</th>
            {showLeague ? <th scope="col" className="px-4 py-3">Strongest league</th> : null}
            <th scope="col" className="px-4 py-3 text-right">Record</th>
            <th scope="col" className="px-4 py-3 text-right">Evidence</th>
            <th scope="col" className="px-4 py-3 text-right">Confidence-adjusted</th>
            <th scope="col" className="px-4 py-3 text-right">Streak</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={row.userId}>
              <td className="px-4 py-4 font-heading text-xl text-muted-foreground">{index + 1}</td>
              <td className="px-4 py-4 font-semibold">
                <Link href={`/specialists/${row.handle ?? row.userId}`} className="hover:text-primary hover:underline">
                  {row.name}
                </Link>
                {row.handle ? <span className="ml-2 text-xs text-muted-foreground">@{row.handle}</span> : null}
              </td>
              {showLeague ? (
                <td className="px-4 py-4 text-muted-foreground">
                  {row.strongestLeague ? (
                    <Link href={`/leagues/${row.strongestLeague.slug}`} className="hover:text-primary">{row.strongestLeague.name}</Link>
                  ) : "—"}
                </td>
              ) : null}
              <td className="px-4 py-4 text-right tabular-nums">{row.wins}–{row.losses}</td>
              <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">{row.settledPicks} locks</td>
              <td className="px-4 py-4 text-right tabular-nums">{(row.adjustedAccuracy * 100).toFixed(1)}%</td>
              <td className="px-4 py-4 text-right tabular-nums text-muted-foreground">{row.currentWinStreak}W</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ rankThreshold, scope }: { rankThreshold: number; scope: string }) {
  return (
    <div className="border bg-muted p-8 text-center">
      <TrophyIcon aria-hidden="true" className="mx-auto size-8 text-primary" />
      <h3 className="mt-4 font-heading text-3xl font-bold uppercase">No public rank yet</h3>
      <p className="mx-auto mt-3 max-w-xl leading-7 text-muted-foreground">
        {scope} has nobody ranked. A public rank starts after {rankThreshold} settled independent
        Daily Locks — no shortcuts, and no record borrowed from someone else.
      </p>
    </div>
  );
}

/**
 * Every ranked record in one place: one table across all leagues, and one per
 * league beside it.
 *
 * A league page tells a member where they stand where they play. This answers
 * the other question - who is proven anywhere - which the product asks people
 * to care about and had nowhere to show.
 */
export function LeaderboardBoard({ data }: { data: LeaderboardData }) {
  const [scope, setScope] = useState<string>("global");
  const league = data.leagues.find((entry) => entry.league.slug === scope);

  return (
    <div className="grid gap-6">
      <ToggleGroup
        value={[scope]}
        onValueChange={(values) => { const next = values[0]; if (next) setScope(next); }}
        variant="outline"
        spacing={0}
        aria-label="Leaderboard scope"
        className="flex w-full flex-wrap"
      >
        <ToggleGroupItem value="global">Across every league</ToggleGroupItem>
        {data.leagues.map((entry) => (
          <ToggleGroupItem key={entry.league.slug} value={entry.league.slug}>{entry.league.name}</ToggleGroupItem>
        ))}
      </ToggleGroup>

      {scope === "global" ? (
        <section aria-label="Leaderboard across every league" className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-3xl font-bold uppercase">Across every league</h2>
            <Badge variant="outline">{data.global.length} ranked</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            A member&rsquo;s whole independent record, weighted by the evidence behind it. The league
            beside each name is the one they have proved most in.
          </p>
          {data.global.length > 0
            ? <Table rows={data.global} showLeague />
            : <Empty rankThreshold={data.rankThreshold} scope="No league" />}
        </section>
      ) : (
        <section aria-label={`${league?.league.name ?? "League"} leaderboard`} className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-3xl font-bold uppercase">{league?.league.name}</h2>
            <Badge variant="outline">{league?.rows.length ?? 0} ranked</Badge>
            {league ? (
              <Link href={`/leagues/${league.league.slug}#leaderboard`} className="text-sm font-semibold underline">
                Season and career split
              </Link>
            ) : null}
          </div>
          {league && league.rows.length > 0
            ? <Table rows={league.rows} showLeague={false} />
            : <Empty rankThreshold={data.rankThreshold} scope={league?.league.name ?? "This league"} />}
        </section>
      )}
    </div>
  );
}
