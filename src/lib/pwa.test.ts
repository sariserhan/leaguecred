import { describe, expect, it } from "vitest";

import { PWA_ICON_VARIANTS, isIosDevice, parsePwaIconVariant } from "@/lib/pwa";

describe("parsePwaIconVariant", () => {
  it.each(PWA_ICON_VARIANTS)("resolves %s", (variant) => {
    const icon = parsePwaIconVariant(variant);
    expect(icon).not.toBeNull();
    expect(icon?.size).toBe(Number(variant.split("-")[1]));
    expect(icon?.purpose).toBe(variant.split("-")[0]);
  });

  it("keeps a maskable mark inside the crop-safe middle", () => {
    expect(parsePwaIconVariant("maskable-512")?.scale).toBeLessThanOrEqual(0.8);
    expect(parsePwaIconVariant("any-512")?.scale).toBeGreaterThan(0.8);
  });

  it.each(["any-256", "circle-192", "192", "any-192/../../etc", ""])("rejects %s", (variant) => {
    expect(parsePwaIconVariant(variant)).toBeNull();
  });
});

describe("isIosDevice", () => {
  it.each([
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_7 like Mac OS X)",
  ])("recognises %s", (userAgent) => {
    expect(isIosDevice(userAgent)).toBe(true);
  });

  it("treats a touch-reporting Macintosh as an iPad", () => {
    const iPadOs = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
    expect(isIosDevice(iPadOs, 5)).toBe(true);
    expect(isIosDevice(iPadOs, 0)).toBe(false);
  });

  it.each([
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126.0.0.0",
  ])("leaves %s to the install prompt", (userAgent) => {
    expect(isIosDevice(userAgent, 5)).toBe(false);
  });
});
