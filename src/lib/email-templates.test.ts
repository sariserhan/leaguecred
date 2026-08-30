import { describe, expect, it } from "vitest";

import {
  EMAIL_WIDTH,
  passwordResetEmail,
  verificationEmail,
} from "@/lib/email-templates";

const url = "https://leaguecred.test/api/auth/reset-password/abc123?callbackURL=%2Fauth%2Freset-password";
const reset = passwordResetEmail({ name: "Aylin", url });
const verify = verificationEmail({ name: "Efe", url });
const every = [reset, verify];

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

  it("builds both messages from an identical tag skeleton", () => {
    const skeleton = (html: string) =>
      html.replace(/>[^<]*</g, "><").replace(/https?:\/\/[^"]+/g, "URL");
    expect(skeleton(reset.html)).toBe(skeleton(verify.html));
  });

  it("keeps the rendered messages within a similar height of each other", () => {
    const [shorter, longer] = [reset.html.length, verify.html.length].sort((a, b) => a - b);
    expect(longer! / shorter!).toBeLessThan(1.1);
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
