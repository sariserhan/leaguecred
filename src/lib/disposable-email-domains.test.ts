import { describe, expect, it } from "vitest";

import { isDisposableEmailDomain } from "@/lib/disposable-email-domains";

describe("isDisposableEmailDomain", () => {
  it("flags a known disposable domain regardless of case", () => {
    expect(isDisposableEmailDomain("person@Mailinator.com")).toBe(true);
  });

  it("does not flag a normal email address", () => {
    expect(isDisposableEmailDomain("aylin@gmail.com")).toBe(false);
  });

  it("does not flag a domain that merely contains a disposable one as a substring", () => {
    expect(isDisposableEmailDomain("person@notmailinator.com")).toBe(false);
  });

  it("handles a value with no @ without throwing", () => {
    expect(isDisposableEmailDomain("not-an-email")).toBe(false);
  });
});
