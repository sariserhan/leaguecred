import { expect, test } from "playwright/test";

test("global search and specialist comparison remain usable", async ({ page }) => {
  await page.goto("/specialists");
  await page.getByRole("button", { name: "Search LeagueCred" }).click();
  await expect(page.getByText("Matchweek calendar", { exact: true })).toBeVisible();
  await page.getByPlaceholder(/Search or choose/).fill("Premier");
  await expect(page.getByText("Premier League", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  const compare = page.getByRole("button", { name: "Compare" });
  await compare.nth(0).click(); await compare.nth(1).click(); await compare.last().click();
  await expect(page.getByRole("dialog", { name: "Specialist comparison" })).toBeVisible();
});

test("protected member routes preserve their intended return path", async ({ page }) => {
  for (const path of ["/calendar", "/notifications", "/seasons", "/slip", "/network"]) {
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`/auth(?:\\?next=${path.replace("/", "\\/")})?`));
  }
});

test("public navigation supports keyboard and landmark access",async({page})=>{await page.goto('/specialists');await expect(page.locator('main')).toHaveCount(1);await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to main content'})).toBeFocused();await page.keyboard.press('Control+K');await expect(page.getByRole('dialog',{name:'Command LeagueCred'})).toBeVisible();await page.keyboard.press('Escape');});

test("public UI survives zoom and high-contrast accessibility modes",async({page})=>{await page.goto('/specialists');await page.evaluate(()=>{document.documentElement.style.zoom='200%'});await expect(page.getByRole('heading',{name:'Find proven specialists.'})).toBeVisible();await expect(page.getByRole('searchbox',{name:'Search specialists or leagues'})).toBeVisible();await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.reload();await expect(page.getByRole('button',{name:'Search LeagueCred'})).toBeVisible();const duplicateIds=await page.locator('[id]').evaluateAll(nodes=>{const ids=nodes.map(n=>n.id);return ids.filter((id,i)=>ids.indexOf(id)!==i)});expect(duplicateIds).toEqual([]);const unnamedButtons=await page.getByRole('button').evaluateAll(nodes=>nodes.filter(n=>!(n.textContent?.trim()||n.getAttribute('aria-label'))).length);expect(unnamedButtons).toBe(0);});

test("authenticated dashboard regression", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage");
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "Email" }).fill(process.env.E2E_EMAIL!);
  // input[type=password] has no textbox role, so this only ever passed by not
  // running: the test is skipped unless E2E_PASSWORD is set.
  await page.getByLabel("Password").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in and continue" }).click();
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await page.getByRole("menuitem", { name: "My dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Finish your setup" }).or(page.getByRole("heading", { name: "Build evidence. Earn your rank." }))).toBeVisible();
});

/**
 * Kickoffs render in UTC on the server, because the server cannot know where
 * anybody is, and are rewritten in the reader's own clock once the page mounts.
 * Proving that needs a browser in a timezone that is not UTC — which is also
 * why it could never be checked from the served HTML alone.
 */
test.describe("kickoff times", () => {
  test.use({ timezoneId: "Europe/Istanbul" });

  test("are rewritten into the reader's own clock", async ({ page }) => {
    await page.goto("/fixtures");

    const kickoff = page.locator("time[datetime]").first();
    await expect(kickoff).toBeVisible();

    // Istanbul is GMT+3, so a localised reading cannot still be labelled UTC.
    await expect(kickoff).not.toHaveText(/UTC/);

    const drift = await kickoff.evaluate((node) => {
      const iso = node.getAttribute("datetime")!;
      const utc = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(new Date(iso));
      return { shown: node.textContent?.trim() ?? "", utc };
    });
    expect(drift.shown).not.toBe(drift.utc);
  });
});
