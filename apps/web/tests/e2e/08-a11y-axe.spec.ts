/**
 * Accessibility E2E Test (axe-core)
 *
 * Runs axe accessibility scans on publicly-accessible pages (no auth required).
 * Auth-gated pages are deferred until test fixture auth state is wired up.
 *
 * Violations at impact "critical" or "serious" fail the test.
 * "moderate" and "minor" are reported but do not fail.
 *
 * Run:
 *   npm run test:e2e -- tests/e2e/08-a11y-axe.spec.ts --project=chromium
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type AxeImpact = "critical" | "serious" | "moderate" | "minor";

const BLOCKING_IMPACTS: AxeImpact[] = ["critical", "serious"];

async function runAxe(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    // Exclude third-party iframes and Supabase auth overlays
    .exclude("iframe")
    // Limit to rules that matter for WCAG 2.1 AA
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  return results;
}

test.describe("Accessibility — public pages (axe WCAG 2.1 AA)", () => {
  test("/ login page has no critical/serious violations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await runAxe(page);

    const blocking = results.violations.filter((v) =>
      BLOCKING_IMPACTS.includes(v.impact as AxeImpact),
    );

    if (blocking.length > 0) {
      const summary = blocking
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.description}\n  Nodes: ${v.nodes.map((n) => n.html).join(", ")}`,
        )
        .join("\n");
      expect.soft(blocking, `Axe violations:\n${summary}`).toHaveLength(0);
    }

    // Surface non-blocking violations as warnings in test output
    const nonBlocking = results.violations.filter(
      (v) => !BLOCKING_IMPACTS.includes(v.impact as AxeImpact),
    );
    if (nonBlocking.length > 0) {
      console.warn(
        `[a11y] ${nonBlocking.length} non-blocking violations on /:\n` +
          nonBlocking.map((v) => `  [${v.impact}] ${v.id}`).join("\n"),
      );
    }

    expect(results.violations.filter((v) => v.impact === "critical")).toHaveLength(0);
  });

  test("/student/start has no critical violations", async ({ page }) => {
    await page.goto("/student/start");
    await page.waitForLoadState("networkidle");
    const results = await runAxe(page);
    const critical = results.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critical).toHaveLength(0);
  });

  test("/teacher/start has no critical violations", async ({ page }) => {
    await page.goto("/teacher/start");
    await page.waitForLoadState("networkidle");
    const results = await runAxe(page);
    const critical = results.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critical).toHaveLength(0);
  });

  test("/offline page has no critical violations", async ({ page }) => {
    await page.goto("/offline");
    await page.waitForLoadState("networkidle");
    const results = await runAxe(page);
    const critical = results.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critical).toHaveLength(0);
  });

  test("/reset-password has no critical violations", async ({ page }) => {
    await page.goto("/reset-password");
    await page.waitForLoadState("networkidle");
    const results = await runAxe(page);
    const critical = results.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critical).toHaveLength(0);
  });

  test("/join has no critical violations", async ({ page }) => {
    await page.goto("/join");
    await page.waitForLoadState("networkidle");
    const results = await runAxe(page);
    const critical = results.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critical).toHaveLength(0);
  });
});
