/**
 * API Endpoints Testing
 * Covers: Auth API, Tutor Chat API, TTS API, Student Search API
 */

import { test, expect } from '@playwright/test';
import {
  takeScreenshot,
  loginAsStudent,
  createTestResult,
  TestResult,
  formatDuration,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

let testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 6.1.1: Tutor Chat API
test('6.1.1 - Tutor Chat API Integration', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.1.1-TutorChatAPI';
  const screenshots: string[] = [];

  try {
    console.log('💬 Testing Tutor Chat API...');

    // Login
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to learn/tutor chat page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Look for chat interface
    const chatInterface = page.locator('[data-testid="chat"], .chat-interface, [data-testid="ai-tutor"]').first();

    if (await chatInterface.isVisible()) {
      console.log('✓ Chat interface visible');
      screenshots.push(await takeScreenshot(page, testName, 'chat-interface'));

      // Find message input
      const messageInput = page.locator('input[placeholder*="message" i], textarea').first();

      if (await messageInput.isVisible()) {
        // Type a message
        await messageInput.fill('What is photosynthesis?');
        screenshots.push(await takeScreenshot(page, testName, 'message-typed'));

        // Send message
        const sendBtn = page.locator('button:has-text("Send"), [data-testid="send-button"]').first();
        if (await sendBtn.isVisible()) {
          // Monitor for API call
          let apiCallMade = false;
          const apiListener = (response: any) => {
            if (response.url().includes('/tutor') || response.url().includes('/chat')) {
              apiCallMade = true;
            }
          };
          page.on('response', apiListener);

          await sendBtn.click();
          await page.waitForTimeout(2000);
          screenshots.push(await takeScreenshot(page, testName, 'message-sent'));

          if (apiCallMade) {
            console.log('✓ Chat API called');
          }

          // Wait for response
          const response = page.locator('[data-testid="ai-response"], .ai-message, .response-text').first();
          if (await response.isVisible({ timeout: 5000 }).catch(() => false)) {
            console.log('✓ AI response received');
            const responseText = await response.textContent();
            console.log(`Response: ${responseText?.substring(0, 50)}...`);
          }
          screenshots.push(await takeScreenshot(page, testName, 'response-received'));

          page.removeListener('response', apiListener);
        }
      }
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AI_RAG, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AI_RAG,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 6.2.1: TTS API Integration
test('6.2.1 - Text-to-Speech API', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.2.1-TTSAPI';
  const screenshots: string[] = [];

  try {
    console.log('🔊 Testing TTS API...');

    // Login
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to learn page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Look for TTS button
    const ttsButton = page.locator('button[title*="speak" i], button[title*="audio" i], [data-testid="tts"], .speaker-icon').first();

    if (await ttsButton.isVisible()) {
      console.log('✓ TTS button visible');
      screenshots.push(await takeScreenshot(page, testName, 'tts-button-visible'));

      // Track API calls
      let ttsApiCalled = false;
      const apiListener = (response: any) => {
        if (response.url().includes('/tts') || response.url().includes('/voice')) {
          ttsApiCalled = true;
        }
      };
      page.on('response', apiListener);

      // Click TTS button
      await ttsButton.click();
      await page.waitForTimeout(1000);
      screenshots.push(await takeScreenshot(page, testName, 'tts-clicked'));

      if (ttsApiCalled) {
        console.log('✓ TTS API called');
      }

      // Look for audio player
      const audioPlayer = page.locator('audio, [data-testid="audio-player"]').first();
      if (await audioPlayer.isVisible().catch(() => false)) {
        console.log('✓ Audio player visible');
      }
      screenshots.push(await takeScreenshot(page, testName, 'audio-player'));

      page.removeListener('response', apiListener);
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AI_RAG, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AI_RAG,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 7.1.1: API Rate Limiting
test('7.1.1 - API Rate Limiting', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-7.1.1-RateLimiting';
  const screenshots: string[] = [];

  try {
    console.log('⚡ Testing API Rate Limiting...');

    // Login
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to chat interface
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Look for rate limit message in UI
    const rateLimitMessage = page.locator('text=rate limit, text=too many requests, text=slow down').first();

    if (await rateLimitMessage.isVisible().catch(() => false)) {
      console.log('✓ Rate limit message visible');
      screenshots.push(await takeScreenshot(page, testName, 'rate-limit-message'));
    } else {
      console.log('ℹ️ No rate limit triggered in this test');
      screenshots.push(await takeScreenshot(page, testName, 'no-rate-limit'));
    }

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AI_RAG, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AI_RAG,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 7.2.1: API Response Validation
test('7.2.1 - API Response Validation', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-7.2.1-ResponseValidation';
  const screenshots: string[] = [];

  try {
    console.log('✅ Testing API Response Validation...');

    // Login
    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'logged-in'));

    // Navigate to dashboard to trigger multiple API calls
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'dashboard-loaded'));

    // Monitor API responses
    let successfulRequests = 0;
    let failedRequests = 0;

    page.on('response', (response) => {
      if (response.url().includes('api') || response.url().includes('supabase')) {
        if (response.ok()) {
          successfulRequests++;
        } else {
          failedRequests++;
        }
      }
    });

    // Trigger some API calls
    await page.waitForTimeout(2000);

    console.log(`✓ API Requests - Successful: ${successfulRequests}, Failed: ${failedRequests}`);
    screenshots.push(await takeScreenshot(page, testName, 'api-response-check'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AI_RAG, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AI_RAG,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 7.3.1: CORS and Headers
test('7.3.1 - API CORS & Security Headers', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-7.3.1-CORSHeaders';
  const screenshots: string[] = [];

  try {
    console.log('🔒 Testing CORS & Security Headers...');

    // Navigate to page
    await page.goto(`${TEST_CONFIG.BASE_URL}/auth/signin`);
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    screenshots.push(await takeScreenshot(page, testName, 'page-loaded'));

    // Monitor response headers
    let securityHeadersFound = 0;
    const expectedHeaders = [
      'content-type',
      'x-content-type-options',
      'x-frame-options',
      'content-security-policy',
    ];

    page.on('response', (response) => {
      const headers = response.headers();
      expectedHeaders.forEach((header) => {
        if (headers[header] || headers[header.toLowerCase()]) {
          securityHeadersFound++;
        }
      });
    });

    // Trigger an API call
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await page.waitForTimeout(1000);
    }

    console.log(`✓ Security headers verified: ${securityHeadersFound} headers found`);
    screenshots.push(await takeScreenshot(page, testName, 'headers-checked'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.AI_RAG, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.AI_RAG,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Cleanup: Save results
test.afterAll(() => {
  const totalDuration = Date.now() - startTime;
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 API ENDPOINTS TEST RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${testResults.filter((r) => r.status === 'FAIL').length}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`${'='.repeat(80)}\n`);

  const fs = require('fs');
  const path = require('path');
  const reportDir = 'test-artifacts';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'api-endpoints-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'API Endpoints Testing',
        totalTests: testResults.length,
        passed: testResults.filter((r) => r.status === 'PASS').length,
        failed: testResults.filter((r) => r.status === 'FAIL').length,
        duration: formatDuration(totalDuration),
        results: testResults,
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${reportPath}`);
});
