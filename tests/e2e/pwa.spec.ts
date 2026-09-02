import { expect, test } from "playwright/test";

/**
 * The service worker only registers on a production build, which is what CI
 * runs and what a developer container without browser libraries cannot check
 * at all. These are the assertions that would otherwise wait for someone to
 * open DevTools on a preview deploy.
 */
test("the app is installable and its manifest describes it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");

  const manifest = await page.request.get("/manifest.webmanifest").then((response) => response.json());
  expect(manifest.name).toContain("LeagueCred");
  expect(manifest.start_url).toBe("/");
  expect(manifest.display).toBe("standalone");

  // A launcher needs a 192 and a 512, and Android needs one it is allowed to
  // crop. Missing any of the three is the usual reason a browser silently
  // declines to offer an install.
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);

  for (const icon of manifest.icons) {
    const response = await page.request.get(icon.src);
    expect(response.status(), `${icon.src} should be served`).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
  }
});

test("a dropped connection lands on the offline page rather than the browser's", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });

  // The worker precaches the signed-out offline shell during install. Without
  // it there is nothing to serve when the network goes, so wait for it to land
  // before pulling the plug.
  await page.waitForFunction(
    async () => {
      const names = await caches.keys();
      const shell = names.find((name) => name.includes("shell"));
      if (!shell) return false;
      return Boolean(await (await caches.open(shell)).match("/offline"));
    },
    null,
    { timeout: 30_000 },
  );

  await context.setOffline(true);
  await page.goto("/leagues", { waitUntil: "domcontentloaded" }).catch(() => {
    // A navigation the worker answers from cache still resolves; one it cannot
    // is the failure this test exists to rule out, and the assertion below is
    // what reports it.
  });
  await expect(page.getByRole("heading", { name: "No connection." })).toBeVisible();

  await context.setOffline(false);
});
