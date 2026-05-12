import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const BRAVE_PATH = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const BASE_URL = 'http://localhost:3000';
const OUT_DIR = '/tmp/atal-screenshots';

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

async function testPage(browser, name, url, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  
  try {
    const resp = await page.goto(url, { timeout: 20000, waitUntil: 'networkidle' });
    const status = resp?.status() ?? 0;
    const title = await page.title();
    await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
    console.log(`${status === 200 ? '✅' : status === 404 ? '✅(404)' : '❌'} [${width}x${height}] ${name} → ${status} "${title}" | errors:${errors.length}`);
    if (errors.length) errors.slice(0,2).forEach(e => console.log(`   ⚠ ${e.slice(0,100)}`));
    await ctx.close();
    return { name, status, title, errors };
  } catch(e) {
    console.log(`❌ ${name}: ${e.message}`);
    await ctx.close();
    return { name, status: 0, errors: [e.message] };
  }
}

const browser = await chromium.launch({ 
  executablePath: BRAVE_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
});

console.log('\n=== PUBLIC PAGES (Desktop 1280x800) ===');
await testPage(browser, '01-home', BASE_URL + '/', 1280, 800);
await testPage(browser, '02-student-start', BASE_URL + '/student/start', 1280, 800);
await testPage(browser, '03-teacher-start', BASE_URL + '/teacher/start', 1280, 800);
await testPage(browser, '04-join', BASE_URL + '/join', 1280, 800);
await testPage(browser, '05-offline-page', BASE_URL + '/offline', 1280, 800);
await testPage(browser, '06-not-found', BASE_URL + '/nonexistent-page-xyz', 1280, 800);
await testPage(browser, '07-reset-password', BASE_URL + '/reset-password', 1280, 800);

console.log('\n=== MOBILE (375x812 - iPhone) ===');
await testPage(browser, '08-student-start-mobile', BASE_URL + '/student/start', 375, 812);
await testPage(browser, '09-join-mobile', BASE_URL + '/join', 375, 812);
await testPage(browser, '10-teacher-start-mobile', BASE_URL + '/teacher/start', 375, 812);
await testPage(browser, '11-home-mobile', BASE_URL + '/', 375, 812);

console.log('\n=== TABLET (768x1024 - iPad) ===');
await testPage(browser, '12-student-start-tablet', BASE_URL + '/student/start', 768, 1024);
await testPage(browser, '13-join-tablet', BASE_URL + '/join', 768, 1024);
await testPage(browser, '14-teacher-start-tablet', BASE_URL + '/teacher/start', 768, 1024);

console.log('\n=== PWA & MANIFEST CHECKS ===');
const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
const page = await ctx.newPage();
await page.goto(BASE_URL + '/student/start', { waitUntil: 'networkidle' });

const pwa = await page.evaluate(async () => {
  const manifestLink = document.querySelector('link[rel="manifest"]');
  const swSupport = 'serviceWorker' in navigator;
  let swRegistered = false;
  if (swSupport) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      swRegistered = regs.length > 0;
    } catch (e) {
      console.log('  sw.getRegistrations failed:', e.message);
    }
  }
  return {
    hasManifest: !!manifestLink,
    manifestHref: manifestLink?.href,
    swSupport,
    swRegistered,
    hasThemeColor: !!document.querySelector('meta[name="theme-color"]'),
    hasAppleTouchIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
    viewport: document.querySelector('meta[name="viewport"]')?.content,
  };
});

console.log('  Manifest link:', pwa.hasManifest ? `✅ ${pwa.manifestHref}` : '❌ missing');
console.log('  Service Worker support:', pwa.swSupport ? '✅' : '❌');
console.log('  Service Worker registered:', pwa.swRegistered ? '✅' : '⚠ not yet (needs interaction)');
console.log('  theme-color meta:', pwa.hasThemeColor ? '✅' : '❌');
console.log('  apple-touch-icon:', pwa.hasAppleTouchIcon ? '✅' : '⚠');
console.log('  viewport meta:', pwa.hasViewportMeta ? `✅ ${pwa.viewport}` : '❌');

// Check manifest.json
const mResp = await page.goto(BASE_URL + '/manifest.json', { waitUntil: 'load' });
const mStatus = mResp?.status();
try {
  const mData = await page.evaluate(() => JSON.parse(document.body.innerText));
  console.log('  manifest.json:', mStatus === 200 ? '✅' : '❌', `(${mStatus})`);
  console.log('  → name:', mData.name);
  console.log('  → short_name:', mData.short_name);
  console.log('  → display:', mData.display);
  console.log('  → start_url:', mData.start_url);
  console.log('  → icons:', mData.icons?.length, 'icons');
  console.log('  → screenshots:', mData.screenshots?.length ?? 0, 'screenshots');
} catch (e) {
  console.log('  manifest.json: ❌ invalid JSON', e.message);
}

await ctx.close();

// Health endpoint
const hCtx = await browser.newContext();
const hPage = await hCtx.newPage();
const hResp = await hPage.goto(BASE_URL + '/api/health', { waitUntil: 'load' });
const hStatus = hResp?.status();
const hBody = await hPage.evaluate(() => {
  try { return JSON.parse(document.body.innerText); } catch { return null; }
});
console.log('\n=== HEALTH ENDPOINT ===');
console.log(`  /api/health: ${hStatus === 200 ? '✅' : '❌'} (${hStatus})`, hBody ? JSON.stringify(hBody) : '');
await hCtx.close();

await browser.close();
console.log(`\n✅ Screenshots saved to ${OUT_DIR}`);
