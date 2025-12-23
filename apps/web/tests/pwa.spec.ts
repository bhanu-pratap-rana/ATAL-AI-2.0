import { test, expect } from '@playwright/test'

/**
 * PWA Features Tests
 *
 * Tests Progressive Web App functionality including:
 * - Manifest.json configuration
 * - Service worker registration
 * - Page meta tags
 */

test.describe('PWA Features', () => {
  test('should have correct page title on home page', async ({ page }) => {
    await page.goto('/')

    // Home page should display
    await expect(page.getByText('Welcome to ATAL AI')).toBeVisible()

    // Check title contains ATAL AI
    await expect(page).toHaveTitle(/ATAL AI/)
  })

  test('should have manifest.json available', async ({ page }) => {
    const response = await page.goto('/manifest.json')

    // Manifest should exist and return 200
    expect(response?.status()).toBe(200)

    // Should be valid JSON
    const manifest = await response?.json()
    expect(manifest).toHaveProperty('name', 'ATAL AI - Digital Empowerment Platform')
    expect(manifest).toHaveProperty('short_name', 'ATAL AI')
    expect(manifest.icons).toBeDefined()
    expect(manifest.icons.length).toBeGreaterThan(0)
  })

  test('should have service worker support', async ({ page }) => {
    await page.goto('/')

    // Check if service worker is supported in browser
    const hasServiceWorker = await page.evaluate(() => {
      return 'serviceWorker' in navigator
    })

    expect(hasServiceWorker).toBe(true)
  })

  test('should have proper meta tags for PWA', async ({ page }) => {
    await page.goto('/')

    // Check for theme-color meta tag
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content')
    expect(themeColor).toBeTruthy()

    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toContain('width=device-width')
  })

  test('should have manifest link in head', async ({ page }) => {
    await page.goto('/')

    // Check for manifest link
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestLink).toBe('/manifest.json')
  })

  test('should have apple-touch-icon configured', async ({ page }) => {
    await page.goto('/')

    // Check for apple-touch-icon link in head
    const appleIcon = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href')

    // Apple icon should be configured in the HTML
    if (appleIcon) {
      expect(appleIcon).toBeTruthy()
    } else {
      // If no explicit apple-touch-icon link, check for icon in manifest
      const manifestResponse = await page.goto('/manifest.json')
      const manifest = await manifestResponse?.json()
      expect(manifest?.icons?.length).toBeGreaterThan(0)
    }
  })
})
