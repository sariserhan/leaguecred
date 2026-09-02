/**
 * A handle is the name that identifies a member; the display name is the one
 * they are called.
 *
 * Keeping them apart is what lets two people both be Mehmet Yılmaz while only
 * one of them is @mehmet — and what lets a record be linked to, shared and
 * indexed under something a person can read and type.
 */

import { foldToAscii } from "@/lib/team-path";

export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

const HANDLE_PATTERN = /^[a-z0-9_]+$/;

/** Paths and words a handle must not swallow, since /specialists/<handle> and
 * these share a namespace or a meaning. */
const RESERVED = new Set([
  "admin", "api", "auth", "settings", "slip", "leagues", "teams", "fixtures",
  "specialists", "challenges", "communities", "network", "notifications",
  "onboarding", "invite", "recaps", "seasons", "calendar", "live", "me",
  "leaguecred", "support", "help", "about",
]);

export function normalizeHandle(raw: string) {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}

/** A handle derived from a display name, for a member who never picked one. */
export function handleFromName(name: string) {
  // The same folding the team slugs use, so Kaan Yılmaz becomes kaan_yilmaz
  // rather than kaan_y_lmaz: NFD leaves a dotless i whole, and a handle that
  // drops a letter is not the name it came from.
  const base = foldToAscii(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, HANDLE_MAX);

  // Short or unspellable names still need something to be reached by.
  return base.length >= HANDLE_MIN ? base : `member_${base}`.slice(0, HANDLE_MAX);
}

export type HandleCheck = { ok: true; handle: string } | { ok: false; message: string };

export function validateHandle(raw: string): HandleCheck {
  const handle = normalizeHandle(raw);

  if (handle.length < HANDLE_MIN) return { ok: false, message: `A handle needs at least ${HANDLE_MIN} characters.` };
  if (handle.length > HANDLE_MAX) return { ok: false, message: `A handle cannot be longer than ${HANDLE_MAX} characters.` };
  if (!HANDLE_PATTERN.test(handle)) return { ok: false, message: "A handle can use letters, numbers and underscores only." };
  if (RESERVED.has(handle)) return { ok: false, message: "That handle is reserved." };

  return { ok: true, handle };
}

export const HANDLE_TAKEN_MESSAGE = "That handle is taken. Each one belongs to a single member.";
