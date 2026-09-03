"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
  UserRoundCheckIcon,
  UsersRoundIcon,
} from "lucide-react";

import {
  followSpecialistPick,
  revealSpecialistPicks,
  submitDailyLocks,
} from "@/app/leagues/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LeagueLeaderboard } from "@/components/leagues/league-leaderboard";
import { SectionNav } from "@/components/leagues/section-nav";
import { FixtureVotePoll } from "@/components/fixture-vote-poll";
import { GameDiscussion } from "@/components/leagues/game-discussion";
import { AddToSlipButton } from "@/components/slip/add-to-slip-button";
import { useDockClearance } from "@/components/slip/dock-clearance";
import { LockCountdown } from "@/components/lock-countdown";
import { LocalTime } from "@/components/local-time";
import type { LeagueExperienceData, PastMatchweek } from "@/data/leagues";
import { cn } from "@/lib/utils";
import { Crest } from "@/components/ui/crest";

type ParticipationMode = "prove" | "follow";
type Selection = { fixtureId: string; teamId: string; teamName: string; matchDate: string };

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

function TeamMark({ code, logoUrl }: { code: string; logoUrl: string | null }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center font-heading text-sm font-bold">
      {logoUrl ? (
        <Crest src={logoUrl} size={40} />
      ) : code}
    </span>
  );
}

