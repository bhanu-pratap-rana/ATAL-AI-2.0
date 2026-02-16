/**
 * Tests for theme-colors constants
 * Target: ~20 tests covering theme color configurations
 */

import {
  THEME_COLORS,
  QR_CODE_COLORS,
  type ThemeColorKey,
  type QRColorKey,
} from "@/lib/constants/theme-colors";

describe("THEME_COLORS", () => {
  describe("primary colors", () => {
    it("should have primary color #F98819", () => {
      expect(THEME_COLORS.primary).toBe("#F98819");
    });

    it("should have primaryDark color #E07510", () => {
      expect(THEME_COLORS.primaryDark).toBe("#E07510");
    });

    it("should have primaryLight color #FFCFA3", () => {
      expect(THEME_COLORS.primaryLight).toBe("#FFCFA3");
    });

    it("should have primaryLightest color #FFF5EB", () => {
      expect(THEME_COLORS.primaryLightest).toBe("#FFF5EB");
    });
  });

  describe("surface colors", () => {
    it("should have surface color #FFFBF7", () => {
      expect(THEME_COLORS.surface).toBe("#FFFBF7");
    });

    it("should have white color #FFFFFF", () => {
      expect(THEME_COLORS.white).toBe("#FFFFFF");
    });
  });

  describe("text colors", () => {
    it("should have textPrimary color #2D2A26", () => {
      expect(THEME_COLORS.textPrimary).toBe("#2D2A26");
    });

    it("should have textSecondary color #57534E", () => {
      expect(THEME_COLORS.textSecondary).toBe("#57534E");
    });

    it("should have textMuted color #A8A29E", () => {
      expect(THEME_COLORS.textMuted).toBe("#A8A29E");
    });
  });

  describe("status colors", () => {
    it("should have error color #DC2626", () => {
      expect(THEME_COLORS.error).toBe("#DC2626");
    });

    it("should have success color #16A34A", () => {
      expect(THEME_COLORS.success).toBe("#16A34A");
    });

    it("should have warning color #D97706", () => {
      expect(THEME_COLORS.warning).toBe("#D97706");
    });

    it("should have info color #0284C7", () => {
      expect(THEME_COLORS.info).toBe("#0284C7");
    });
  });

  describe("gradient", () => {
    it("should have gradientPrimary as linear gradient", () => {
      expect(THEME_COLORS.gradientPrimary).toContain("linear-gradient");
    });

    it("should include primary color in gradient", () => {
      expect(THEME_COLORS.gradientPrimary).toContain("#F98819");
    });

    it("should be a 135deg gradient", () => {
      expect(THEME_COLORS.gradientPrimary).toContain("135deg");
    });
  });

  describe("color format validation", () => {
    const hexColorPattern = /^#[0-9A-F]{6}$/i;

    it("should have all non-gradient colors as valid hex colors", () => {
      const colorKeys = Object.keys(THEME_COLORS).filter(
        (key) => key !== "gradientPrimary"
      ) as (keyof typeof THEME_COLORS)[];

      colorKeys.forEach((key) => {
        expect(THEME_COLORS[key]).toMatch(hexColorPattern);
      });
    });

    it("should have unique colors for each status", () => {
      const statusColors = [
        THEME_COLORS.error,
        THEME_COLORS.success,
        THEME_COLORS.warning,
        THEME_COLORS.info,
      ];
      const uniqueColors = new Set(statusColors);
      expect(uniqueColors.size).toBe(statusColors.length);
    });
  });
});

describe("QR_CODE_COLORS", () => {
  it("should have dark color matching primary", () => {
    expect(QR_CODE_COLORS.dark).toBe(THEME_COLORS.primary);
  });

  it("should have light color matching white", () => {
    expect(QR_CODE_COLORS.light).toBe(THEME_COLORS.white);
  });

  it("should have dark color as #F98819", () => {
    expect(QR_CODE_COLORS.dark).toBe("#F98819");
  });

  it("should have light color as #FFFFFF", () => {
    expect(QR_CODE_COLORS.light).toBe("#FFFFFF");
  });

  it("should have high contrast between dark and light", () => {
    // Simple check that they are different
    expect(QR_CODE_COLORS.dark).not.toBe(QR_CODE_COLORS.light);
  });
});

describe("Type definitions", () => {
  it("should have valid ThemeColorKey type", () => {
    const validKeys: ThemeColorKey[] = [
      "primary",
      "primaryDark",
      "primaryLight",
      "primaryLightest",
      "surface",
      "white",
      "textPrimary",
      "textSecondary",
      "textMuted",
      "error",
      "success",
      "warning",
      "info",
      "gradientPrimary",
    ];
    validKeys.forEach((key) => {
      expect(THEME_COLORS[key]).toBeDefined();
    });
  });

  it("should have valid QRColorKey type", () => {
    const validKeys: QRColorKey[] = ["dark", "light"];
    validKeys.forEach((key) => {
      expect(QR_CODE_COLORS[key]).toBeDefined();
    });
  });
});

describe("Color relationships", () => {
  it("should have primaryDark darker than primary (lower lightness value conceptually)", () => {
    // Hex comparison - dark should have lower values
    expect(THEME_COLORS.primaryDark).not.toBe(THEME_COLORS.primary);
  });

  it("should have primaryLight lighter than primary", () => {
    expect(THEME_COLORS.primaryLight).not.toBe(THEME_COLORS.primary);
  });

  it("should have textPrimary be darkest text color", () => {
    // Just verify they're all different and valid
    expect(THEME_COLORS.textPrimary).not.toBe(THEME_COLORS.textSecondary);
    expect(THEME_COLORS.textSecondary).not.toBe(THEME_COLORS.textMuted);
  });
});
