import { describe, expect, it } from "vitest";

import { HANDLE_MAX, handleFromName, normalizeHandle, validateHandle } from "@/lib/handle";

describe("validateHandle", () => {
  it("accepts letters, numbers and underscores, however it was typed", () => {
    expect(validateHandle("@Kaan_99")).toEqual({ ok: true, handle: "kaan_99" });
  });

  it("refuses what cannot be a handle", () => {
    expect(validateHandle("ka").ok).toBe(false);
    expect(validateHandle("k".repeat(HANDLE_MAX + 1)).ok).toBe(false);
    expect(validateHandle("kaan yılmaz").ok).toBe(false);
    expect(validateHandle("kaan-99").ok).toBe(false);
  });

  // /specialists/<handle> shares a namespace with the rest of the site.
  it("refuses a handle that would swallow a path", () => {
    expect(validateHandle("admin").ok).toBe(false);
    expect(validateHandle("settings").ok).toBe(false);
  });
});

describe("handleFromName", () => {
  it("carries a name across as far as it can be spelled", () => {
    expect(handleFromName("Kaan Yılmaz")).toBe("kaan_yilmaz");
    expect(handleFromName("  Ada  Lovelace ")).toBe("ada_lovelace");
  });

  it("still returns something reachable for a name it cannot spell", () => {
    expect(validateHandle(handleFromName("李")).ok).toBe(true);
    expect(validateHandle(handleFromName("Al")).ok).toBe(true);
  });

  it("never exceeds the length a handle is allowed", () => {
    expect(handleFromName("A".repeat(60)).length).toBeLessThanOrEqual(HANDLE_MAX);
  });
});

describe("normalizeHandle", () => {
  it("drops a leading at sign, which is how people type one", () => {
    expect(normalizeHandle("  @Kaan ")).toBe("kaan");
  });
});
