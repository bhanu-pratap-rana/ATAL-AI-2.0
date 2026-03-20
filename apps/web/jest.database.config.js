/**
 * Jest Configuration — Database Integration Tests
 *
 * IMPORTANT: These tests require a live Supabase (PostgreSQL) connection.
 * They are intentionally separated from the unit-test run (jest.config.js)
 * so that CI can run unit tests without database credentials.
 *
 * Prerequisites before running:
 *   1. Copy .env.local.example to .env.local
 *   2. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *   3. Ensure the test database is seeded (migrations applied)
 *
 * Run:
 *   npm run test:database           # all DB tests
 *   npm run test:database:rpc       # RPC tests only
 *   npm run test:database:rls       # Row-Level Security tests only
 *   npm run test:database:load      # Load / performance tests only
 */

/** @type {import('jest').Config} */
const config = {
  // Node environment — no DOM needed for database queries
  testEnvironment: "node",

  // Pick up only database test files
  testMatch: [
    "<rootDir>/__tests__/database/**/*.{test,spec}.{ts,js}",
  ],

  // TypeScript via ts-jest (no Next.js transforms needed for DB tests)
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          // Relax settings for test files
          strict: false,
          esModuleInterop: true,
        },
      },
    ],
  },

  // Longer timeout for DB round-trips
  testTimeout: 30000,

  // Module aliases mirror tsconfig paths
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Run tests serially to avoid transaction conflicts
  maxWorkers: 1,

  // Load env vars from .env.local
  setupFiles: ["<rootDir>/jest.database.setup.js"],
};

module.exports = config;
