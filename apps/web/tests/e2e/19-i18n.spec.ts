/**
 * i18n — switch EN → हिंदी → অসমীয়া via the header language selector and
 * assert the navigation labels re-render in the selected language.
 *
 * Anchors on the bottom-nav "Learn" label (nav.learn: Learn / सीखें / শিকক)
 * rather than whole-body script detection — lesson content is legitimately
 * multilingual regardless of UI language.
 */
import { test, expect, type Page } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

const NAV_LEARN = { en: "learn", hi: "सीखें", as: "শিকক" } as const;

async function navText(page: Page): Promise<string> {
  // Nav labels are CSS-uppercased in English — compare case-insensitively.
  return (await page.locator("nav").last().innerText()).toLowerCase();
}

test("language selector switches nav labels to Hindi, Assamese, and back", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");

  const selector = page.getByRole("combobox", { name: /select language/i }).first();
  await expect(selector).toBeVisible({ timeout: 20000 });

  // English baseline.
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.en);

  // Hindi
  await selector.selectOption({ index: 1 });
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.hi);

  // Assamese
  await selector.selectOption({ index: 2 });
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.as);

  // Back to English (leave the account tidy).
  await selector.selectOption({ index: 0 });
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.en);
});

test("language preference persists across navigation", async ({ page }) => {
  await page.goto("/app/student/dashboard");
  await page.waitForLoadState("networkidle");
  const selector = page.getByRole("combobox", { name: /select language/i }).first();
  await selector.selectOption({ index: 1 });
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.hi);

  // Navigate elsewhere — the Hindi UI must survive the route change.
  await page.goto("/app/learn");
  await page.waitForLoadState("networkidle");
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.hi);

  // Restore English.
  await page.getByRole("combobox", { name: /select language/i }).first().selectOption({ index: 0 });
  await expect.poll(() => navText(page), { timeout: 15000 }).toContain(NAV_LEARN.en);
});
