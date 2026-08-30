import { describe, expect, it } from "vitest";

import { escapeHtml } from "@/lib/escape-html";

describe("escapeHtml", () => {
  it("neutralises tag and attribute delimiters", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("escapes the ampersand first so entities are not double-formed", () => {
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeHtml("Aylin Yılmaz")).toBe("Aylin Yılmaz");
  });
});
