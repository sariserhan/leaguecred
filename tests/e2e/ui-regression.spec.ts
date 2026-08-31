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

test("authenticated dashboard regression", async ({ page }) => {
  test.skip(!process.env.E2E_EMAIL || !process.env.E2E_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD for authenticated coverage");
  await page.goto("/auth");
  await page.getByRole("textbox", { name: "Email" }).fill(process.env.E2E_EMAIL!);
  await page.getByRole("textbox", { name: "Password" }).fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "Sign in and continue" }).click();
  await page.getByRole("button", { name: /Open account menu/ }).click();
  await page.getByRole("menuitem", { name: "My dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Finish your setup" }).or(page.getByRole("heading", { name: "Build evidence. Earn your rank." }))).toBeVisible();
});
