"use client";

import { useState } from "react";
import { ShieldCheckIcon, TrophyIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { LeagueLeaderboardEntry } from "@/data/leagues";

type Scope = "currentSeason" | "career";

export function LeagueLeaderboard({
  leagueName,
  entries,
}: {
  leagueName: string;
  entries: Record<Scope, LeagueLeaderboardEntry[]>;
}) {
  const [scope, setScope] = useState<Scope>("currentSeason");
  const leaderboard = entries[scope];

  return (
    <Card className="rounded-sm">
      <CardHeader>
        <CardTitle className="font-heading text-2xl font-bold uppercase">{leagueName} leaderboard</CardTitle>
        <CardDescription>Only proven independent Weekly Locks count. Followed calls never create a rank.</CardDescription>
      </CardHeader>
      <CardContent>
        <ToggleGroup value={[scope]} onValueChange={(values) => {
          const nextScope = values[0] as Scope | undefined;
          if (nextScope) setScope(nextScope);
        }} variant="outline" className="grid grid-cols-2" aria-label="Leaderboard time period">
          <ToggleGroupItem value="currentSeason">Current season</ToggleGroupItem>
          <ToggleGroupItem value="career">Career</ToggleGroupItem>
        </ToggleGroup>

        {leaderboard.length > 0 ? (
          <div className="mt-5 overflow-x-auto border-y">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b bg-muted text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                <tr><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Specialist</th><th className="px-3 py-3">Record</th><th className="px-3 py-3">Evidence</th><th className="px-3 py-3">Confidence</th><th className="px-3 py-3">Streak</th></tr>
              </thead>
              <tbody className="divide-y">
                {leaderboard.map((entry, index) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-4 font-heading text-lg font-bold">{index + 1}</td>
                    <td className="px-3 py-4 font-semibold">{entry.name}</td>
                    <td className="px-3 py-4">{entry.wins}–{entry.losses}</td>
                    <td className="px-3 py-4">{entry.settledPicks} locks</td>
                    <td className="px-3 py-4 font-semibold text-primary">{(entry.confidenceAdjustedAccuracy * 100).toFixed(1)}%</td>
                    <td className="px-3 py-4">{entry.currentWinStreak}W</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 border bg-muted p-6">
            <TrophyIcon aria-hidden="true" className="size-8 text-primary" />
            <h3 className="mt-4 font-heading text-3xl font-bold uppercase">Founding specialists</h3>
            <p className="mt-3 leading-7 text-muted-foreground">This league has no public rank yet. Public rank starts after 10 settled independent Weekly Locks—no shortcuts and no borrowed record.</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-semibold"><ShieldCheckIcon aria-hidden="true" className="size-4 text-primary" />Your first 10 locks build the evidence.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
