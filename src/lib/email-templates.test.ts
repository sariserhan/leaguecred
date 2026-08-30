import { describe, expect, it } from "vitest";

import { passwordResetEmail, verificationEmail } from "@/lib/email-templates";

const url = "https://leaguecred.test/api/auth/reset-password/abc123?callbackURL=%2Fauth%2Freset-password";

describe("passwordResetEmail", () => {
  it("carries the action link in both the text and html parts", () => {
    const message = passwordResetEmail({ name: "Aylin", url });

    expect(message.subject).toBe("Reset your LeagueCred password");
    expect(message.text).toContain(url);
    expect(message.html).toContain(url);
    expect(message.text).toContain("Aylin");
  });

  it("states the single-use expiry so the wording matches the token lifetime", () => {
    const message = passwordResetEmail({ name: "Aylin", url });
    expect(message.text).toContain("expires in one hour");
    expect(message.text).toContain("only be used once");
  });

  it("reads correctly when the account has no display name", () => {
    const message = passwordResetEmail({ name: "", url });
    expect(message.text.startsWith("use this link")).toBe(true);
  });
});

describe("verificationEmail", () => {
  it("carries the action link and explains why verification matters", () => {
    const message = verificationEmail({ name: "Efe", url });

    expect(message.subject).toBe("Confirm your LeagueCred address");
    expect(message.text).toContain(url);
    expect(message.html).toContain(url);
    expect(message.text).toContain("cannot be rebuilt");
  });
});
