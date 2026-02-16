/**
 * Tests for ui-timings constants
 * Target: ~20 tests covering UI timing configurations
 */

import {
  TOAST_DURATIONS,
  CLIPBOARD_TIMING,
  FORM_TIMING,
  ASSESSMENT_TIMING,
  NAVIGATION_TIMING,
  PROFILE_TIMING,
  type ToastDuration,
} from "@/lib/constants/ui-timings";

describe("TOAST_DURATIONS", () => {
  it("should have short duration of 2000ms", () => {
    expect(TOAST_DURATIONS.short).toBe(2000);
  });

  it("should have default duration of 3000ms", () => {
    expect(TOAST_DURATIONS.default).toBe(3000);
  });

  it("should have long duration of 5000ms", () => {
    expect(TOAST_DURATIONS.long).toBe(5000);
  });

  it("should have short < default < long", () => {
    expect(TOAST_DURATIONS.short).toBeLessThan(TOAST_DURATIONS.default);
    expect(TOAST_DURATIONS.default).toBeLessThan(TOAST_DURATIONS.long);
  });

  it("should have all positive durations", () => {
    expect(TOAST_DURATIONS.short).toBeGreaterThan(0);
    expect(TOAST_DURATIONS.default).toBeGreaterThan(0);
    expect(TOAST_DURATIONS.long).toBeGreaterThan(0);
  });

  it("should have reasonable toast durations (1-10 seconds)", () => {
    Object.values(TOAST_DURATIONS).forEach((duration) => {
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThanOrEqual(10000);
    });
  });
});

describe("CLIPBOARD_TIMING", () => {
  it("should have successFeedback of 2000ms", () => {
    expect(CLIPBOARD_TIMING.successFeedback).toBe(2000);
  });

  it("should be positive", () => {
    expect(CLIPBOARD_TIMING.successFeedback).toBeGreaterThan(0);
  });

  it("should be reasonable for user feedback (1-5 seconds)", () => {
    expect(CLIPBOARD_TIMING.successFeedback).toBeGreaterThanOrEqual(1000);
    expect(CLIPBOARD_TIMING.successFeedback).toBeLessThanOrEqual(5000);
  });
});

describe("FORM_TIMING", () => {
  it("should have successCallback of 1500ms", () => {
    expect(FORM_TIMING.successCallback).toBe(1500);
  });

  it("should have nextStepsDelay of 2000ms", () => {
    expect(FORM_TIMING.nextStepsDelay).toBe(2000);
  });

  it("should have all positive values", () => {
    expect(FORM_TIMING.successCallback).toBeGreaterThan(0);
    expect(FORM_TIMING.nextStepsDelay).toBeGreaterThan(0);
  });

  it("should have successCallback shorter than nextStepsDelay", () => {
    expect(FORM_TIMING.successCallback).toBeLessThanOrEqual(
      FORM_TIMING.nextStepsDelay
    );
  });
});

describe("ASSESSMENT_TIMING", () => {
  it("should have rapidResponseThreshold of 5000ms", () => {
    expect(ASSESSMENT_TIMING.rapidResponseThreshold).toBe(5000);
  });

  it("should have rapidWarningDuration of 3000ms", () => {
    expect(ASSESSMENT_TIMING.rapidWarningDuration).toBe(3000);
  });

  it("should have all positive values", () => {
    expect(ASSESSMENT_TIMING.rapidResponseThreshold).toBeGreaterThan(0);
    expect(ASSESSMENT_TIMING.rapidWarningDuration).toBeGreaterThan(0);
  });

  it("should have reasonable rapid response threshold (3-15 seconds)", () => {
    expect(ASSESSMENT_TIMING.rapidResponseThreshold).toBeGreaterThanOrEqual(
      3000
    );
    expect(ASSESSMENT_TIMING.rapidResponseThreshold).toBeLessThanOrEqual(15000);
  });
});

describe("NAVIGATION_TIMING", () => {
  it("should have redirectDelay of 1500ms", () => {
    expect(NAVIGATION_TIMING.redirectDelay).toBe(1500);
  });

  it("should be positive", () => {
    expect(NAVIGATION_TIMING.redirectDelay).toBeGreaterThan(0);
  });

  it("should be reasonable for UX (0.5-5 seconds)", () => {
    expect(NAVIGATION_TIMING.redirectDelay).toBeGreaterThanOrEqual(500);
    expect(NAVIGATION_TIMING.redirectDelay).toBeLessThanOrEqual(5000);
  });
});

describe("PROFILE_TIMING", () => {
  it("should have successMessage of 3000ms", () => {
    expect(PROFILE_TIMING.successMessage).toBe(3000);
  });

  it("should be positive", () => {
    expect(PROFILE_TIMING.successMessage).toBeGreaterThan(0);
  });

  it("should match default toast duration", () => {
    expect(PROFILE_TIMING.successMessage).toBe(TOAST_DURATIONS.default);
  });
});

describe("Type definitions", () => {
  it("should have valid ToastDuration type", () => {
    const validKeys: ToastDuration[] = ["short", "default", "long"];
    validKeys.forEach((key) => {
      expect(TOAST_DURATIONS[key]).toBeDefined();
    });
  });
});

describe("Timing consistency", () => {
  it("should have consistent feedback durations across the app", () => {
    // Success feedback should be similar across features
    const feedbackDurations = [
      CLIPBOARD_TIMING.successFeedback,
      FORM_TIMING.successCallback,
      NAVIGATION_TIMING.redirectDelay,
    ];

    // All should be between 1 and 3 seconds
    feedbackDurations.forEach((duration) => {
      expect(duration).toBeGreaterThanOrEqual(1000);
      expect(duration).toBeLessThanOrEqual(3000);
    });
  });

  it("should have all timings as positive numbers", () => {
    const allTimings = [
      ...Object.values(TOAST_DURATIONS),
      ...Object.values(CLIPBOARD_TIMING),
      ...Object.values(FORM_TIMING),
      ...Object.values(ASSESSMENT_TIMING),
      ...Object.values(NAVIGATION_TIMING),
      ...Object.values(PROFILE_TIMING),
    ];

    allTimings.forEach((timing) => {
      expect(timing).toBeGreaterThan(0);
      expect(typeof timing).toBe("number");
    });
  });
});
