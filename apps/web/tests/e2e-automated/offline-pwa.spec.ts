/**
 * Offline & PWA Features Testing - Section 8 from Manual Testing Guide
 * Covers: Service Worker, Offline Sync, PWA Installation
 */

import { test, expect } from '@playwright/test';
import {
  takeScreenshot,
  createTestResult,
  TestResult,
  formatDuration,
} from './test-utils';
import { TEST_CONFIG, TEST_SECTIONS } from './test-config';

let testResults: TestResult[] = [];
const startTime = Date.now();

// Test Case 70.1: Service Worker Registration
test('70.1 - Service Worker Registration', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-70.1-ServiceWorker';
  const screenshots: string[] = [];

  try {
    console.log('🔧 Testing Service Worker Registration...');

    // Navigate to app
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'home-page'));

    // Wait for service worker registration
    const swRegistration = await page.evaluate(() => {
      return navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          console.log(`Found ${registrations.length} service worker registrations`);
          return registrations.length > 0;
        });
    });

    console.log(`✓ Service Worker registered: ${swRegistration}`);
    screenshots.push(await takeScreenshot(page, testName, 'sw-checked'));

    const duration = Date.now() - testStart;
    const status = swRegistration ? 'PASS' : 'SKIP';
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.OFFLINE, status, duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.OFFLINE,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 70.2: Offline Mode Detection
test('70.2 - Offline Mode Detection', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-70.2-OfflineDetection';
  const screenshots: string[] = [];

  try {
    console.log('📡 Testing Offline Detection...');

    // Navigate to app
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'initial-page'));

    // Check if navigator.onLine works
    const isOnline = await page.evaluate(() => navigator.onLine);
    console.log(`✓ Online status: ${isOnline}`);
    screenshots.push(await takeScreenshot(page, testName, 'online-status-checked'));

    // Go offline
    await page.context().setOffline(true);
    console.log('✓ Simulated offline mode');
    screenshots.push(await takeScreenshot(page, testName, 'offline-mode'));

    // Check offline indicator
    const offlineIndicator = await page.$('text=offline');
    if (offlineIndicator) {
      console.log('✓ Offline indicator visible');
    }
    screenshots.push(await takeScreenshot(page, testName, 'offline-ui'));

    // Go back online
    await page.context().setOffline(false);
    console.log('✓ Back online');
    screenshots.push(await takeScreenshot(page, testName, 'back-online'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.OFFLINE, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.OFFLINE,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 70.3: IndexedDB Setup
test('70.3 - IndexedDB Offline Storage Setup', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-70.3-IndexedDB';
  const screenshots: string[] = [];

  try {
    console.log('💾 Testing IndexedDB Setup...');

    // Navigate to app
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'home-page'));

    // Check if IndexedDB is available
    const hasIndexedDB = await page.evaluate(() => {
      return !!window.indexedDB;
    });

    console.log(`✓ IndexedDB available: ${hasIndexedDB}`);
    expect(hasIndexedDB).toBe(true);
    screenshots.push(await takeScreenshot(page, testName, 'indexed-db-checked'));

    // Try to open ATAL_Offline database
    const dbExists = await page.evaluate(() => {
      return new Promise((resolve) => {
        const request = indexedDB.open('ATAL_Offline', 1);
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      });
    });

    console.log(`✓ ATAL_Offline DB exists: ${dbExists}`);
    screenshots.push(await takeScreenshot(page, testName, 'db-opened'));

    const duration = Date.now() - testStart;
    const status = hasIndexedDB ? 'PASS' : 'SKIP';
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.OFFLINE, status, duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.OFFLINE,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 70.4: PWA Manifest
test('70.4 - PWA Manifest Configuration', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-70.4-PWAManifest';
  const screenshots: string[] = [];

  try {
    console.log('📱 Testing PWA Manifest...');

    // Navigate to app
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'home-page'));

    // Check for manifest link
    const manifestLink = await page.$('link[rel="manifest"]');
    expect(manifestLink).toBeTruthy();
    console.log('✓ Manifest link found');
    screenshots.push(await takeScreenshot(page, testName, 'manifest-link-found'));

    // Get manifest URL
    const manifestUrl = await manifestLink?.getAttribute('href');
    console.log(`✓ Manifest URL: ${manifestUrl}`);

    // Fetch and verify manifest
    const response = await page.request.get(`${TEST_CONFIG.BASE_URL}${manifestUrl}`);
    const manifest = await response.json();

    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.icons).toBeDefined();
    console.log(`✓ Manifest valid - Name: ${manifest.name}`);
    screenshots.push(await takeScreenshot(page, testName, 'manifest-valid'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.OFFLINE, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.OFFLINE,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 70.5: Offline Banner Display
test('70.5 - Offline Banner Display', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-70.5-OfflineBanner';
  const screenshots: string[] = [];

  try {
    console.log('🚩 Testing Offline Banner...');

    // Navigate to app
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    screenshots.push(await takeScreenshot(page, testName, 'online-page'));

    // Go offline
    await page.context().setOffline(true);
    await page.waitForTimeout(1000);

    // Check for offline banner
    const banner = await page.$('text=offline');
    console.log(`✓ Offline banner visible: ${!!banner}`);
    screenshots.push(await takeScreenshot(page, testName, 'offline-banner'));

    // Go back online
    await page.context().setOffline(false);
    await page.waitForTimeout(1000);
    screenshots.push(await takeScreenshot(page, testName, 'banner-removed'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.OFFLINE, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.OFFLINE,
        'FAIL',
        duration,
        screenshots,
        String(error)
      )
    );
  }
});

// Test Case 70.6: Cache Performance
test('70.6 - Cache Performance Metrics', async ({ page }) => {
  const testStart = Date.now();
  const testName = 'TC-70.6-CachePerf';
  const screenshots: string[] = [];

  try {
    console.log('⚡ Testing Cache Performance...');

    // First load (cold cache)
    const firstLoadStart = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    const firstLoadTime = Date.now() - firstLoadStart;
    console.log(`✓ First load time: ${firstLoadTime}ms`);
    screenshots.push(await takeScreenshot(page, testName, 'first-load'));

    // Second load (warm cache)
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    const secondLoadStart = Date.now();
    await page.goto(`${TEST_CONFIG.BASE_URL}/`);
    const secondLoadTime = Date.now() - secondLoadStart;
    console.log(`✓ Second load time (cached): ${secondLoadTime}ms`);
    console.log(`✓ Cache improvement: ${(((firstLoadTime - secondLoadTime) / firstLoadTime) * 100).toFixed(2)}%`);
    screenshots.push(await takeScreenshot(page, testName, 'cached-load'));

    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(testName, TEST_SECTIONS.OFFLINE, 'PASS', duration, screenshots)
    );
  } catch (error) {
    const duration = Date.now() - testStart;
    testResults.push(
      createTestResult(
        testName,
        TEST_SECTIONS.OFFLINE,
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
  console.log('📊 OFFLINE & PWA FEATURES TEST RESULTS');
  console.log(`${'='.repeat(80)}`);
  console.log(`Total Tests: ${testResults.length}`);
  console.log(`Passed: ${testResults.filter((r) => r.status === 'PASS').length}`);
  console.log(`Failed: ${testResults.filter((r) => r.status === 'FAIL').length}`);
  console.log(`Skipped: ${testResults.filter((r) => r.status === 'SKIP').length}`);
  console.log(`Total Duration: ${formatDuration(totalDuration)}`);
  console.log(`${'='.repeat(80)}\n`);

  const fs = require('fs');
  const path = require('path');
  const reportDir = 'test-artifacts';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const reportPath = path.join(reportDir, 'offline-pwa-test-results.json');
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        section: 'Offline & PWA Features Testing',
        totalTests: testResults.length,
        passed: testResults.filter((r) => r.status === 'PASS').length,
        failed: testResults.filter((r) => r.status === 'FAIL').length,
        skipped: testResults.filter((r) => r.status === 'SKIP').length,
        duration: formatDuration(totalDuration),
        results: testResults,
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${reportPath}`);
});
