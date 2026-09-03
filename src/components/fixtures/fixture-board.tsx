"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckIcon, LockKeyholeIcon, TriangleAlertIcon } from "lucide-react";

import { submitDailyLocks } from "@/app/leagues/actions";
import type { BoardFixture, FixtureBoard } from "@/data/fixtures";
import { FixtureVotePoll } from "@/components/fixture-vote-poll";
import { LocalTime } from "@/components/local-time";
import { GameDiscussion } from "@/components/leagues/game-discussion";
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
import { AddToSlipButton } from "@/components/slip/add-to-slip-button";
import {
  NO_FILTER,
  countFixtures,
  emptyFixtureFilters,
  filterFixtureDays,
  fixtureFilterOptions,
  type FixtureFilters,
} from "@/lib/fixture-filters";
import { useDockClearance } from "@/components/slip/dock-clearance";
import { BackToTop } from "@/components/ui/back-to-top";
import { Button } from "@/components/ui/button";
import { Crest } from "@/components/ui/crest";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type Choice = {
  fixtureId: string;
  teamId: string;
  teamName: string;
  leagueName: string;
  matchDate: string;
};

// The day a fixture belongs to, not a moment in time. A Daily Lock is one per
// league per day and that day is decided in UTC on the server, so this heading
// has to stay in UTC or a late kickoff would appear under a day whose lock it
// does not belong to. Only the clock beside each match is localised.
const dayHeading = new Intl.DateTimeFormat("en", {
  weekday: "long", day: "numeric", month: "long", timeZone: "UTC",
});
const kickoffTime = new Intl.DateTimeFormat("en", {
  hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
});

/**
 * Every league's fixtures on one board, by day.
 *
 * A call is one per league per day, so the key here is league and date together:
 * a Saturday can hold a Serie A call beside a Premier League one, and choosing
 * again inside a league on a day replaces that day's team rather than adding to
 * it. Whatever is chosen goes in as a single set.
 */
