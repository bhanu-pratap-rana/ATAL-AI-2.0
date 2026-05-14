/**
 * Unit tests for the date-format helpers.
 *
 * The helpers are pinned to the `en-IN` locale so server-side and
 * client-side renders produce identical strings (no hydration drift).
 * Tests confirm the locale shape AND the empty/invalid-input fallbacks.
 */

import { formatDate, formatDateLong } from "@/lib/date-format";

describe("formatDate", () => {
  it("renders a valid ISO date in en-IN (DD/MM/YYYY) shape", () => {
    expect(formatDate("2026-05-14T00:00:00Z")).toMatch(/14\/0?5\/2026/);
  });

  it("returns empty string for falsy input", () => {
    expect(formatDate("")).toBe("");
    expect(formatDate(undefined)).toBe("");
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for unparseable input", () => {
    expect(formatDate("not a date")).toBe("");
    expect(formatDate("definitely-invalid-2026-99-99")).toBe("");
  });
});

describe("formatDateLong", () => {
  it("renders weekday + month name + year", () => {
    const out = formatDateLong("2026-05-14T10:30:00Z");
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/Thursday|Friday|Wednesday|Monday|Tuesday|Saturday|Sunday/);
    expect(out).toMatch(/May/);
  });

  it("returns empty string for falsy / invalid input", () => {
    expect(formatDateLong("")).toBe("");
    expect(formatDateLong(undefined)).toBe("");
    expect(formatDateLong("not a date")).toBe("");
  });
});
