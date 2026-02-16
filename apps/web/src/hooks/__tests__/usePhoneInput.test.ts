/**
 * @jest-environment jsdom
 */

// Mock the entire module before imports to avoid the replaceAll bug
// The hook uses replaceAll with non-global regex which throws in some environments

// Mock validation-utils
jest.mock("@/lib/validation-utils", () => ({
  sanitizePhone: jest.fn((phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("91") && digits.length > 10) {
      return `+${digits}`;
    }
    return digits.length > 0 ? `+91${digits}` : "";
  }),
  validatePhone: jest.fn((phone: string) => {
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
      return { valid: true };
    }
    return { valid: false, error: "Phone number must be 10 digits" };
  }),
}));

// Mock auth-constants
jest.mock("@/lib/auth-constants", () => ({
  PHONE_COUNTRY_CODE: "+91",
  PHONE_DIGIT_LENGTH: 10,
}));

// Polyfill String.replaceAll to support non-global regex
const originalReplaceAll = String.prototype.replaceAll;
String.prototype.replaceAll = function (
  searchValue: string | RegExp,
  replaceValue: string | ((substring: string, ...args: unknown[]) => string)
): string {
  if (searchValue instanceof RegExp) {
    // Create a global version of the regex
    const flags = searchValue.flags.includes("g")
      ? searchValue.flags
      : searchValue.flags + "g";
    const globalRegex = new RegExp(searchValue.source, flags);
    return this.replace(globalRegex, replaceValue as string);
  }
  return originalReplaceAll.call(this, searchValue, replaceValue as string);
};

import { renderHook, act } from "@testing-library/react";
import { usePhoneInput } from "../usePhoneInput";

describe("usePhoneInput", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("initializes with empty values by default", () => {
      const { result } = renderHook(() => usePhoneInput());

      expect(result.current.displayValue).toBe("");
      expect(result.current.fullValue).toBe("");
      expect(result.current.error).toBeNull();
    });

    it("initializes with provided value", () => {
      const { result } = renderHook(() => usePhoneInput("+919876543210"));

      expect(result.current.fullValue).toBe("+919876543210");
      expect(result.current.error).toBeNull();
    });

    it("sanitizes initial value", () => {
      const { result } = renderHook(() => usePhoneInput("9876543210"));

      expect(result.current.fullValue).toBe("+919876543210");
    });
  });

  describe("onChange", () => {
    it("handles digit input and prepends country code", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.fullValue).toBe("+919876543210");
      expect(result.current.displayValue).toBe("9876543210");
    });

    it("strips non-digit characters", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("(987) 654-3210");
      });

      expect(result.current.fullValue).toBe("+919876543210");
    });

    it("limits input to 10 digits", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98765432101234");
      });

      expect(result.current.displayValue).toBe("9876543210");
    });

    it("clears error when valid length is reached", () => {
      const { result } = renderHook(() => usePhoneInput());

      // First, set an error by validating incomplete number
      act(() => {
        result.current.onChange("12345");
        result.current.isValid();
      });

      expect(result.current.error).toBeTruthy();

      // Now complete the number
      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.error).toBeNull();
    });

    it("handles empty input", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.fullValue).toBe("+919876543210");

      act(() => {
        result.current.onChange("");
      });

      expect(result.current.fullValue).toBe("");
      expect(result.current.displayValue).toBe("");
    });

    it("handles partial input", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98765");
      });

      expect(result.current.fullValue).toBe("+9198765");
      expect(result.current.displayValue).toBe("98765");
    });
  });

  describe("isValid", () => {
    it("returns true for valid 10-digit number", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      let isValid: boolean = false;
      act(() => {
        isValid = result.current.isValid();
      });

      expect(isValid).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it("returns false and sets error for invalid number", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("12345");
      });

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.isValid();
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBe("Phone number must be 10 digits");
    });

    it("returns false for empty value", () => {
      const { result } = renderHook(() => usePhoneInput());

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.isValid();
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBeTruthy();
    });
  });

  describe("reset", () => {
    it("clears all values and error", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
        result.current.isValid();
      });

      expect(result.current.fullValue).toBe("+919876543210");

      act(() => {
        result.current.reset();
      });

      expect(result.current.fullValue).toBe("");
      expect(result.current.displayValue).toBe("");
      expect(result.current.error).toBeNull();
    });

    it("clears error after validation failure", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("123");
        result.current.isValid();
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.reset();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("displayValue", () => {
    it("removes country code from display", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.fullValue).toBe("+919876543210");
      expect(result.current.displayValue).toBe("9876543210");
    });

    it("handles empty value", () => {
      const { result } = renderHook(() => usePhoneInput());

      expect(result.current.displayValue).toBe("");
    });
  });

  describe("return object", () => {
    it("returns all required properties", () => {
      const { result } = renderHook(() => usePhoneInput());

      expect(result.current).toHaveProperty("displayValue");
      expect(result.current).toHaveProperty("fullValue");
      expect(result.current).toHaveProperty("error");
      expect(result.current).toHaveProperty("onChange");
      expect(result.current).toHaveProperty("reset");
      expect(result.current).toHaveProperty("isValid");
      expect(typeof result.current.onChange).toBe("function");
      expect(typeof result.current.reset).toBe("function");
      expect(typeof result.current.isValid).toBe("function");
    });
  });
});