export function FixtureBoard({ board, authenticated }: { board: FixtureBoard; authenticated: boolean }) {
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [locked, setLocked] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // A lock cannot be taken back, so it is never one press away here either.
  const [confirming, setConfirming] = useState(false);
  const [filters, setFilters] = useState<FixtureFilters>(emptyFixtureFilters);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const chosen = Object.values(choices).sort((left, right) => left.matchDate.localeCompare(right.matchDate));
  const slotOf = (fixture: BoardFixture) => `${fixture.leagueId}:${fixture.matchDate}`;
  const lockedTeamFor = (fixture: BoardFixture) => locked[slotOf(fixture)] ?? fixture.lockedTeam;

  function choose(fixture: BoardFixture, teamId: string, teamName: string) {
    if (!authenticated) {
      router.push(`/auth?next=${encodeURIComponent("/fixtures")}`);
      return;
    }
    setError("");
    setChoices((current) => {
      const slot = slotOf(fixture);
      if (current[slot]?.teamId === teamId) {
        return Object.fromEntries(Object.entries(current).filter(([key]) => key !== slot));
      }
      return {
        ...current,
        [slot]: {
          fixtureId: fixture.id, teamId, teamName,
          leagueName: fixture.leagueName, matchDate: fixture.matchDate,
        },
      };
    });
  }

  useDockClearance(chosen.length > 0);

  const options = useMemo(() => fixtureFilterOptions(board.days), [board.days]);
  // A choice already made is kept when the board narrows: a call chosen on
  // Friday should not be lost by looking at Saturday.
  const visibleDays = useMemo(() => filterFixtureDays(board.days, filters), [board.days, filters]);
  const shown = countFixtures(visibleDays);
  const total = countFixtures(board.days);

  function submit() {
    if (chosen.length === 0) return;
    setConfirming(false);
    setError("");
    startTransition(async () => {
      const result = await submitDailyLocks(
        chosen.map((choice) => ({ fixtureId: choice.fixtureId, selectedTeamId: choice.teamId })),
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLocked((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(choices).map(([slot, choice]) => [slot, choice.teamName])),
      }));
      setChoices({});
      setSuccess(`${chosen.length} call${chosen.length === 1 ? "" : "s"} locked. Each stays hidden until its own match starts.`);
      router.refresh();
    });
  }

  if (board.days.length === 0) {
    return (
      <section className="border p-10 text-center">
        <h2 className="font-heading text-3xl font-bold uppercase">No matches in the next fortnight</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Fixtures appear here as soon as the next round is published.
        </p>
      </section>
    );
  }

  return (
    <>
      {error ? <p className="mb-5 border border-destructive px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {success ? (
        <p className="mb-5 flex items-center gap-2 border px-4 py-3 text-sm font-semibold">
          <CheckIcon className="size-4 text-primary" />{success}
        </p>
      ) : null}

      <div className="mb-6 flex flex-wrap items-end gap-3 border p-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">League</span>
          <select
            className="h-10 min-w-44 border bg-background px-3 text-sm"
            value={filters.league}
            onChange={(event) => setFilters((current) => ({ ...current, league: event.target.value }))}
          >
            <option value={NO_FILTER}>Every league</option>
            {options.leagues.map((league) => <option key={league.slug} value={league.slug}>{league.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">Day</span>
          <select
            className="h-10 min-w-44 border bg-background px-3 text-sm"
            value={filters.date}
            onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))}
          >
            <option value={NO_FILTER}>Every day</option>
            {options.days.map((day) => (
              <option key={day} value={day}>{dayHeading.format(new Date(`${day}T12:00:00Z`))}</option>
            ))}
          </select>
        </label>
        {filters === emptyFixtureFilters ? null : (
          <Button variant="ghost" onClick={() => setFilters(emptyFixtureFilters)}>Clear</Button>
        )}
        <p className="ml-auto text-sm text-muted-foreground">
          {shown} of {total} match{total === 1 ? "" : "es"}
        </p>
      </div>

      {visibleDays.length === 0 ? (
        <p className="border p-8 text-center text-sm text-muted-foreground">
          No match in the next fortnight matches those filters.
        </p>
      ) : null}

      <div className="flex flex-col gap-8 pb-28">
        {visibleDays.map((day) => (
          <section key={day.date} aria-labelledby={`day-${day.date}`}>
            {/* Pinned while its own day is on screen, then pushed off by the
                next one, so a long scroll always says which day you are in.
                The page's own header is not sticky, so top-0 is free. */}
            <h2
              id={`day-${day.date}`}
              className="sticky top-0 z-20 flex items-baseline justify-between gap-3 border-b bg-background py-3 font-heading text-2xl font-bold uppercase"
            >
              {dayHeading.format(new Date(`${day.date}T12:00:00Z`))}
              <span className="font-sans text-xs font-semibold tracking-[.1em] text-muted-foreground">
                {day.fixtures.length} match{day.fixtures.length === 1 ? "" : "es"}
              </span>
            </h2>
            <ul className="mt-4 grid gap-4">
              {day.fixtures.map((fixture) => {
                const held = lockedTeamFor(fixture);
                const choice = choices[slotOf(fixture)];
                // The whole week is closed to an independent call once a
                // specialist is being followed in it.
                const disabled = Boolean(held) || fixture.following;
                return (
                  <li key={fixture.id} className="border">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-4 py-2">
                      <Link href={`/leagues/${fixture.leagueSlug}`} className="text-xs font-bold tracking-[.1em] uppercase hover:text-primary">
                        {fixture.leagueName}
                      </Link>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground"><LocalTime value={fixture.kickoff} mode="time" fallback={kickoffTime.format(new Date(fixture.kickoff))} /></span>
                        {authenticated && !held ? (
                          <AddToSlipButton
                            fixtureId={fixture.id}
                            label={`${fixture.home} v ${fixture.away}`}
                            inSlip={fixture.inSlip}
                          />
                        ) : null}
                      </span>
                    </div>

                    <div className="grid items-center gap-2 p-4 sm:grid-cols-[1fr_auto_1fr]">
                      {([
                        { id: fixture.homeTeamId, name: fixture.home, logo: fixture.homeLogoUrl },
                        { id: fixture.awayTeamId, name: fixture.away, logo: fixture.awayLogoUrl },
                      ] as const).map((team, index) => (
                        <button
                          key={team.id}
                          type="button"
                          disabled={disabled || pending}
                          aria-pressed={choice?.teamId === team.id}
                          onClick={() => choose(fixture, team.id, team.name)}
                          className={cn(
                            "flex min-w-0 items-center gap-3 border px-3 py-3 text-left font-semibold transition-colors",
                            "disabled:cursor-not-allowed disabled:opacity-60",
                            index === 1 && "sm:order-3 sm:flex-row-reverse sm:text-right",
                            choice?.teamId === team.id
                              ? "border-primary bg-primary text-primary-foreground"
                              : "hover:bg-muted",
                          )}
                        >
                          <Crest src={team.logo} size={28} />
                          <span className="truncate">{team.name}</span>
                        </button>
                      ))}
                      <span className="hidden text-center text-xs font-bold text-muted-foreground sm:order-2 sm:block">v</span>
                    </div>

                    {held ? (
                      <p className="flex items-center gap-2 border-t px-4 py-2 text-sm font-semibold">
                        <CheckIcon aria-hidden="true" className="size-4 text-primary" />
                        {held} is your call for {fixture.leagueName} that day
                      </p>
                    ) : fixture.following ? (
                      <p className="border-t px-4 py-2 text-sm text-muted-foreground">
                        You are following a specialist in {fixture.leagueName} this week.
                      </p>
                    ) : null}

                    <div className="border-t px-4 py-3">
                      <FixtureVotePoll
                        fixtureId={fixture.id}
                        homeVotes={fixture.homeVotes}
                        awayVotes={fixture.awayVotes}
                        viewerVote={fixture.viewerVote}
                      />
                      <GameDiscussion fixtureId={fixture.id} initialComments={fixture.discussion} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Lifted clear of the submit tray when that is showing, so the two do
          not sit on top of each other. */}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-heading text-3xl font-bold uppercase">
              <TriangleAlertIcon aria-hidden="true" className="size-6 text-primary" />
              Lock {chosen.length} call{chosen.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {chosen.map((choice) => `${choice.teamName} on ${choice.matchDate}`).join(" · ")}. This is
              final: a lock cannot be changed, removed or undone, and it counts towards your public
              record whichever way the match goes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Lock {chosen.length === 1 ? "it" : "them"} for good</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BackToTop className={chosen.length > 0 ? "bottom-24" : undefined} />

      {chosen.length > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary bg-inverted p-3 text-inverted-foreground shadow-2xl">
          <div className="page-shell flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase text-primary">
                {chosen.length} call{chosen.length === 1 ? "" : "s"} ready
              </span>
              <strong className="block truncate">
                {chosen.map((choice) => `${choice.teamName} (${choice.leagueName})`).join(", ")}
              </strong>
            </div>
            <Button disabled={pending} onClick={() => setConfirming(true)}>
              {pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
              Lock {chosen.length}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
