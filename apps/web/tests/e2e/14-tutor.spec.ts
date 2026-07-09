/**
 * AI Tutor plumbing — send a message, receive a streamed response.
 * (Answer QUALITY is a manual test; this verifies the pipeline works.)
 */
import { test, expect } from "@playwright/test";
import { STUDENT_STATE } from "./helpers/credentials";

test.use({ storageState: STUDENT_STATE });

test("tutor responds to a text question", async ({ page }) => {
  test.setTimeout(120000);
  await page.goto("/app/ai-tools/tutor");
  await page.waitForLoadState("networkidle");

  const input = page.getByPlaceholder(/ask a question/i);
  await expect(input).toBeVisible({ timeout: 20000 });
  await input.fill("What is a computer? Answer in one short sentence.");
  await input.press("Enter");

  // Our message appears immediately…
  await expect(page.getByText("What is a computer? Answer in one short sentence.")).toBeVisible();

  // …and an assistant response arrives (LLM latency — generous timeout).
  await expect
    .poll(
      async () => {
        const text = await page.locator("body").innerText();
        // Response present when body grew beyond our prompt with tutor content
        const afterPrompt = text.split("What is a computer? Answer in one short sentence.").pop() ?? "";
        return afterPrompt.replace(/\s+/g, " ").trim().length;
      },
      { timeout: 90000, intervals: [2000] },
    )
    .toBeGreaterThan(40);

  await expect(page.getByText(/something went wrong|failed to/i)).toHaveCount(0);
});
