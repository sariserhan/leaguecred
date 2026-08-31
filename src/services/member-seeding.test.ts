import { describe, expect, it } from "vitest";

import { seedEmailFor, validateMemberName } from "@/services/member-seeding";

describe("validateMemberName", () => {
  it("collapses runs of whitespace so two members cannot differ by spacing alone", () => {
    expect(validateMemberName("  Ada   Okonkwo  ")).toEqual({ ok: true, name: "Ada Okonkwo" });
  });

  it("refuses a name that is blank or a single character", () => {
    for (const name of ["", "   ", "A"]) {
      expect(validateMemberName(name).ok).toBe(false);
    }
  });

  it("refuses a name past the column's limit rather than letting the insert fail", () => {
    const result = validateMemberName("x".repeat(81));
    expect(result.ok).toBe(false);
    expect(validateMemberName("x".repeat(80)).ok).toBe(true);
  });
});

describe("seedEmailFor", () => {
  it("is unique per member and on a domain that cannot receive mail", () => {
    const one = seedEmailFor("11111111-1111-4111-8111-111111111111");
    const two = seedEmailFor("22222222-2222-4222-8222-222222222222");
    expect(one).not.toEqual(two);
    expect(one.endsWith("@created.leaguecred.local")).toBe(true);
  });
});
