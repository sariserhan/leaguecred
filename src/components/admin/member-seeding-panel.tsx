"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckIcon, UserPlusIcon } from "lucide-react";

import {
  assignLockAction,
  createMemberAction,
  loadAssignableFixtures,
  loadAssignedLocks,
} from "@/app/admin/actions";
import type { AssignableFixture, AssignedLock, SeedableMember } from "@/services/member-seeding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function scoreline(fixture: AssignableFixture) {
  if (fixture.homeScore === null || fixture.awayScore === null) return "—";
  return `${fixture.homeScore}–${fixture.awayScore}`;
}

/**
 * Creating a member, and giving them locks on matches already played.
 *
 * A lock recorded here is indistinguishable from one a member placed: same
 * table, same settlement, same league record, counted on the public
 * leaderboard. The panel says so rather than leaving an admin to discover it.
 */
export function MemberSeedingPanel({
  members,
  leagues,
}: {
  members: SeedableMember[];
  leagues: Array<{ slug: string; name: string }>;
}) {
  const [name, setName] = useState("");
  const [memberId, setMemberId] = useState(members[0]?.id ?? "");
  const [leagueSlug, setLeagueSlug] = useState(leagues[0]?.slug ?? "");
  const [fixtures, setFixtures] = useState<AssignableFixture[] | null>(null);
  const [locks, setLocks] = useState<AssignedLock[] | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function refresh(user: string, league: string) {
    if (!user || !league) return;
    startTransition(async () => {
      const [nextFixtures, nextLocks] = await Promise.all([
        loadAssignableFixtures(user, league),
        loadAssignedLocks(user),
      ]);
      setFixtures(nextFixtures);
      setLocks(nextLocks);
    });
  }

  function create() {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await createMemberAction(name);
      if (result.ok) {
        setMessage(`Created ${name.trim()}. Pick them from the list to give them locks.`);
        setName("");
        // The member list is a server prop, so without this the new member is
        // absent from the picker until someone reloads the page by hand.
        router.refresh();
      } else setError(result.message);
    });
  }

  function assign(fixture: AssignableFixture, teamId: string) {
    setError("");
    setMessage("");
    startTransition(async () => {
      const result = await assignLockAction({ userId: memberId, fixtureId: fixture.id, selectedTeamId: teamId });
      if (result.ok) {
        const team = teamId === fixture.home.id ? fixture.home.name : fixture.away.name;
        setMessage(`Recorded ${team} on ${dateFormatter.format(new Date(fixture.kickoff))}.`);
        refresh(memberId, leagueSlug);
        // Keeps the lock count beside each name honest.
        router.refresh();
      } else setError(result.message);
    });
  }

  const selected = members.find((member) => member.id === memberId);

  return (
    <section className="border p-5 sm:p-6">
      <h2 className="font-heading text-2xl font-bold uppercase">Create a member and assign played matches</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A lock recorded here counts exactly like one a member placed themselves — it settles the same way and
        appears on the public leaderboard with no marking. None of it can be undone: locks cannot be deleted
        and a member created here cannot be removed. Every action is written to the audit log.
      </p>

      <div className="mt-6 grid gap-3 border p-4 sm:grid-cols-[1fr_auto]">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">New member name</span>
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Display name"
            maxLength={80}
          />
        </label>
        <Button className="sm:self-end" disabled={pending || name.trim().length < 2} onClick={create}>
          <UserPlusIcon data-icon="inline-start" />
          Create member
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">Member</span>
          <select
            value={memberId}
            onChange={(event) => {
              setMemberId(event.target.value);
              refresh(event.target.value, leagueSlug);
            }}
            className="h-10 border bg-background px-3 text-sm"
          >
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} — {member.locks} lock{member.locks === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-bold tracking-[.12em] uppercase">League</span>
          <select
            value={leagueSlug}
            onChange={(event) => {
              setLeagueSlug(event.target.value);
              refresh(memberId, event.target.value);
            }}
            className="h-10 border bg-background px-3 text-sm"
          >
            {leagues.map((league) => (
              <option key={league.slug} value={league.slug}>{league.name}</option>
            ))}
          </select>
        </label>
      </div>

      {fixtures === null ? (
        <Button variant="outline" className="mt-4" disabled={pending || !memberId} onClick={() => refresh(memberId, leagueSlug)}>
          {pending ? "Loading…" : "Show played matches"}
        </Button>
      ) : null}

      {error ? <p className="mt-4 border border-destructive px-4 py-3 text-sm text-destructive">{error}</p> : null}
      {message ? (
        <p className="mt-4 flex items-center gap-2 border px-4 py-3 text-sm font-semibold">
          <CheckIcon className="size-4 text-primary" />{message}
        </p>
      ) : null}

      {fixtures ? (
        <div className="mt-6">
          <h3 className="font-heading text-lg font-bold uppercase">
            Played matches {selected ? `available for ${selected.name}` : ""}
          </h3>
          {fixtures.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No played match is left in this league that this member does not already hold a lock for that day.
            </p>
          ) : (
            <ul className="mt-3 divide-y border">
              {fixtures.map((fixture) => (
                <li key={fixture.id} className="grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <span className="text-xs text-muted-foreground sm:w-28">
                    {dateFormatter.format(new Date(fixture.kickoff))}
                  </span>
                  <span className="text-sm font-semibold">
                    {fixture.home.name} {scoreline(fixture)} {fixture.away.name}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {[fixture.home, fixture.away].map((team) => (
                      <Button
                        key={team.id}
                        size="sm"
                        variant={fixture.winnerTeamId === team.id ? "default" : "outline"}
                        disabled={pending}
                        onClick={() => assign(fixture, team.id)}
                      >
                        {team.name}
                      </Button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {locks && locks.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-heading text-lg font-bold uppercase">Locks held</h3>
          <ul className="mt-3 divide-y border">
            {locks.map((lock) => (
              <li key={lock.pickId} className="grid gap-2 p-4 text-sm sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <span className="text-xs text-muted-foreground sm:w-28">{lock.matchDate}</span>
                <span>
                  <strong>{lock.selectedTeam}</strong> v {lock.opponent}
                  <span className="ml-2 text-xs text-muted-foreground">{lock.leagueName}</span>
                </span>
                <span
                  className={cn(
                    "text-xs font-bold uppercase",
                    lock.result === "win" && "text-primary",
                    lock.result === "loss" && "text-destructive",
                  )}
                >
                  {lock.result}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
