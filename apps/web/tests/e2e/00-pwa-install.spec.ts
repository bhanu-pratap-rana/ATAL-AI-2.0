import { test, expect } from "@playwright/test";

test.describe("PWA install", () => {
  test("manifest responds and declares start_url + icons", async ({ page }) => {
    const response = await page.request.get("/manifest.json");
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.scope).toBe("/");
    expect(manifest.display).toMatch(/standalone|minimal-ui|fullscreen/);
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);

    const sizes = manifest.icons.flatMap((i: { sizes?: string }) =>
      (i.sizes ?? "").split(" "),
    );
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  test("service worker registers on home", async ({ page }) => {
    // Registration is timing-sensitive right after the setup project's
    // three logins; default 30s test timeout clips the 45s wait below.
    test.setTimeout(60_000);
    await page.goto("/");
    // 45s: this is often the first page hit of the run — in dev the
    // cold compile of "/" can delay SW registration well past 15s.
    await page.waitForFunction(
      () => "serviceWorker" in navigator && navigator.serviceWorker.getRegistrations().then((r) => r.length > 0),
      null,
      { timeout: 45_000 },
    );

    const registrations = await page.evaluate(() =>
      navigator.serviceWorker.getRegistrations().then((regs) => regs.length),
    );
    expect(registrations).toBeGreaterThan(0);
  });

  test("manifest is linked from document head", async ({ page }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    expect(href).toBeTruthy();
    expect(href).toMatch(/manifest\.json$/);
  });
});
