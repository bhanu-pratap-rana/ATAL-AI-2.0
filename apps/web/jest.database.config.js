// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Jest configuration for database tests (RPC, RLS, etc.)
// Uses Node.js environment instead of jsdom for server-side testing
const customJestConfig = {
  displayName: 'database',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/jest.database.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Only run database tests
  testMatch: ['**/__tests__/database/**/*.test.ts', '**/__tests__/database/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/src/__tests__/components/',
    '<rootDir>/src/__tests__/hooks/',
  ],
  moduleDirectories: ['node_modules', '<rootDir>/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
  // Longer timeout for database operations and RPC calls
  testTimeout: 30000,
  // Verbose output for debugging
  verbose: true,
  // Setup environment variables for testing
  setupFiles: ['<rootDir>/jest.database.env.js'],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
