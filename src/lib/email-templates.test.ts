import { describe, expect, it } from "vitest";

import {
  EMAIL_WIDTH,
  lockReminderEmail,
  passwordResetEmail,
  specialistLockedEmail,
  verificationEmail,
} from "@/lib/email-templates";

const url = "https://leaguecred.test/api/auth/reset-password/abc123?callbackURL=%2Fauth%2Freset-password";
const reset = passwordResetEmail({ name: "Aylin", url });
const verify = verificationEmail({ name: "Efe", url });
const remind = lockReminderEmail({
  name: "Deniz",
  leagueName: "Süper Lig",
  matchweekName: "Matchweek 6",
  lockAt: "Saturday, 12:00 UTC",
  url,
});
const specialistLocked = specialistLockedEmail({
  name: "Deniz",
  specialistName: "Aylin",
  leagueName: "Süper Lig",
  matchweekName: "Matchweek 6",
  lockAt: "Saturday, 12:00 UTC",
  url,
});
// Every message the product sends. Adding one here without adding it to the
// shell is what the structural assertions below are for.
const every = [reset, verify, remind, specialistLocked];

describe("content", () => {
  it("carries the action link in both the text and html parts", () => {
    for (const message of every) {
      expect(message.text).toContain(url);
      expect(message.html).toContain(url);
    }
  });

  it("states the single-use expiry so the wording matches the token lifetime", () => {
    expect(reset.text).toContain("expires in one hour");
    expect(reset.text).toContain("only be used once");
  });

  it("explains why verification matters for an unrecoverable record", () => {
    expect(verify.text).toContain("cannot be rebuilt");
  });

  it("reads correctly when the account has no display name", () => {
    expect(passwordResetEmail({ name: "", url }).text.startsWith("use this link")).toBe(true);
  });
});

describe("brand", () => {
  // Hex equivalents of the oklch tokens in globals.css. Email clients support
  // neither oklch nor CSS variables, so these are inlined and must not drift.
  it("uses the LeagueCred navy and grass-lime rather than generic greys", () => {
    for (const message of every) {
      expect(message.html).toContain("#050d1c");
      expect(message.html).toContain("#b2df00");
    }
  });

  it("sets the editorial heading face with a narrow fallback", () => {
    for (const message of every) {
      expect(message.html).toContain("'Barlow Condensed','Arial Narrow'");
    }
  });

  it("never ships a colour form email clients cannot parse", () => {
    for (const message of every) {
      expect(message.html).not.toContain("oklch");
      expect(message.html).not.toContain("var(--");
    }
  });
});

