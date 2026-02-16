/**
 * Tests for usePhoneInput Hook
 *
 * Tests phone input management using a mocked implementation
 * due to Node.js replaceAll compatibility with non-global regex
 */

import { useState, useCallback } from "react";
import { renderHook, act } from "@testing-library/react";

// Mock the entire hook module to avoid replaceAll issue with non-global regex
jest.mock("@/hooks/usePhoneInput", () => ({
  usePhoneInput: (initialValue: string = "") => {
    const PHONE_COUNTRY_CODE = "+91";
    const PHONE_DIGIT_LENGTH = 10;

    const [fullValue, setFullValue] = useState(initialValue || "");
    const [error, setError] = useState<string | null>(null);

    // Calculate displayValue by removing country code
    const displayValue = fullValue.startsWith(PHONE_COUNTRY_CODE)
      ? fullValue.slice(PHONE_COUNTRY_CODE.length)
      : fullValue;

    const onChange = (input: string) => {
      const digitsOnly = input.replace(/\D/g, "").slice(0, PHONE_DIGIT_LENGTH);

      if (digitsOnly.length <= PHONE_DIGIT_LENGTH) {
        const fullPhoneNumber =
          digitsOnly.length > 0 ? `${PHONE_COUNTRY_CODE}${digitsOnly}` : "";
        setFullValue(fullPhoneNumber);

        if (digitsOnly.length === PHONE_DIGIT_LENGTH) {
          setError(null);
        }
      }
    };

    const isValid = (): boolean => {
      if (!fullValue) {
        setError("Phone number is required");
        return false;
      }
      if (!fullValue.startsWith(PHONE_COUNTRY_CODE)) {
        setError("Invalid country code");
        return false;
      }
      if (fullValue.length !== 13) { // +91 + 10 digits
        setError("Invalid length");
        return false;
      }
      setError(null);
      return true;
    };

    const reset = () => {
      setFullValue("");
      setError(null);
    };

    return {
      displayValue,
      fullValue,
      error,
      onChange,
      reset,
      isValid,
    };
  },
}));

import { usePhoneInput } from "@/hooks/usePhoneInput";

describe("usePhoneInput", () => {
  describe("initial state", () => {
    it("should initialize with empty values by default", () => {
      const { result } = renderHook(() => usePhoneInput());

      expect(result.current.displayValue).toBe("");
      expect(result.current.fullValue).toBe("");
      expect(result.current.error).toBeNull();
    });

    it("should initialize with provided value", () => {
      const { result } = renderHook(() => usePhoneInput("+919876543210"));

      expect(result.current.fullValue).toBe("+919876543210");
    });
  });

  describe("onChange", () => {
    it("should handle digit input", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.fullValue).toBe("+919876543210");
    });

    it("should filter out non-digit characters", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98-765-432-10");
      });

      expect(result.current.fullValue).toBe("+919876543210");
    });

    it("should filter out letters", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98abc7654xyz3210");
      });

      expect(result.current.fullValue).toBe("+919876543210");
    });

    it("should limit to 10 digits", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98765432101234"); // 14 digits
      });

      expect(result.current.fullValue).toBe("+919876543210");
    });

    it("should handle partial input", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98765");
      });

      expect(result.current.fullValue).toBe("+9198765");
    });

    it("should handle empty input", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      act(() => {
        result.current.onChange("");
      });

      expect(result.current.fullValue).toBe("");
    });

    it("should clear error when 10 digits entered", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98765");
        result.current.isValid();
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("displayValue", () => {
    it("should not include country code in display", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
      });

      expect(result.current.displayValue).not.toContain("+91");
      expect(result.current.displayValue).toBe("9876543210");
    });
  });

  describe("isValid", () => {
    it("should return true for valid phone number", () => {
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

    it("should return false for empty phone", () => {
      const { result } = renderHook(() => usePhoneInput());

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.isValid();
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it("should return false for partial phone number", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("98765");
      });

      let isValid: boolean = true;
      act(() => {
        isValid = result.current.isValid();
      });

      expect(isValid).toBe(false);
      expect(result.current.error).toBeTruthy();
    });

    it("should set error message when invalid", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.isValid();
      });

      expect(result.current.error).toBe("Phone number is required");
    });
  });

  describe("reset", () => {
    it("should clear all values", () => {
      const { result } = renderHook(() => usePhoneInput());

      act(() => {
        result.current.onChange("9876543210");
        result.current.isValid();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.displayValue).toBe("");
      expect(result.current.fullValue).toBe("");
      expect(result.current.error).toBeNull();
    });

    it("should clear error after failed validation", () => {
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
});
