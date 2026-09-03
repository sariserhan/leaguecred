import { describe, expect, it } from "vitest";

import { safeReferralCode } from "@/lib/referral-code";

describe("safeReferralCode", () => {
  it("keeps a plain code", () => {
    expect(safeReferralCode("kaan99")).toBe("kaan99");
  });

  it("strips anything that is not a letter or a digit", () => {
    expect(safeReferralCode("kaan-99_x")).toBe("kaan99x");
    expect(safeReferralCode("../../etc/passwd")).toBe("etcpasswd");
    expect(safeReferralCode("<script>")).toBe("script");
  });

  it("caps the length", () => {
    expect(safeReferralCode("a".repeat(80))).toHaveLength(32);
  });

  it.each([undefined, "", "!!!", []])("returns null for %s", (value) => {
    expect(safeReferralCode(value as string | string[] | undefined)).toBeNull();
  });

  it("takes the first of a repeated parameter", () => {
    expect(safeReferralCode(["first", "second"])).toBe("first");
  });
});
