/**
 * Jest Configuration — Unit & Integration Tests
 *
 * Uses next/jest for Next.js-aware transforms:
 * - SWC compiler (faster than ts-jest for most files)
 * - Automatic module alias resolution from tsconfig paths (@/*)
 * - CSS / image module mocking
 *
 * DB tests use a separate config (jest.database.config.js) so they
 * can run against a real Supabase instance and be excluded from CI
 * unit-test runs.
 */

const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Path to the Next.js app root (where next.config.ts lives)
  dir: "./",
});

/** @type {import('jest').Config} */
const customConfig = {
  // jsdom for React component tests; pure-Node tests override inline
  testEnvironment: "jest-environment-jsdom",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Only pick up files in __tests__/ — keeps test:database separate
  testMatch: [
    "<rootDir>/__tests__/**/*.{test,spec}.{ts,tsx}",
  ],

  // Exclude database tests (run via jest.database.config.js) and e2e
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "<rootDir>/__tests__/database/",
    "<rootDir>/tests/",
  ],

  // Module aliases mirror tsconfig paths
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Collect coverage only from app source (not config/test files)
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/app/layout.tsx",
    "!src/app/globals.css",
  ],

  coverageThreshold: {
    global: {
      lines: 50,
    },
  },
};

module.exports = createJestConfig(customConfig);
