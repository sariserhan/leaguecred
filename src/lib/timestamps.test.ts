import { describe, expect, it } from "vitest";

import { toEpochMilliseconds, toIsoTimestamp } from "@/lib/timestamps";

const iso = "2026-08-30T04:00:00.000Z";

describe("toIsoTimestamp", () => {
  it("passes a Date through", () => {
    expect(toIsoTimestamp(new Date(iso))).toBe(iso);
  });

  // Postgres.js returns a string on some driver paths, which previously threw.
  it("accepts the string form Postgres.js can return", () => {
    expect(toIsoTimestamp("2026-08-30 04:00:00+00")).toBe(iso);
    expect(toIsoTimestamp(iso)).toBe(iso);
  });
});

describe("toEpochMilliseconds", () => {
  it("agrees for both representations", () => {
    expect(toEpochMilliseconds(new Date(iso))).toBe(toEpochMilliseconds(iso));
  });

  it("measures a duration across representations", () => {
    const started = "2026-08-30 04:00:00+00";
    const finished = new Date("2026-08-30T04:00:42.000Z");
    expect(Math.round((toEpochMilliseconds(finished) - toEpochMilliseconds(started)) / 1000)).toBe(42);
  });
});