function PastMatchweekHistory({ leagueSlug, matchweeks }: { leagueSlug: string; matchweeks: PastMatchweek[] }) {
  if (matchweeks.length === 0) return null;

  return (
    <section className="mt-7 border" aria-labelledby="history-heading">
      <div className="border-b px-4 py-4 sm:px-5">
        <h2 id="history-heading" className="font-heading text-2xl font-bold uppercase">
          Results so far
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every match already played, newest week first. A week still open shows the matches that
          have finished; it is read-only here and a Daily Lock is still made above.
        </p>
      </div>
      <div className="divide-y">
        {matchweeks.map((matchweek, index) => (
          <details key={matchweek.id} open={index === 0} className="group">
            <summary className="flex cursor-pointer list-none flex-col items-start justify-between gap-2 px-4 py-4 font-semibold marker:content-none hover:bg-muted sm:flex-row sm:items-center sm:gap-3 sm:px-5">
              <span>{matchweek.displayName}</span>
              <span className="flex w-full items-center justify-between gap-3 text-sm text-muted-foreground sm:w-auto sm:justify-start">
                <Link href={`/leagues/${leagueSlug}/weeks/${matchweek.slug}`} className="relative z-10 font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline">
                  Week details
                </Link>
                <span className="group-open:hidden">Show results</span>
                <span className="hidden group-open:inline">Hide results</span>
              </span>
            </summary>
            <div className="divide-y border-t">
              {matchweek.fixtures.map((fixture) => {
                const homeWon = fixture.homeScore !== null && fixture.awayScore !== null && fixture.homeScore > fixture.awayScore;
                const awayWon = fixture.homeScore !== null && fixture.awayScore !== null && fixture.awayScore > fixture.homeScore;
                const score = fixture.homeScore === null || fixture.awayScore === null
                  ? fixture.status === "cancelled" || fixture.status === "abandoned" ? "Void" : "—"
                  : `${fixture.homeScore}–${fixture.awayScore}`;
                return (
                  <div key={fixture.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3 py-4 sm:px-4 sm:py-3">
                    <span className={cn("flex min-w-0 flex-col items-center gap-2 text-center font-semibold sm:flex-row sm:text-left", homeWon && "text-primary")}>
                      <TeamMark code={fixture.homeCode} logoUrl={fixture.homeLogoUrl} />
                      <span className="min-w-0 break-words">{fixture.home}</span>
                    </span>
                    <strong className="text-center font-heading text-2xl">{score}</strong>
                    <span className={cn("flex min-w-0 flex-col-reverse items-center gap-2 text-center font-semibold sm:flex-row sm:justify-end sm:text-right", awayWon && "text-primary")}>
                      <span className="min-w-0 break-words">{fixture.away}</span>
                      <TeamMark code={fixture.awayCode} logoUrl={fixture.awayLogoUrl} />
                    </span>
                  </div>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

/**
 * The discipline the product is built on, said where it applies rather than
 * only in the pitch: a record is judged on how right the calls are, so an
 * unsure call is worse than no call, and a skipped day costs nothing.
 *
 * The draw sentence is football's alone. A drawn match has no winner, so a pick
 * on one settles as a loss — while basketball, baseball, hockey and the NFL
 * produce a winner every time, and telling those leagues to avoid draws would
 * be advice about something that cannot happen.
 */
function SelectivityNote({ sport }: { sport: string }) {
  return (
    <p className="mt-3 text-center text-xs leading-5 text-muted-foreground">
      Only call what you are nearly certain of. A day you leave alone costs you nothing — this
      record is judged on how right you are, not how often you play.
      {sport === "football" ? " A draw settles as a loss, so a match you expect to end level is one to skip." : ""}
    </p>
  );
}

export function LeagueExperience({
  data,
  leaderboardEnabled,
  challengeEnabled,
}: {
  data: LeagueExperienceData;
  leaderboardEnabled: boolean;
  challengeEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ParticipationMode>(data.viewer.mode === "follow" ? "follow" : "prove");
  // One choice per day, all submitted together: picking a second team on a day
  // already chosen replaces that day's choice rather than adding to it.
  const [selections, setSelections] = useState<Record<string, Selection>>({});
  // Keyed by match date, because a lock is one per league per day: a Friday
  // call and a Saturday call are both allowed, and holding one used to close
  // the whole week here.
  const [lockedByDate, setLockedByDate] = useState(data.viewer.lockedByDate);
  const [picksRevealed, setPicksRevealed] = useState(data.viewer.picksRevealed);
  const [followedSourcePickId, setFollowedSourcePickId] = useState(data.viewer.followedSourcePickId);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [growthPromptOpen, setGrowthPromptOpen] = useState(false);
  const [decisionReason, setDecisionReason] = useState("");
  const [followConfirmOpen, setFollowConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const decisions = data.viewer.wins + data.viewer.losses;
  const accuracy = decisions === 0 ? null : (data.viewer.wins / decisions) * 100;
  // A lock closes when its own match starts, not when the week's first one does.
  // The week's lock_at is its earliest kickoff, so testing against that closed
  // every call in the week the moment any match in it began — which is every
  // week, once it is under way, and is why nothing anywhere could be selected.
  const openFixtures = data.fixtures.filter((fixture) => fixture.open);
  const lockedDays = Object.entries(lockedByDate);
  const chosen = Object.values(selections).sort((left, right) => left.matchDate.localeCompare(right.matchDate));

  // A day holds one call, so choosing again on the same day replaces it, and
  // choosing the team already chosen there clears it.
  function chooseTeam(choice: Selection) {
    setSelections((current) => {
      if (current[choice.matchDate]?.teamId === choice.teamId) {
        return Object.fromEntries(Object.entries(current).filter(([date]) => date !== choice.matchDate));
      }
      return { ...current, [choice.matchDate]: choice };
    });
  }
  // Days with a match still to come and no call on them yet.
  const daysLeft = new Set(openFixtures.filter((f) => !lockedByDate[f.matchDate]).map((f) => f.matchDate)).size;
  const nextDeadline = openFixtures[0]?.kickoffAt ?? null;
  const lockAt = nextDeadline
    ? new Intl.DateTimeFormat("en", {
        weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short",
      }).format(new Date(nextDeadline))
    : null;
  // Only a week that is over, or one with nothing left to call, is closed.
  const interactionLocked = data.matchweek.status !== "upcoming" || openFixtures.length === 0;
  // This page pins its own bar to the bottom, so the docks rise above it.
  useDockClearance(daysLeft > 0 && !interactionLocked);
  const fixturesByDate = new Map<string, typeof data.fixtures>();
  for (const fixture of data.fixtures) {
    const fixtures = fixturesByDate.get(fixture.kickoffDate);
    if (fixtures) fixtures.push(fixture);
    else fixturesByDate.set(fixture.kickoffDate, [fixture]);
  }

  function requireAuthentication() {
    if (data.viewer.authenticated) return true;
    const destination = `/leagues/${data.league.slug}`;
    router.push(`/auth?next=${encodeURIComponent(destination)}`);
    return false;
  }

  function chooseMode(values: string[]) {
    const nextMode = values[0] as ParticipationMode | undefined;
    if (!nextMode || Object.keys(lockedByDate).length > 0 || data.viewer.mode) return;
    setError(null);
    if (nextMode === "follow") {
      if (!requireAuthentication()) return;
      setFollowConfirmOpen(true);
      return;
    }
    setMode("prove");
  }

  function confirmFollowMode() {
    startTransition(async () => {
      const result = await revealSpecialistPicks(data.matchweek.id);
      if (!result.ok) {
        setError(result.message);
        setFollowConfirmOpen(false);
        return;
      }
      setMode("follow");
      setSelections({});
      setPicksRevealed(true);
      setFollowConfirmOpen(false);
      router.refresh();
    });
  }

  function confirmLock() {
    if (chosen.length === 0 || !requireAuthentication()) return;
    startTransition(async () => {
      const result = await submitDailyLocks(
        chosen.map((choice) => ({ fixtureId: choice.fixtureId, selectedTeamId: choice.teamId })),
        decisionReason,
      );
      if (!result.ok) {
        setError(result.message);
        setLockConfirmOpen(false);
        return;
      }
      setDecisionReason("");
      setLockedByDate((current) => ({
        ...current,
        ...Object.fromEntries(chosen.map((choice) => [choice.matchDate, choice.teamName])),
      }));
      setSelections({});
      setSuccess(
        `${chosen.map((choice) => `${choice.teamName} on ${dayLabel(choice.matchDate)}`).join(", ")} ` +
        `${chosen.length === 1 ? "is" : "are"} locked, hidden until each match starts, and will then count ` +
        `toward your independent ${data.league.name} record.`,
      );
      setPicksRevealed(true);
      setLockConfirmOpen(false);
      setGrowthPromptOpen(true);
      router.refresh();
    });
  }

  function followPick(sourcePickId: string) {
    if (!requireAuthentication()) return;
    startTransition(async () => {
      const result = await followSpecialistPick(sourcePickId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setFollowedSourcePickId(sourcePickId);
      setSuccess("Specialist call followed with attribution. It will appear in your followed history and never count toward your independent record.");
      router.refresh();
    });
  }

  return (
    <>
      <section className="bg-inverted text-inverted-foreground">
        <div className="page-shell grid lg:min-h-52 lg:grid-cols-[1fr_260px]">
          <div className="relative flex flex-col justify-center gap-2 overflow-hidden py-7 sm:py-10">
            <div className="pitch-mark absolute inset-y-0 right-0 hidden w-1/2 border-inverted-foreground/20 lg:block" aria-hidden="true" />
            <p className="font-semibold text-primary">{data.league.country}</p>
            <h1 className="relative font-heading text-[clamp(3rem,16vw,4.5rem)] leading-[0.9] font-extrabold tracking-[-0.03em] uppercase sm:text-8xl">
              {data.league.name}
            </h1>
            <div className="relative flex flex-wrap items-center gap-4">
              <Badge variant="outline" className="border-inverted-foreground/40 text-inverted-foreground">{data.matchweek.displayName}</Badge>
              <span className="flex items-center gap-2 text-sm">
                <LockKeyholeIcon aria-hidden="true" className="size-4" />
                {lockAt ? `Next lock closes ${nextDeadline ? <LocalTime value={nextDeadline} mode="time" fallback={lockAt ?? ""} /> : lockAt}` : "Every match this week has started"}
              </span>
              {nextDeadline ? <div className="bg-background text-foreground"><LockCountdown lockAt={nextDeadline} compact /></div> : null}
            </div>
          </div>
          <aside className="grid grid-cols-[1fr_auto] items-end gap-x-5 gap-y-1 border-t border-inverted-foreground/20 py-5 lg:flex lg:flex-col lg:items-stretch lg:justify-center lg:border-t-0 lg:border-l lg:py-8 lg:pl-8">
            <span className="text-sm font-semibold">Your record</span>
            <strong className="row-span-2 font-heading text-5xl leading-none lg:row-auto lg:text-6xl">{accuracy === null ? "—" : `${accuracy.toFixed(1)}%`}</strong>
            <span className="text-lg">{data.viewer.wins}–{data.viewer.losses}</span>
            <span className="col-span-2 mt-2 flex items-center gap-2 border-t border-inverted-foreground/20 pt-3 lg:mt-3">
              <ShieldCheckIcon aria-hidden="true" className="size-5 text-primary" />
              <span><strong className="block">{data.viewer.tier}</strong><span className="text-sm text-inverted-foreground/70">{decisions} settled picks</span></span>
            </span>
            <Link href="/slip" className="mt-4 text-sm font-semibold text-primary underline-offset-4 hover:underline">Open your Weekly Slip</Link>
          </aside>
        </div>
      </section>

      <SectionNav
        sections={[
          { id: "fixtures", label: "Fixtures" },
          { id: "specialists", label: "Specialists" },
          { id: "leaderboard", label: "Leaderboard" },
          { id: "history", label: "History" },
        ]}
      >
        <span className="ml-auto hidden items-center text-xs text-muted-foreground lg:flex">Deadline:&nbsp;{nextDeadline ? <LocalTime value={nextDeadline} relative /> : "closed"}</span>
      </SectionNav>

      <div className="page-shell py-6 sm:py-8">
        {error ? <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert> : null}
        {success ? <Alert className="mb-5 rounded-none border-primary bg-primary"><CheckIcon /><AlertTitle>Done — your next step is clear</AlertTitle><AlertDescription>{success} <Link href="/slip" className="font-semibold underline">Open your Weekly Slip</Link></AlertDescription></Alert> : null}

        <ToggleGroup value={[mode]} onValueChange={chooseMode} className="grid w-full gap-2 sm:gap-4 lg:grid-cols-2" aria-label="Choose how to participate this matchweek">
          <ToggleGroupItem value="prove" disabled={Object.keys(lockedByDate).length > 0 || data.viewer.mode === "follow" || interactionLocked} className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-4 py-4 text-left sm:px-5">
            <ShieldCheckIcon aria-hidden="true" className="size-7 shrink-0 text-primary sm:size-9" />
            <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl uppercase">Prove your knowledge</strong><span className="block text-sm font-normal text-muted-foreground">Make your own pick before seeing specialists. This builds your {data.league.name} record.</span></span>
          </ToggleGroupItem>
          <ToggleGroupItem value="follow" disabled={Object.keys(lockedByDate).length > 0 || data.viewer.mode === "independent" || interactionLocked} className="h-auto min-h-24 w-full justify-start overflow-hidden whitespace-normal border px-4 py-4 text-left sm:px-5">
            <UsersRoundIcon aria-hidden="true" className="size-7 shrink-0 sm:size-9" />
            <span className="min-w-0 flex-1"><strong className="block font-heading text-2xl uppercase">Follow experts</strong><span className="block text-sm font-normal text-muted-foreground">See proven specialist picks. This will not build your independent record.</span></span>
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="mt-6 grid gap-7 xl:grid-cols-[1fr_390px]">
          <div className="space-y-7">
            <section id="fixtures" className="scroll-mt-16 border" aria-labelledby="fixtures-heading">
            <div className="border-b px-4 py-4 sm:px-5"><h2 id="fixtures-heading" className="font-heading text-2xl leading-none font-bold uppercase">Select the team you believe will win</h2></div>
            <div>
              {[...fixturesByDate].map(([date, fixtures]) => (
                <section key={date} className="border-b last:border-b-0" aria-label={date}>
                  <h3 className="border-b bg-muted px-4 py-2 text-sm font-bold uppercase tracking-wide">{date}</h3>
                  <div className="divide-y">
                    {fixtures.map((fixture) => {
                      const chosenToday = selections[fixture.matchDate];
                      const homeSelected = chosenToday?.teamId === fixture.homeTeamId;
                      const awaySelected = chosenToday?.teamId === fixture.awayTeamId;
                      // Each match closes on its own kickoff, so a Saturday
                      // result never shuts the Wednesday call beside it.
                      // Only the day this match is on is spent, so a call made
                      // on Friday leaves Saturday open.
                      const lockedThatDay = lockedByDate[fixture.matchDate];
                      const disabled = mode === "follow" || Boolean(lockedThatDay) || interactionLocked || !fixture.open;
                      return (
                        <div key={fixture.id} className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2 bg-background p-3 sm:items-center sm:gap-3">
                          <button type="button" disabled={disabled} onClick={() => chooseTeam({ fixtureId: fixture.id, teamId: fixture.homeTeamId, teamName: fixture.home, matchDate: fixture.matchDate })} className={cn("col-start-1 row-start-2 flex min-w-0 flex-col items-center justify-center gap-2 rounded-sm px-2 py-3 text-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 sm:row-start-1 sm:flex-row sm:justify-start sm:py-2 sm:text-left", homeSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted")} aria-pressed={homeSelected}>
                            <TeamMark code={fixture.homeCode} logoUrl={fixture.homeLogoUrl} /><span className="min-w-0 break-words">{fixture.home}</span>
                          </button>
                          <span className="col-span-3 row-start-1 text-center text-sm text-muted-foreground sm:col-span-1">{fixture.kickoff}</span>
                          <span className="col-start-2 row-start-2 self-center font-heading text-sm font-bold text-muted-foreground sm:hidden" aria-hidden="true">VS</span>
                          <button type="button" disabled={disabled} onClick={() => chooseTeam({ fixtureId: fixture.id, teamId: fixture.awayTeamId, teamName: fixture.away, matchDate: fixture.matchDate })} className={cn("col-start-3 row-start-2 flex min-w-0 flex-col items-center justify-center gap-2 rounded-sm px-2 py-3 text-center font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 sm:row-start-1 sm:flex-row sm:justify-end sm:py-2 sm:text-right", awaySelected ? "bg-primary text-primary-foreground" : "hover:bg-muted")} aria-pressed={awaySelected}>
                            <span className="order-first sm:order-last"><TeamMark code={fixture.awayCode} logoUrl={fixture.awayLogoUrl} /></span><span className="min-w-0 break-words sm:order-first">{fixture.away}</span>
                          </button>
                          {fixture.open && !lockedThatDay ? (
                            <div className="col-span-3 flex justify-center">
                              <AddToSlipButton fixtureId={fixture.id} label={`${fixture.home} v ${fixture.away}`} inSlip={fixture.inSlip} variant="ghost" />
                            </div>
                          ) : null}
                          <FixtureVotePoll fixtureId={fixture.id} homeVotes={fixture.homeVotes} awayVotes={fixture.awayVotes} viewerVote={fixture.viewerVote} />
                          <GameDiscussion fixtureId={fixture.id} initialComments={fixture.discussion} />
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
            <div className="border-t bg-muted p-3">
              {lockedDays.length > 0 ? (
                <p className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-semibold">
                  <CheckIcon aria-hidden="true" className="size-5 shrink-0 text-primary" />
                  {lockedDays.map(([date, team]) => `${team} on ${dayLabel(date)}`).join(" · ")}
                </p>
              ) : null}
              {mode === "prove" ? (
                <>
                {daysLeft > 0 ? (
                  <Button size="lg" className="w-full" disabled={chosen.length === 0 || pending || interactionLocked} onClick={() => requireAuthentication() && setLockConfirmOpen(true)}>
                    {pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}
                    {/* One call per day, so what is left is days, not picks. */}
                    {chosen.length === 0
                      ? `Choose a team — ${daysLeft} day${daysLeft === 1 ? "" : "s"} still open`
                      : `Lock ${chosen.length} day${chosen.length === 1 ? "" : "s"}: ${chosen.map((choice) => `${choice.teamName} (${dayLabel(choice.matchDate)})`).join(", ")}`}
                  </Button>
                ) : (
                  <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground">
                    Every day in this week is called.
                  </div>
                )}
                <SelectivityNote sport={data.league.sport} />
                </>
              ) : (
                <div className="flex min-h-11 items-center justify-center gap-2 text-sm text-muted-foreground"><UsersRoundIcon aria-hidden="true" className="size-5" />Follow mode selected — choose a specialist call</div>
              )}
            </div>
            </section>

            <div id="history" className="scroll-mt-16"><PastMatchweekHistory leagueSlug={data.league.slug} matchweeks={data.pastMatchweeks} /></div>
          </div>

          <Card id="specialists" className="rounded-sm">
            <CardHeader><CardTitle className="font-heading text-3xl font-bold uppercase">Proven {data.league.name} specialists</CardTitle><CardDescription>Accuracy always includes the independent sample behind it.</CardDescription></CardHeader>
            <CardContent className="divide-y border-y px-0">
              {data.specialists.map((specialist) => (
                <article key={specialist.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4 sm:grid-cols-[auto_1fr_auto]">
                  <Avatar size="lg"><AvatarFallback>{specialist.initials}</AvatarFallback></Avatar>
                  <div className="min-w-0"><h3 className="font-bold"><Link href={`/specialists/${specialist.handle ?? specialist.id}`} className="hover:text-primary hover:underline">{specialist.name}</Link></h3><p className="text-sm"><strong className="text-primary">{specialist.accuracy}%</strong>{" · "}{specialist.record}</p><p className="text-xs text-muted-foreground">{specialist.picks} independent picks</p></div>
                  {picksRevealed ? (
                    mode === "follow" ? (
                      <Button variant={followedSourcePickId === specialist.sourcePickId ? "secondary" : "outline"} size="sm" className="col-start-2 w-full sm:col-start-auto sm:w-auto" disabled={pending || Boolean(followedSourcePickId)} onClick={() => followPick(specialist.sourcePickId)}>
                        {followedSourcePickId === specialist.sourcePickId ? <UserRoundCheckIcon data-icon="inline-start" /> : null}{specialist.lock}
                      </Button>
                    ) : <Badge variant="outline" className="col-start-2 justify-self-start sm:col-start-auto">{specialist.lock}</Badge>
                  ) : (
                    <span className="col-start-2 flex items-center gap-2 border px-3 py-2 text-xs text-muted-foreground sm:col-start-auto"><LockKeyholeIcon aria-hidden="true" className="size-4" />Pick hidden</span>
                  )}
                </article>
              ))}
            </CardContent>
            <CardFooter className="bg-muted">
              {followedSourcePickId ? <span className="flex items-center gap-2 text-sm font-semibold"><UserRoundCheckIcon aria-hidden="true" className="size-5 text-primary" />Pick followed with attribution</span> : <span className="text-sm text-muted-foreground">{picksRevealed ? "Choose one specialist call to follow." : "Picks reveal after you lock or choose Follow Experts."}</span>}
            </CardFooter>
          </Card>
        </div>

        <section id="leaderboard" className={leaderboardEnabled ? "mt-7 grid scroll-mt-16 gap-7 lg:grid-cols-2" : "mt-7 grid scroll-mt-16 gap-7"}>
          <Card><CardHeader><CardTitle className="font-heading text-2xl font-bold uppercase">Your {data.league.name} record</CardTitle><CardDescription>Only settled independent Daily Locks count here.</CardDescription></CardHeader><CardContent className="grid grid-cols-3 gap-3"><div><strong className="block text-2xl">{data.viewer.wins}</strong><span className="text-sm text-muted-foreground">Wins</span></div><div><strong className="block text-2xl">{data.viewer.losses}</strong><span className="text-sm text-muted-foreground">Losses</span></div><div><strong className="block text-2xl">{decisions}</strong><span className="text-sm text-muted-foreground">Decisions</span></div></CardContent></Card>
          {leaderboardEnabled ? <LeagueLeaderboard leagueName={data.league.name} entries={data.leaderboard} rankThreshold={data.rankThreshold} /> : null}
        </section>
      </div>

      {daysLeft > 0 && !interactionLocked ? <div className="fixed inset-x-0 bottom-0 z-30 border-t border-primary bg-inverted p-3 text-inverted-foreground shadow-2xl sm:hidden"><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><span className="block text-[10px] font-bold uppercase text-primary">{mode === "prove" ? "Your Daily Lock" : "Follow mode"}</span><strong className="block truncate">{mode === "prove" ? (chosen.length ? `${chosen.length} day${chosen.length === 1 ? "" : "s"} chosen` : "Choose a team above") : "Choose a specialist call"}</strong></div>{mode === "prove" ? <Button disabled={chosen.length === 0 || pending} onClick={() => requireAuthentication() && setLockConfirmOpen(true)}><LockKeyholeIcon data-icon="inline-start" />Lock pick</Button> : <Button render={<a href="#specialists" />}><UsersRoundIcon data-icon="inline-start" />Specialists</Button>}</div></div> : null}

      <Dialog open={lockConfirmOpen} onOpenChange={setLockConfirmOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">Lock {chosen.length} day{chosen.length === 1 ? "" : "s"}?</DialogTitle><DialogDescription>{chosen.map((choice) => `${choice.teamName} on ${dayLabel(choice.matchDate)}`).join(" · ")}. {chosen.length === 1 ? "This independent" : "These independent"} {data.league.name} {chosen.length === 1 ? "prediction cannot" : "predictions cannot"} be changed, removed or undone, and {chosen.length === 1 ? "it goes" : "they go"} in together. Specialist picks reveal after confirmation.</DialogDescription><div className="space-y-2"><label htmlFor="decision-reason" className="text-sm font-semibold">Why this pick? <span className="font-normal text-muted-foreground">Optional</span></label><textarea id="decision-reason" value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} maxLength={500} rows={3} placeholder="Add a reason for your decision..." className="w-full resize-y border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" disabled={pending} /><p className="text-xs text-muted-foreground">Up to 500 characters.</p></div></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setLockConfirmOpen(false)}>Go back</Button><Button onClick={confirmLock} disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <LockKeyholeIcon data-icon="inline-start" />}Confirm Daily Lock</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={growthPromptOpen} onOpenChange={setGrowthPromptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-3xl font-bold uppercase">Your call is locked.</DialogTitle>
            <DialogDescription>You represented what you know. Now invite someone who knows another club or league better than you.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/invite" className={buttonVariants()}><UsersRoundIcon data-icon="inline-start" />Invite a specialist</Link>
            {challengeEnabled ? <Link href="/challenges" className={buttonVariants({ variant: "outline" })}><ShieldCheckIcon data-icon="inline-start" />Open the challenge</Link> : null}
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setGrowthPromptOpen(false)}>Not now</Button><Link href="/slip" className={buttonVariants()}>Open Weekly Slip</Link></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={followConfirmOpen} onOpenChange={setFollowConfirmOpen}>
        <DialogContent><DialogHeader><DialogTitle className="font-heading text-3xl font-bold uppercase">Reveal specialist calls?</DialogTitle><DialogDescription>This permanently forfeits an independent rated pick in {data.league.name} for {data.matchweek.displayName}. A followed call is tracked separately and never builds your expertise record.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setFollowConfirmOpen(false)}>Keep picks hidden</Button><Button onClick={confirmFollowMode} disabled={pending}>{pending ? <Spinner data-icon="inline-start" /> : <UsersRoundIcon data-icon="inline-start" />}Reveal and follow</Button></DialogFooter></DialogContent>
      </Dialog>
    </>
  );
}
