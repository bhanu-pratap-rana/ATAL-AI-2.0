/**
 * Assessment (IRT) — list page, full start → answer → submit → summary run.
 *
 * NOTE: submits a real assessment session as the demo student each run.
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

test("assessments page lists history and a start entry point", async ({ page }) => {
  await page.goto("/app/student/assessments");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Start a New Assessment/i)).toBeVisible({ timeout: 20000 });
  await expect(page.locator('a[href="/app/assessment/start"]').first()).toBeVisible();
});

test("full assessment run: start → answer all → summary", async ({ page }) => {
  test.setTimeout(300000);
  await page.goto("/app/assessment/start");
  await page.waitForLoadState("networkidle");

  // Some flows show an intro/start screen before the first question.
  const startBtn = page.getByRole("button", { name: /start|begin/i }).first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
  }

  // Answer questions until the runner finishes (bounded loop).
  const summaryMarker = page.getByText(/Retake Assessment|Your Skill Level|Ready to Learn/i).first();
  for (let i = 0; i < 40; i++) {
    // Finished? The summary renders "Your Skill Level" / "Retake Assessment".
    if (/assessment\/summary|assessments\//.test(page.url())) break;
    if (await summaryMarker.isVisible().catch(() => false)) break;

    const radios = page.locator('input[type="radio"]:enabled');
    if ((await radios.count()) === 0) {
      // Question loading or submit in flight — poll again shortly.
      await page.waitForTimeout(1500);
      continue;
    }

    // Pick the first option, then advance. Per-action timeouts keep a
    // transient disabled state from eating the whole test timeout.
    try {
      await radios.first().check({ force: true, timeout: 5000 });
      // The advance control is "Submit answer and go to next question" on
      // regular questions and a final submit on the last one. Do NOT match
      // the "Next questions" pagination widget.
      const next = page
        .getByRole("button", { name: /submit answer|submit assessment|finish/i })
        .first();
      await next.click({ timeout: 8000 });
    } catch {
      // UI mid-transition (submitting / advancing) — re-evaluate state.
    }
    await page.waitForTimeout(1000);
  }

  // Submission triggers a redirect to the summary — wait for either the
  // summary URL or its content markers before asserting (racing the
  // redirect makes the body-text check flaky).
  await expect
    .poll(
      async () => {
        if (/assessment\/summary|assessments\//.test(page.url())) return true;
        if (await summaryMarker.isVisible().catch(() => false)) return true;
        const body = await page.locator("body").innerText().catch(() => "");
        return /assessment completed|your skill level|score/i.test(body);
      },
      { timeout: 60000, intervals: [2000] },
    )
    .toBe(true);

  await page.waitForLoadState("networkidle");
  const body = await page.locator("body").innerText();
  expect(body).toMatch(/%|score|correct|skill level|completed/i);
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});
