"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowBigDownIcon,
  ArrowBigUpIcon,
  CheckIcon,
  LockKeyholeIcon,
  MessageCircleIcon,
  PlusIcon,
  TriangleAlertIcon,
  ReplyIcon,
  SendIcon,
  UserPlusIcon,
} from "lucide-react";

import { addLockOpinion, voteLockOpinion, voteOnLock } from "@/app/live-locks/actions";
import { addSlipCandidate } from "@/app/slip/actions";
import { followSpecialist, submitDailyLock } from "@/app/leagues/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Crest } from "@/components/ui/crest";
import { LocalTime } from "@/components/local-time";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import type { GlobalActiveLock, LockOpinion } from "@/data/live-locks";
import {
  NO_FILTER,
  emptyLockFilters,
  filterLocks,
  lockFilterOptions,
  type LockFilters,
} from "@/lib/live-lock-filters";
import { cn } from "@/lib/utils";

const dayFormatter = new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });

function Vote({ opinion, signedIn }: { opinion: LockOpinion; signedIn: boolean }) {
  const [score, setScore] = useState(opinion.score);
  const [vote, setVote] = useState(opinion.viewerVote);
  const [pending, startTransition] = useTransition();

  function cast(value: -1 | 1) {
    startTransition(async () => {
      const result = await voteLockOpinion(opinion.id, value);
      if (result.ok) { setScore(result.score ?? score); setVote(result.viewerVote ?? 0); }
      else toast.add({ title: "Vote not counted", description: result.message, type: "error" });
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="ghost" aria-label="Agree" disabled={!signedIn || pending} onClick={() => cast(1)}>
        <ArrowBigUpIcon className={cn("size-4", vote === 1 && "fill-primary text-primary")} />
      </Button>
      <span className="min-w-4 text-center text-xs font-bold tabular-nums">{score}</span>
      <Button size="icon" variant="ghost" aria-label="Disagree" disabled={!signedIn || pending} onClick={() => cast(-1)}>
        <ArrowBigDownIcon className={cn("size-4", vote === -1 && "fill-destructive text-destructive")} />
      </Button>
    </div>
  );
}

function Opinion({ opinion, signedIn, onReply }: { opinion: LockOpinion; signedIn: boolean; onReply: (opinion: LockOpinion) => void }) {
  return (
    <article className={cn("grid grid-cols-[auto_1fr] gap-3 py-3", opinion.parentId && "ml-6 border-l-2 border-primary pl-3 sm:ml-10")}>
      <Avatar className="size-7"><AvatarFallback>{opinion.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
      <div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <Link href={`/specialists/${opinion.handle ?? opinion.userId}`} className="font-bold hover:text-primary">{opinion.username}</Link>
          <LocalTime value={opinion.createdAt} />
        </div>
        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">{opinion.body}</p>
        <div className="mt-1 flex items-center gap-2">
          <Vote opinion={opinion} signedIn={signedIn} />
          <Button size="sm" variant="ghost" onClick={() => onReply(opinion)} disabled={!signedIn}>
            <ReplyIcon data-icon="inline-start" />Reply
          </Button>
        </div>
      </div>
    </article>
  );
}

/**
 * One lock, at a glance.
 *
 * The board is read by scanning: whose call, which match, and whether anyone
 * agrees. So the card carries that on two lines and keeps everything else - the
 * reason, the discussion - behind a press, rather than opening every thread on
 * a page that may hold sixty of them.
 */
function LockCard({ lock, signedIn }: { lock: GlobalActiveLock; signedIn: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [score, setScore] = useState(lock.score);
  const [vote, setVote] = useState(lock.viewerVote);
  const [following, setFollowing] = useState(lock.viewerFollows);
  const [added, setAdded] = useState(lock.inViewerSlip);
  const [locking, setLocking] = useState(false);
  const [lockedByViewer, setLockedByViewer] = useState(lock.viewerLockedThatDay);
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<LockOpinion | null>(null);
  const [error, setError] = useState("");

  const roots = lock.opinions.filter((opinion) => !opinion.parentId);

  function castLockVote(value: -1 | 1) {
    startTransition(async () => {
      const result = await voteOnLock(lock.id, value);
      if (result.ok) { setScore(result.score ?? score); setVote(result.viewerVote ?? 0); }
      else toast.add({ title: "Vote not counted", description: result.message, type: "error" });
    });
  }

  function follow() {
    startTransition(async () => {
      const result = await followSpecialist(lock.userId, lock.league.id);
      if (result.ok) {
        setFollowing(true);
        toast.add({ title: "Following", description: `${lock.username}'s ${lock.league.name} calls will appear in your network.`, type: "success" });
      } else {
        toast.add({ title: "Not following", description: result.message, type: "error" });
      }
    });
  }

  // Adding sets the match aside; it does not take a side and it does not lock.
  // The reader decides on their own slip, where both teams are offered.
  function addToSlip() {
    startTransition(async () => {
      const result = await addSlipCandidate(lock.fixtureId);
      if (result.ok) {
        setAdded(true);
        toast.add({
          title: "On your slip",
          description: `${lock.selected.name} against ${lock.opponent.name} is waiting for you to decide.`,
          type: "success",
        });
        // The dock lives in the layout, so it only learns about this on a
        // refresh of the server render.
        router.refresh();
      } else {
        toast.add({ title: "Not added", description: result.message, type: "error" });
      }
    });
  }

  // Locking from the board is the reader's own call on the same match, on
  // whichever side they believe - so the warning carries both teams and the
  // choice is made inside it, never a press away from the card.
  function lockSide(teamId: string, teamName: string) {
    setLocking(false);
    startTransition(async () => {
      const result = await submitDailyLock(lock.fixtureId, teamId);
      if (result.ok) {
        setLockedByViewer(true);
        toast.add({ title: "Locked", description: `${teamName} is your Daily Lock for that day.`, type: "success" });
        router.refresh();
      } else {
        toast.add({ title: "Not locked", description: result.message, type: "error" });
      }
    });
  }

  function postOpinion() {
    startTransition(async () => {
      const result = await addLockOpinion(lock.id, body, reply?.id);
      if (result.ok) { setBody(""); setReply(null); setError(""); router.refresh(); }
      else setError(result.message);
    });
  }

  return (
    <article className="border bg-background">
      <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <Avatar className="size-6"><AvatarImage src={lock.userImage ?? undefined} /><AvatarFallback>{lock.username.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <Link href={`/specialists/${lock.handle ?? lock.userId}`} className="font-bold text-foreground hover:text-primary">{lock.username}</Link>
            <Badge variant="outline">{lock.league.name}</Badge>
            <span>{dayFormatter.format(new Date(lock.kickoffAt))}</span>
            <LocalTime value={lock.kickoffAt} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Crest src={lock.selected.logoUrl} size={28} />
            <Link href={`/teams/${lock.selected.slug}`} className="font-heading text-xl font-bold uppercase hover:text-primary">{lock.selected.name}</Link>
            <span className="text-xs text-muted-foreground">to beat</span>
            <Crest src={lock.opponent.logoUrl} size={22} />
            <Link href={`/teams/${lock.opponent.slug}`} className="text-sm font-semibold hover:text-primary">{lock.opponent.name}</Link>
          </div>
          {lock.message ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">“{lock.message}”</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <Button size="icon" variant="ghost" aria-label={`Agree with ${lock.username}'s call`} disabled={!signedIn || pending} onClick={() => castLockVote(1)}>
            <ArrowBigUpIcon className={cn("size-5", vote === 1 && "fill-primary text-primary")} />
          </Button>
          <span className="min-w-5 text-center text-sm font-bold tabular-nums">{score}</span>
          <Button size="icon" variant="ghost" aria-label={`Disagree with ${lock.username}'s call`} disabled={!signedIn || pending} onClick={() => castLockVote(-1)}>
            <ArrowBigDownIcon className={cn("size-5", vote === -1 && "fill-destructive text-destructive")} />
          </Button>
          <Button size="sm" variant={following ? "secondary" : "outline"} disabled={!signedIn || pending || following} onClick={follow}>
            {following ? <CheckIcon data-icon="inline-start" /> : <UserPlusIcon data-icon="inline-start" />}
            {following ? "Following" : "Follow"}
          </Button>
          <Button size="sm" variant={added ? "secondary" : "outline"} disabled={!signedIn || pending || added} onClick={addToSlip}>
            {added ? <CheckIcon data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
            {added ? "On your slip" : "Slip"}
          </Button>
          {lock.open ? (
            <Button size="sm" disabled={!signedIn || pending || lockedByViewer} onClick={() => setLocking(true)}>
              <LockKeyholeIcon data-icon="inline-start" />
              {lockedByViewer ? "Called that day" : "Lock"}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => setOpen((current) => !current)} aria-expanded={open}>
            <MessageCircleIcon data-icon="inline-start" />{lock.opinions.length}
          </Button>
        </div>
      </div>

      {open ? (
        <section className="border-t px-4 pb-4" aria-label={`Opinions on ${lock.username}'s lock`}>
          {lock.message ? <p className="border-l-4 border-primary bg-muted p-3 text-sm whitespace-pre-wrap">“{lock.message}”</p> : null}
          {roots.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No opinions yet.</p> : null}
          {roots.map((root) => (
            <div key={root.id} className="border-b last:border-b-0">
              <Opinion opinion={root} signedIn={signedIn} onReply={setReply} />
              {lock.opinions.filter((opinion) => opinion.parentId === root.id).map((child) => (
                <Opinion key={child.id} opinion={child} signedIn={signedIn} onReply={setReply} />
              ))}
            </div>
          ))}

          {signedIn ? (
            <div className="pt-3">
              {reply ? (
                <div className="mb-2 flex items-center justify-between bg-muted px-3 py-2 text-xs">
                  <span>Replying to <strong>{reply.username}</strong></span>
                  <Button size="sm" variant="ghost" onClick={() => setReply(null)}>Cancel</Button>
                </div>
              ) : null}
              <label className="sr-only" htmlFor={`opinion-${lock.id}`}>Write an opinion</label>
              <textarea
                id={`opinion-${lock.id}`}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={500}
                placeholder={reply ? `Reply to ${reply.username}…` : "What do you think about this lock?"}
                className="min-h-20 w-full resize-y border bg-background p-3 text-sm outline-none focus:border-primary"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{body.length}/500</span>
                <Button size="sm" onClick={postOpinion} disabled={pending || body.trim().length < 2}>
                  {pending ? <Spinner /> : <SendIcon data-icon="inline-start" />}Post opinion
                </Button>
              </div>
              {error ? <p className="mt-2 text-sm text-destructive" role="alert">{error}</p> : null}
            </div>
          ) : (
            <Link href={`/auth?next=${encodeURIComponent("/live-locks")}`} className={buttonVariants({ variant: "outline", size: "sm", className: "mt-3" })}>
              Sign in to write or vote
            </Link>
          )}
        </section>
      ) : null}

      <AlertDialog open={locking} onOpenChange={setLocking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 font-heading text-3xl font-bold uppercase">
              <TriangleAlertIcon aria-hidden="true" className="size-6 text-primary" />
              Who wins?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Your own call on {lock.selected.name} against {lock.opponent.name}, independent of
              {" "}{lock.username}&rsquo;s. This is final: a lock cannot be changed, removed or undone, it
              counts towards your public {lock.league.name} record whichever way the match goes, and it
              spends your one call for that day.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {[lock.selected, lock.opponent].map((team) => (
              <Button key={team.id} disabled={pending} onClick={() => lockSide(team.id, team.name)}>
                <Crest src={team.logoUrl} size={20} />Lock {team.name}
              </Button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

export function LiveLockForum({ locks, signedIn, viewerId }: { locks: GlobalActiveLock[]; signedIn: boolean; viewerId: string | null }) {
  const [filters, setFilters] = useState<LockFilters>(emptyLockFilters);
  const [mineOnly, setMineOnly] = useState(false);
  const options = useMemo(() => lockFilterOptions(locks), [locks]);
  const mine = useMemo(() => locks.filter((lock) => lock.userId === viewerId), [locks, viewerId]);
  const visible = useMemo(() => {
    const scoped = mineOnly ? mine : locks;
    return filterLocks(scoped, filters);
  }, [locks, mine, mineOnly, filters]);

  function set(key: keyof LockFilters, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const selectClass = "h-10 min-w-40 border bg-background px-3 text-sm";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-3 border p-4">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">League</span>
          <select className={selectClass} value={filters.league} onChange={(event) => set("league", event.target.value)}>
            <option value={NO_FILTER}>Every league</option>
            {options.leagues.map((league) => <option key={league.slug} value={league.slug}>{league.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">Member</span>
          <select className={selectClass} value={filters.member} onChange={(event) => set("member", event.target.value)}>
            <option value={NO_FILTER}>Everyone</option>
            {options.members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">Matchday</span>
          <select className={selectClass} value={filters.date} onChange={(event) => set("date", event.target.value)}>
            <option value={NO_FILTER}>Any day</option>
            {options.days.map((day) => (
              <option key={day} value={day}>{dayFormatter.format(new Date(`${day}T12:00:00Z`))}</option>
            ))}
          </select>
        </label>
        {viewerId ? (
          <Button
            variant={mineOnly ? "default" : "outline"}
            aria-pressed={mineOnly}
            onClick={() => setMineOnly((current) => !current)}
          >
            <LockKeyholeIcon data-icon="inline-start" />
            {mineOnly ? "Showing my locks" : `My locked games (${mine.length})`}
          </Button>
        ) : null}
        {filters === emptyLockFilters && !mineOnly ? null : (
          <Button variant="ghost" onClick={() => { setFilters(emptyLockFilters); setMineOnly(false); }}>Clear</Button>
        )}
        <p className="ml-auto text-sm text-muted-foreground">
          {visible.length} of {locks.length} lock{locks.length === 1 ? "" : "s"}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="border p-8 text-center text-sm text-muted-foreground">
          {mineOnly ? "You have no active lock right now." : "No active lock matches those filters."}
        </p>
      ) : (
        <div className="grid gap-3">
          {visible.map((lock) => <LockCard key={lock.id} lock={lock} signedIn={signedIn} />)}
        </div>
      )}
    </div>
  );
}
