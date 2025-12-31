import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') })

const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Global setup for authentication
  globalSetup: require.resolve('./tests/global-setup'),

  // Reporter configuration
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(process.env.CI ? [['github', {}] as const] : []),
  ],

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Default timeout for actions
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Timeout for each test
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000,
  },

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /global-setup\.ts/,
    },

    // Student tests - Desktop Chrome with student authentication
    // Assessment tests require student role to access assessment features
    {
      name: 'chromium-student',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/student.json',
      },
      testMatch: [
        '**/assessment*.spec.ts',
        '**/student*.spec.ts',
      ],
      testIgnore: [
        '**/admin*.spec.ts',
        '**/teacher*.spec.ts',
        '**/class*.spec.ts',
      ],
      dependencies: ['setup'],
    },

    // Teacher tests - Desktop Chrome with teacher authentication
    // Teacher and class management tests require teacher role
    {
      name: 'chromium-teacher',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/teacher.json',
      },
      testMatch: [
        '**/teacher*.spec.ts',
        '**/class*.spec.ts',
      ],
      testIgnore: [
        '**/admin*.spec.ts',
        '**/assessment*.spec.ts',
        '**/student*.spec.ts',
      ],
      dependencies: ['setup'],
    },

    // Admin tests - Desktop Chrome with admin authentication
    // Admin-specific features require admin role
    {
      name: 'chromium-admin',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/admin.json',
      },
      testMatch: ['**/admin*.spec.ts'],
      testIgnore: [
        '**/assessment*.spec.ts',
        '**/teacher*.spec.ts',
        '**/student*.spec.ts',
        '**/class*.spec.ts',
      ],
      dependencies: ['setup'],
    },

    // Mobile testing - Teacher context
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'playwright/.auth/teacher.json',
      },
      testMatch: [
        '**/teacher*.spec.ts',
        '**/class*.spec.ts',
      ],
      testIgnore: /admin-.*\.spec\.ts/,
      dependencies: ['setup'],
    },

    // Tablet testing - Teacher context
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
        storageState: 'playwright/.auth/teacher.json',
      },
      testMatch: [
        '**/teacher*.spec.ts',
        '**/class*.spec.ts',
      ],
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120000, // 2 minutes for server startup
  },
})
