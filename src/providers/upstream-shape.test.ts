import { describe, expect, it } from "vitest";

import { assertUnderstood, UpstreamShapeError } from "@/providers/upstream-shape";

describe("assertUnderstood", () => {
  it("accepts a feed that sent nothing", () => {
    // A league between rounds, or a window with no matches in it.
    expect(() => assertUnderstood("ESPN", 0, 0)).not.toThrow();
  });

  it("accepts a whole payload that was read", () => {
    expect(() => assertUnderstood("ESPN", 20, 20)).not.toThrow();
  });

  it("tolerates the odd row that cannot be read", () => {
    // An undecided playoff tie has no opponent to name yet.
    expect(() => assertUnderstood("ESPN", 20, 18)).not.toThrow();
    expect(() => assertUnderstood("ESPN", 20, 10)).not.toThrow();
  });

  it("fails when a payload arrived and almost none of it was understood", () => {
    expect(() => assertUnderstood("ESPN standings for eng.1", 20, 3)).toThrow(UpstreamShapeError);
  });

  it("fails loudest on the case that used to pass silently", () => {
    // A renamed field: everything arrives, nothing parses, and the old code
    // reported a successful sync that stored no fixtures.
    expect(() => assertUnderstood("ESPN scoreboard for eng.1", 10, 0))
      .toThrow(/response shape has probably changed/);
  });

  it("names the source, so the failure says which feed moved", () => {
    expect(() => assertUnderstood("ESPN scoreboard for tur.1", 9, 0)).toThrow(/tur\.1/);
  });
});
