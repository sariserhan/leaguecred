import { describe, expect, it } from "vitest";

import { SERVER_ERROR_TAG, describeError, formatServerError } from "@/lib/observability";

describe("describeError", () => {
  it("reads the message off an Error", () => {
    expect(describeError(new Error("settlement failed"))).toEqual({ message: "settlement failed" });
  });

  it("carries the digest React attaches to a swallowed render error", () => {
    const error = Object.assign(new Error("boom"), { digest: "2094832" });
    expect(describeError(error)).toEqual({ message: "boom", digest: "2094832" });
  });

  it("falls back to the name when an Error carries no message", () => {
    expect(describeError(new TypeError())).toEqual({ message: "TypeError" });
  });

  it.each([
    ["a thrown string", "upstream refused", { message: "upstream refused" }],
    ["a thrown object", { code: 42 }, { message: '{"code":42}' }],
  ])("describes %s", (_label, thrown, expected) => {
    expect(describeError(thrown)).toEqual(expected);
  });
});

describe("formatServerError", () => {
  it("puts everything on one greppable line", () => {
    const line = formatServerError({ scope: "request", message: "boom", route: "/leagues" });

    expect(line.startsWith(`${SERVER_ERROR_TAG} `)).toBe(true);
    expect(line).not.toContain("\n");
    expect(JSON.parse(line.slice(SERVER_ERROR_TAG.length + 1))).toEqual({
      scope: "request",
      message: "boom",
      route: "/leagues",
    });
  });
});
