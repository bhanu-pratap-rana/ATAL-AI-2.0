import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration
 *
 * Test Categories:
 * - Smoke tests: Basic functionality
 * - Flow tests: Complete user journeys
 * - Comprehensive: Full feature coverage
 */

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Logs in the demo accounts through the real UI and saves storage
    // states; every role-scoped project depends on it.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },

    // Desktop browsers
    {
      name: "chromium",
      // Regenerates tests/.auth/*.json before every run — the sign-out
      // spec revokes the demo sessions, so states go stale between runs.
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // Mobile browsers
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },

    // Role-specific projects for flow tests
    {
      name: "chromium-teacher",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./tests/.auth/teacher.json",
      },
    },
    {
      name: "chromium-student",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./tests/.auth/student.json",
      },
    },
    {
      name: "chromium-admin",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "./tests/.auth/admin.json",
      },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
