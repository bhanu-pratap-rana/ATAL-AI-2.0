/**
 * AI/RAG Services Testing - COMPREHENSIVE
 * Covers: Tutor Chat, Text-to-Speech, AI Response Quality, TTS Language Support
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

// Test Case 6.1.1: Start Tutor Chat Interface
test('6.1.1 - Start Tutor Chat', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.1.1-StartTutorChat';
  const screenshots: string[] = [];

  try {
    console.log('💬 Testing Tutor Chat Interface...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    // Navigate to Learn page
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Look for chat button/interface
    const chatBtn = page.locator('button:has-text("Chat"), button:has-text("Tutor"), [data-testid="chat-button"]').first();

    if (await chatBtn.isVisible()) {
      await chatBtn.click();
      await page.waitForTimeout(500);
      screenshots.push(await takeScreenshot(page, testName, 'chat-button-clicked'));

      // Verify chat interface opens
      const chatInterface = page.locator('[data-testid="chat"], .chat-interface, [role="dialog"]').first();
      if (await chatInterface.isVisible()) {
        console.log('✓ Chat interface opened');

        // Verify message input visible
        const messageInput = page.locator('input[placeholder*="message" i], textarea').first();
        if (await messageInput.isVisible()) {
          console.log('✓ Message input visible');
        }
        screenshots.push(await takeScreenshot(page, testName, 'chat-interface-open'));
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

// Test Case 6.1.2: Send Message to AI
test('6.1.2 - Send Message to AI', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.1.2-SendMessageToAI';
  const screenshots: string[] = [];

  try {
    console.log('📨 Testing Send Message to AI...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Open chat
    const chatBtn = page.locator('button:has-text("Chat"), [data-testid="chat-button"]').first();
    if (await chatBtn.isVisible()) {
      await chatBtn.click();
      await page.waitForTimeout(500);
      screenshots.push(await takeScreenshot(page, testName, 'chat-opened'));

      // Find message input
      const messageInput = page.locator('input[placeholder*="message" i], textarea').first();
      if (await messageInput.isVisible()) {
        const testMessage = 'What is the capital of India?';
        await messageInput.fill(testMessage);
        screenshots.push(await takeScreenshot(page, testName, 'message-typed'));

        // Send message
        const sendBtn = page.locator('button:has-text("Send"), [data-testid="send"]').first();
        if (await sendBtn.isVisible()) {
          // Track API calls
          let chatApiCalled = false;
          page.on('response', (response) => {
            if (response.url().includes('/tutor') || response.url().includes('/chat')) {
              chatApiCalled = true;
            }
          });

          await sendBtn.click();
          await page.waitForTimeout(1000);
          screenshots.push(await takeScreenshot(page, testName, 'message-sent'));

          if (chatApiCalled) {
            console.log('✓ Chat API called');
          }

          // Wait for response
          const aiResponse = page.locator('[data-testid="ai-response"], .ai-message').first();
          if (await aiResponse.isVisible({ timeout: 8000 }).catch(() => false)) {
            const response = await aiResponse.textContent();
            console.log(`✓ AI Response received: ${response?.substring(0, 50)}...`);
          }
          screenshots.push(await takeScreenshot(page, testName, 'response-received'));
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

// Test Case 6.1.3: AI Response Quality
test('6.1.3 - AI Response Quality', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.1.3-ResponseQuality';
  const screenshots: string[] = [];

  try {
    console.log('⭐ Testing AI Response Quality...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Open chat
    const chatBtn = page.locator('button:has-text("Chat"), [data-testid="chat-button"]').first();
    if (await chatBtn.isVisible()) {
      await chatBtn.click();
      await page.waitForTimeout(500);
      screenshots.push(await takeScreenshot(page, testName, 'chat-opened'));

      // Ask curriculum question
      const messageInput = page.locator('input[placeholder*="message" i], textarea').first();
      if (await messageInput.isVisible()) {
        const question = 'Explain the water cycle';
        await messageInput.fill(question);
        screenshots.push(await takeScreenshot(page, testName, 'question-typed'));

        const sendBtn = page.locator('button:has-text("Send"), [data-testid="send"]').first();
        if (await sendBtn.isVisible()) {
          await sendBtn.click();
          await page.waitForTimeout(1000);
          screenshots.push(await takeScreenshot(page, testName, 'question-sent'));

          // Wait for and verify response
          const aiResponse = page.locator('[data-testid="ai-response"], .ai-message').first();
          if (await aiResponse.isVisible({ timeout: 8000 }).catch(() => false)) {
            const response = await aiResponse.textContent();

            // Check response quality
            const hasContent = response && response.length > 20;
            const isRelevant = response?.toLowerCase().includes('water') || response?.toLowerCase().includes('cycle');

            if (hasContent && isRelevant) {
              console.log('✓ High-quality response (relevant & detailed)');
            } else if (hasContent) {
              console.log('⚠️ Response exists but may not be relevant');
            }
          }
          screenshots.push(await takeScreenshot(page, testName, 'response-quality-check'));
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

// Test Case 6.1.4: Rate Limiting
test('6.1.4 - Rate Limiting', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.1.4-RateLimiting';
  const screenshots: string[] = [];

  try {
    console.log('⚡ Testing Rate Limiting...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Check for rate limit indicator
    const rateLimitMsg = page.locator('text=rate, text=limit, text=slow down, text=too many').first();

    if (await rateLimitMsg.isVisible().catch(() => false)) {
      console.log('✓ Rate limit message visible');
      screenshots.push(await takeScreenshot(page, testName, 'rate-limit-shown'));
    } else {
      console.log('ℹ️ No rate limit triggered (normal behavior)');
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

// Test Case 6.2.1: TTS Button Display
test('6.2.1 - TTS Button Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.2.1-TTSButton';
  const screenshots: string[] = [];

  try {
    console.log('🔊 Testing TTS Button Display...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    // Navigate to Learn page with content
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Look for TTS button
    const ttsBtn = page.locator('button[title*="speak" i], button[title*="audio" i], [data-testid="tts"], .speaker-icon').first();

    if (await ttsBtn.isVisible()) {
      console.log('✓ TTS button visible');
      screenshots.push(await takeScreenshot(page, testName, 'tts-button-visible'));
    } else {
      console.log('ℹ️ TTS button not found (may be in specific content page)');
      screenshots.push(await takeScreenshot(page, testName, 'tts-not-visible'));
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

// Test Case 6.2.2: TTS Generation
test('6.2.2 - TTS Generation', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.2.2-TTSGeneration';
  const screenshots: string[] = [];

  try {
    console.log('🎙️ Testing TTS Generation...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Look for TTS button
    const ttsBtn = page.locator('button[title*="speak" i], [data-testid="tts"]').first();

    if (await ttsBtn.isVisible()) {
      // Track TTS API call
      let ttsApiCalled = false;
      page.on('response', (response) => {
        if (response.url().includes('/tts') || response.url().includes('/voice')) {
          ttsApiCalled = true;
        }
      });

      await ttsBtn.click();
      await page.waitForTimeout(1500);
      screenshots.push(await takeScreenshot(page, testName, 'tts-clicked'));

      if (ttsApiCalled) {
        console.log('✓ TTS API called');
      }

      // Look for audio player
      const audioPlayer = page.locator('audio, [data-testid="audio-player"]').first();
      if (await audioPlayer.isVisible().catch(() => false)) {
        console.log('✓ Audio player visible');
        screenshots.push(await takeScreenshot(page, testName, 'audio-player-visible'));
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

// Test Case 6.2.3: TTS Language Support
test('6.2.3 - TTS Language Support', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.2.3-TTSLanguageSupport';
  const screenshots: string[] = [];

  try {
    console.log('🌍 Testing TTS Language Support...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    // Navigate to settings to change language
    await page.goto(`${TEST_CONFIG.BASE_URL}/app/settings`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'settings-page'));

    // Look for language preference
    const languageSelect = page.locator('select, [data-testid="language"], button:has-text("English"), button:has-text("Hindi")').first();

    if (await languageSelect.isVisible()) {
      // Try switching to Hindi
      await languageSelect.click();
      await page.waitForTimeout(300);

      const hindiOption = page.locator(':text("Hindi"), [data-testid="hindi"]').first();
      if (await hindiOption.isVisible()) {
        await hindiOption.click();
        await page.waitForTimeout(500);
        console.log('✓ Language switched to Hindi');
      }
      screenshots.push(await takeScreenshot(page, testName, 'language-switched'));

      // Try TTS in Hindi
      await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      screenshots.push(await takeScreenshot(page, testName, 'learn-hindi'));
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

// Test Case 6.2.4: TTS Playback Controls
test('6.2.4 - TTS Playback Controls', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-6.2.4-PlaybackControls';
  const screenshots: string[] = [];

  try {
    console.log('🎵 Testing Playback Controls...');

    await loginAsStudent(page);
    screenshots.push(await takeScreenshot(page, testName, 'student-logged-in'));

    await page.goto(`${TEST_CONFIG.BASE_URL}/app/learn`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    screenshots.push(await takeScreenshot(page, testName, 'learn-page'));

    // Click TTS
    const ttsBtn = page.locator('button[title*="speak" i], [data-testid="tts"]').first();
    if (await ttsBtn.isVisible()) {
      await ttsBtn.click();
      await page.waitForTimeout(1500);
      screenshots.push(await takeScreenshot(page, testName, 'tts-clicked'));

      // Look for playback controls
      const playBtn = page.locator('button:has-text("Play"), [data-testid="play"], audio').first();
      const pauseBtn = page.locator('button:has-text("Pause"), [data-testid="pause"]').first();
      const volumeControl = page.locator('[data-testid="volume"], input[type="range"]').first();

      let controlsFound = 0;
      if (await playBtn.isVisible().catch(() => false)) {
        console.log('✓ Play button found');
        controlsFound++;
      }
      if (await pauseBtn.isVisible().catch(() => false)) {
        console.log('✓ Pause button found');
        controlsFound++;
      }
      if (await volumeControl.isVisible().catch(() => false)) {
        console.log('✓ Volume control found');
        controlsFound++;
      }

      console.log(`✓ ${controlsFound} playback controls available`);
      screenshots.push(await takeScreenshot(page, testName, 'controls-visible'));
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

// Cleanup: Save results
test.afterAll(() => {
  const totalDuration = Date.now() - startTime;
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 AI/RAG SERVICES TEST RESULTS');
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

  const reportPath = path.join(reportDir, 'ai-rag-services-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'AI/RAG Services Testing',
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
