/**
 * Tests for form-utils.ts
 */

import {
  getInputDescriptionId,
  getLanguageLabelForAI,
  getConfidenceLevel,
  getMaskedContext,
  createErrorHandler,
  createFieldResetters,
  parseApiError,
} from "@/lib/form-utils";

describe("form-utils", () => {
  describe("getInputDescriptionId", () => {
    it("should return error id when error is present", () => {
      const result = getInputDescriptionId("email", "Invalid email", "Enter your email");

      expect(result).toBe("email-error");
    });

    it("should return helper id when only helper text is present", () => {
      const result = getInputDescriptionId("email", undefined, "Enter your email");

      expect(result).toBe("email-helper");
    });

    it("should return undefined when neither error nor helper text is present", () => {
      const result = getInputDescriptionId("email");

      expect(result).toBeUndefined();
    });

    it("should prioritize error over helper text", () => {
      const result = getInputDescriptionId("email", "Error message", "Helper text");

      expect(result).toBe("email-error");
    });

    it("should return undefined for empty error string but no helper", () => {
      const result = getInputDescriptionId("email", "", undefined);

      expect(result).toBeUndefined();
    });
  });

  describe("getLanguageLabelForAI", () => {
    it("should return Hindi for 'hi' code", () => {
      expect(getLanguageLabelForAI("hi")).toBe("Hindi");
    });

    it("should return Assamese for 'as' code", () => {
      expect(getLanguageLabelForAI("as")).toBe("Assamese");
    });

    it("should return English for 'en' code", () => {
      expect(getLanguageLabelForAI("en")).toBe("English");
    });

    it("should return English for unknown language codes", () => {
      expect(getLanguageLabelForAI("fr")).toBe("English");
      expect(getLanguageLabelForAI("es")).toBe("English");
      expect(getLanguageLabelForAI("")).toBe("English");
    });
  });

  describe("getConfidenceLevel", () => {
    it("should return 'high' for scores >= 90", () => {
      expect(getConfidenceLevel(90)).toBe("high");
      expect(getConfidenceLevel(95)).toBe("high");
      expect(getConfidenceLevel(100)).toBe("high");
    });

    it("should return 'medium' for scores >= 70 and < 90", () => {
      expect(getConfidenceLevel(70)).toBe("medium");
      expect(getConfidenceLevel(80)).toBe("medium");
      expect(getConfidenceLevel(89)).toBe("medium");
    });

    it("should return 'low' for scores < 70", () => {
      expect(getConfidenceLevel(69)).toBe("low");
      expect(getConfidenceLevel(50)).toBe("low");
      expect(getConfidenceLevel(0)).toBe("low");
    });
  });

  describe("getMaskedContext", () => {
    it("should return Error instance as-is", () => {
      const error = new Error("Test error");
      const result = getMaskedContext(error);

      expect(result).toBe(error);
    });

    it("should apply mask function to context", () => {
      const context = { password: "secret", email: "test@example.com" };
      const maskFn = (data: unknown) => {
        const d = data as Record<string, string>;
        return { ...d, password: "****" };
      };

      const result = getMaskedContext(context, maskFn);

      expect(result).toEqual({ password: "****", email: "test@example.com" });
    });

    it("should return undefined for falsy context without mask function", () => {
      expect(getMaskedContext(null)).toBeUndefined();
      expect(getMaskedContext(undefined)).toBeUndefined();
    });

    it("should return undefined for falsy context even with mask function", () => {
      const maskFn = jest.fn();
      expect(getMaskedContext(null, maskFn)).toBeUndefined();
      expect(maskFn).not.toHaveBeenCalled();
    });

    it("should return undefined for truthy context without mask function", () => {
      const context = { data: "test" };
      expect(getMaskedContext(context)).toBeUndefined();
    });
  });

  describe("createErrorHandler", () => {
    it("should return undefined when no onError provided", () => {
      const result = createErrorHandler();

      expect(result).toBeUndefined();
    });

    it("should return handler that extracts Error message", () => {
      const onError = jest.fn();
      const handler = createErrorHandler(onError);

      handler!(new Error("Test error message"));

      expect(onError).toHaveBeenCalledWith("Test error message");
    });

    it("should return handler that converts non-Error to string", () => {
      const onError = jest.fn();
      const handler = createErrorHandler(onError);

      handler!("String error");

      expect(onError).toHaveBeenCalledWith("String error");
    });

    it("should handle object errors", () => {
      const onError = jest.fn();
      const handler = createErrorHandler(onError);

      handler!({ code: "ERR_001" });

      expect(onError).toHaveBeenCalledWith("[object Object]");
    });
  });

  describe("createFieldResetters", () => {
    it("should create reset functions for field groups", () => {
      const mockSetState = jest.fn();
      const fieldGroups = {
        email: ["email", "emailError"],
        phone: ["phone", "phoneError"],
      };

      const resetters = createFieldResetters(mockSetState, fieldGroups);

      expect(resetters).toHaveProperty("resetEmail");
      expect(resetters).toHaveProperty("resetPhone");
      expect(typeof resetters.resetEmail).toBe("function");
      expect(typeof resetters.resetPhone).toBe("function");
    });

    it("should call setState with reset values when resetter is called", () => {
      let state = { email: "test@example.com", emailError: "Invalid" };
      const mockSetState = jest.fn((updater) => {
        if (typeof updater === "function") {
          state = updater(state);
        }
      });

      const resetters = createFieldResetters(mockSetState, {
        email: ["email", "emailError"],
      });

      resetters.resetEmail();

      expect(mockSetState).toHaveBeenCalled();
    });

    it("should handle empty field groups", () => {
      const mockSetState = jest.fn();
      const resetters = createFieldResetters(mockSetState, {});

      expect(Object.keys(resetters)).toHaveLength(0);
    });
  });

  describe("parseApiError", () => {
    describe("rate limiting errors", () => {
      it("should return user-friendly message for rate limit errors", () => {
        expect(parseApiError("Rate limit exceeded")).toBe(
          "Too many requests. Please wait a few minutes and try again."
        );
        expect(parseApiError("RATE LIMIT ERROR")).toBe(
          "Too many requests. Please wait a few minutes and try again."
        );
      });
    });

    describe("authentication errors", () => {
      it("should return user-friendly message for invalid credentials", () => {
        expect(parseApiError("Invalid credentials provided")).toBe(
          "Invalid email or password. Please try again."
        );
      });

      it("should return user-friendly message for invalid email", () => {
        expect(parseApiError("Invalid email format")).toBe(
          "Please enter a valid email address."
        );
      });

      it("should return user-friendly message for invalid phone", () => {
        expect(parseApiError("Invalid phone number")).toBe(
          "Please enter a valid phone number."
        );
      });
    });

    describe("validation errors", () => {
      it("should return user-friendly message for already exists", () => {
        expect(parseApiError("User already exists")).toBe(
          "This account already exists. Please sign in instead."
        );
      });

      it("should return user-friendly message for not found", () => {
        expect(parseApiError("Resource not found")).toBe(
          "The requested resource could not be found."
        );
      });
    });

    describe("network errors", () => {
      it("should return user-friendly message for network errors", () => {
        expect(parseApiError("Network error occurred")).toBe(
          "Network error. Please check your connection and try again."
        );
      });

      it("should return user-friendly message for fetch errors", () => {
        expect(parseApiError("Failed to fetch data")).toBe(
          "Network error. Please check your connection and try again."
        );
      });
    });

    describe("default behavior", () => {
      it("should return original message if concise", () => {
        expect(parseApiError("Short error")).toBe("Short error");
      });

      it("should return generic message for long errors", () => {
        const longError = "a".repeat(101);
        expect(parseApiError(longError)).toBe("An error occurred. Please try again.");
      });

      it("should return exactly 100 char message as-is", () => {
        const exactError = "a".repeat(100);
        expect(parseApiError(exactError)).toBe(exactError);
      });
    });
  });
});