describe("layout", () => {
  it("renders every message at the same width", () => {
    for (const message of every) {
      expect(message.html).toContain(`width:${EMAIL_WIDTH}px`);
      expect(message.html).toContain(`max-width:${EMAIL_WIDTH}px`);
    }
  });

  it("is responsive: viewport, a small-screen rule, and a table shell for Outlook", () => {
    for (const message of every) {
      expect(message.html).toContain('name="viewport"');
      expect(message.html).toContain("@media only screen and (max-width:600px)");
      expect(message.html).toContain('role="presentation"');
    }
  });

  it("gives every message a preheader so inbox previews stay consistent", () => {
    for (const message of every) {
      expect(message.html).toMatch(/max-height:0;overflow:hidden/);
    }
    expect(reset.html).toContain("The link expires in one hour.");
    expect(verify.html).toContain("Confirm your address so your record stays recoverable.");
  });

  it("builds every message from an identical tag skeleton", () => {
    const skeleton = (html: string) =>
      html.replace(/>[^<]*</g, "><").replace(/https?:\/\/[^"]+/g, "URL");
    const shapes = new Set(every.map((message) => skeleton(message.html)));
    expect(shapes.size).toBe(1);
  });

  it("keeps every rendered message within a similar height of the others", () => {
    const sizes = every.map((message) => message.html.length).sort((a, b) => a - b);
    expect(sizes.at(-1)! / sizes[0]!).toBeLessThan(1.1);
  });
});

describe("injection", () => {
  const hostile = '<img src=x onerror="alert(1)">';

  it("escapes a display name before it reaches the html body", () => {
    for (const build of [passwordResetEmail, verificationEmail]) {
      const message = build({ name: hostile, url });
      expect(message.html).not.toContain("<img src=x");
      expect(message.html).toContain("&lt;img src=x");
    }
  });

  it("escapes the action url in both attribute and text position", () => {
    const message = passwordResetEmail({
      name: "Aylin",
      url: 'https://example.test/reset?a=1&b="><script>',
    });
    expect(message.html).not.toContain('"><script>');
    expect(message.html).toContain("&amp;b=");
  });

  it("leaves the plain-text part unescaped, since it is not markup", () => {
    expect(passwordResetEmail({ name: hostile, url }).text).toContain(hostile);
  });
});

describe("lock reminder", () => {
  it("names the league and when its first match starts", () => {
    // Pinned loosely on purpose: the wording is copy, but a subject that omits
    // either the league or the time gives the reader nothing to act on.
    expect(remind.subject).toContain("Süper Lig");
    expect(remind.subject).toContain("Saturday, 12:00 UTC");
  });

  it("does not claim the whole round closes at that time", () => {
    // Each lock closes when its own match starts, so the first kickoff is when
    // the earliest one goes — not a deadline for the rest.
    expect(remind.subject).not.toMatch(/lock closes/i);
    expect(remind.text).toContain("closes when its own match");
  });

  it("names the league and matchweek being missed", () => {
    expect(remind.text).toContain("Süper Lig · Matchweek 6");
    expect(remind.html).toContain("Matchweek 6");
  });

  it("escapes a hostile display name like the other messages", () => {
    const hostile = lockReminderEmail({
      name: '<img src=x onerror="alert(1)">',
      leagueName: "Süper Lig",
      matchweekName: "Matchweek 6",
      lockAt: "Saturday",
      url,
    });
    expect(hostile.html).not.toContain("<img src=x");
    expect(hostile.html).toContain("&lt;img src=x");
  });
});

describe("specialist lock notification", () => {
  it("names the specialist and league in the subject", () => {
    expect(specialistLocked.subject).toBe("Aylin just locked their Süper Lig call");
  });

  it("names the league, matchweek, and deadline being missed", () => {
    expect(specialistLocked.text).toContain("Süper Lig · Matchweek 6");
    expect(specialistLocked.html).toContain("Matchweek 6");
    expect(specialistLocked.text).toContain("Saturday, 12:00 UTC");
  });

  it("warns that revealing forfeits the recipient's own independent record", () => {
    expect(specialistLocked.text).toContain("forfeits your own independent record");
    expect(specialistLocked.html).toContain("forfeits your own independent record");
  });

  it("escapes a hostile specialist or recipient name", () => {
    const hostile = specialistLockedEmail({
      name: '<img src=x onerror="alert(1)">',
      specialistName: '<img src=y onerror="alert(2)">',
      leagueName: "Süper Lig",
      matchweekName: "Matchweek 6",
      lockAt: "Saturday",
      url,
    });
    expect(hostile.html).not.toContain("<img src=x");
    expect(hostile.html).not.toContain("<img src=y");
    expect(hostile.html).toContain("&lt;img src=x");
    expect(hostile.html).toContain("&lt;img src=y");
  });
});

describe("sender identity", () => {
  it("sends each kind of message from the address that describes it", () => {
    expect(reset.from).toBe("LeagueCred <no-reply@leaguecred.com>");
    expect(verify.from).toBe("LeagueCred <welcome@leaguecred.com>");
    expect(remind.from).toBe("LeagueCred <notification@leaguecred.com>");
    expect(specialistLocked.from).toBe("LeagueCred <notification@leaguecred.com>");
  });

  it("gives every message a sender on the product domain", () => {
    for (const message of every) {
      expect(message.from).toContain("@leaguecred.com");
    }
  });
});
