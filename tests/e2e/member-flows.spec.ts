import { expect, test, type Page } from "playwright/test";

/**
 * The paths the developer handbook says to check by hand on two accounts.
 * Nothing here is seeded: an account is created through the real sign-up form,
 * so a break anywhere between the form, Better Auth, the handle derivation and
 * the session cookie fails the test rather than being worked around.
 *
 * Both Playwright projects run every test, so the identity has to be unique per
 * run and per project or the second one signs up as the first.
 */
function newMember(page: Page) {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  return {
    name: "Test Member",
    // Under the 20-character handle limit, and only [a-z0-9_] as the rules allow.
    handle: `t_${stamp}`.slice(0, 20),
    email: `${stamp}@example.com`,
    password: "not-a-real-password-1",
    page,
  };
}

async function signUp(member: ReturnType<typeof newMember>, from = "/auth") {
  await member.page.goto(from);
  // Exact, because the submit button is "Create account and continue" and role
  // names match on substring by default - both would answer to "Create account".
  await member.page.getByRole("button", { name: "Create account", exact: true }).click();
  // By label rather than by role: an input[type=password] has no textbox role,
  // so a role query finds three of the four fields and then fails on the one
  // that matters.
  await member.page.getByLabel("Display name").fill(member.name);
  await member.page.getByLabel("Handle").fill(member.handle);
  await member.page.getByLabel("Email").fill(member.email);
  await member.page.getByLabel("Password").fill(member.password);
  await member.page.getByRole("button", { name: "Create account and continue" }).click();
  // Sign-up sends you to onboarding; anything else means it failed and the form
  // is still on screen with its error.
  await expect(member.page).toHaveURL(/\/onboarding/, { timeout: 30_000 });
}

test("signing up creates a session that reaches a members-only route", async ({ page }) => {
  const member = newMember(page);
  await signUp(member);

  // /slip redirects a signed-out visitor to /auth. Staying put is the proof the
  // session survived the redirect out of sign-up.
  await page.goto("/slip");
  await expect(page).toHaveURL(/\/slip$/);
  await expect(page.locator("main")).toBeVisible();
});

test("a member gets a 404 at /admin rather than a locked door", async ({ page }) => {
  const member = newMember(page);
  await signUp(member);

  await page.goto("/admin");
  // A 403 would confirm the page exists. The product's rule is that it must
  // look exactly like a route that was never there.
  await expect(page.getByRole("heading", { name: "That league is off the fixture list." })).toBeVisible();
});

/**
 * The practice lock is the only thing a visitor can do without an account, and
 * the point of it is the offer at the end. This walks it because that offer
 * only exists after two clicks: no amount of reading the served HTML shows it.
 */
test("the practice lock ends by offering the real one", async ({ page }) => {
  await page.goto("/");

  const demo = page.locator("section", {
    has: page.getByRole("heading", { name: "Make a practice lock" }),
  }).first();
  await expect(demo).toBeVisible();

  await demo.getByRole("group", { name: "Who wins this fixture?" }).getByRole("button").first().click();
  await demo.getByRole("button", { name: "Lock this practice call" }).click();

  const offer = demo.getByRole("link", { name: "Make this call for real" });
  await expect(offer).toBeVisible();
  // A league, not a sign-in wall: the league page is public, and the account is
  // asked for at the point of actually locking.
  await expect(offer).toHaveAttribute("href", /^\/leagues\/[a-z0-9-]+$/);

  await expect(demo.getByRole("button", { name: "Try another" })).toBeVisible();
});

/**
 * Signing up used to lose where you were going: the form sent a new account to
 * onboarding and dropped the destination, so somebody who had chosen a team and
 * pressed Lock came back out at whichever league they happened to name during
 * onboarding rather than the one their pick was waiting on.
 */
test("signing up mid-lock keeps the league you were on", async ({ page }) => {
  const member = newMember(page);
  await signUp(member, "/auth?next=%2Fleagues%2Fpremier-league");

  await expect(page).toHaveURL(/\/onboarding\?next=%2Fleagues%2Fpremier-league/);
});
