/**
 * Simple test runner for screenshot tests
 * Uses existing dev server at localhost:3001
 */
const { execSync } = require('child_process');
const path = require('path');

// Set environment to use port 3001
process.env.PLAYWRIGHT_TEST_BASE_URL = 'http://localhost:3001';

try {
  console.log('Running comprehensive screenshot tests against http://localhost:3001...\n');

  const result = execSync(
    'npx playwright test comprehensive-screenshot-test.spec.ts --project=chromium --reporter=list --config=playwright-no-server.config.ts',
    {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_TEST_BASE_URL: 'http://localhost:3001'
      }
    }
  );
} catch (error) {
  console.log('\nTest run completed with some failures');
  process.exit(error.status || 1);
}
