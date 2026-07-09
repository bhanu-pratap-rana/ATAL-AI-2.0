/**
 * UI responsiveness — every key screen at mobile (375), tablet (768) and
 * desktop (1440) widths must not overflow horizontally, and the primary
 * navigation must be reachable on mobile.
 */
import { test, expect, type Page } from "@playwright/test";
import { STUDENT_STATE, TEACHER_STATE, ADMIN_STATE } from "./helpers/credentials";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 667 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    overflow.scrollWidth,
    `${label}: page must not scroll horizontally (scrollWidth ${overflow.scrollWidth} vs viewport ${overflow.innerWidth})`,
  ).toBeLessThanOrEqual(overflow.innerWidth + 1);
}

const STUDENT_PAGES = [
  "/app/student/dashboard",
  "/app/learn",
  "/app/progress",
  "/app/student/classes",
  "/app/student/assessments",
  "/app/settings",
];

const TEACHER_PAGES = ["/app/teacher/dashboard", "/app/teacher/classes", "/app/teacher/assessments"];
const ADMIN_PAGES = ["/app/admin/dashboard", "/app/admin/schools", "/app/admin/pins"];
const PUBLIC_PAGES = ["/", "/student/start", "/teacher/start", "/admin/login", "/join"];

test.describe("student pages", () => {
  test.use({ storageState: STUDENT_STATE });
  for (const vp of VIEWPORTS) {
    test(`student screens fit ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.setTimeout(180000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of STUDENT_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await assertNoHorizontalOverflow(page, `${path} @${vp.name}`);
        await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      }
      if (vp.name === "mobile") {
        // Bottom navigation must be visible and tappable on mobile.
        await page.goto("/app/student/dashboard");
        await page.waitForLoadState("networkidle");
        const nav = page.locator("nav").last();
        await expect(nav).toBeVisible();
      }
    });
  }
});

test.describe("teacher pages", () => {
  test.use({ storageState: TEACHER_STATE });
  for (const vp of VIEWPORTS) {
    test(`teacher screens fit ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.setTimeout(180000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of TEACHER_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await assertNoHorizontalOverflow(page, `${path} @${vp.name}`);
        await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      }
    });
  }
});

test.describe("admin pages", () => {
  test.use({ storageState: ADMIN_STATE });
  for (const vp of VIEWPORTS) {
    test(`admin screens fit ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.setTimeout(180000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of ADMIN_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await assertNoHorizontalOverflow(page, `${path} @${vp.name}`);
        await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      }
    });
  }
});

test.describe("public pages", () => {
  for (const vp of VIEWPORTS) {
    test(`public screens fit ${vp.name} (${vp.width}px)`, async ({ page }) => {
      test.setTimeout(120000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      for (const path of PUBLIC_PAGES) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        await assertNoHorizontalOverflow(page, `${path} @${vp.name}`);
      }
    });
  }
});
