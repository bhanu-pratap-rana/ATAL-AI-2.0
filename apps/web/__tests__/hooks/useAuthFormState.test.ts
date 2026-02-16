/**
 * Tests for useAuthFormState hook
 */

import { renderHook, act } from "@testing-library/react";
import { useAuthFormState } from "@/hooks/useAuthFormState";

describe("useAuthFormState", () => {
  describe("initialization", () => {
    it("should initialize with empty form data by default", () => {
      const { result } = renderHook(() => useAuthFormState());

      expect(result.current.formData).toEqual({});
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.hasErrors).toBe(false);
    });

    it("should initialize with provided initial data", () => {
      const initialData = { name: "John", className: "10A" };
      const { result } = renderHook(() => useAuthFormState(initialData));

      expect(result.current.formData).toEqual(initialData);
    });
  });

  describe("updateField", () => {
    it("should update a single field", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.updateField("name", "John");
      });

      expect(result.current.formData.name).toBe("John");
    });

    it("should clear field error when updating a field", () => {
      const { result } = renderHook(() => useAuthFormState());

      // Set an error first
      act(() => {
        result.current.setFieldError("name", "Name is required");
      });
      expect(result.current.errors.name).toBe("Name is required");

      // Update the field - error should be cleared
      act(() => {
        result.current.updateField("name", "John");
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it("should not affect other fields when updating one", () => {
      const { result } = renderHook(() =>
        useAuthFormState({ name: "Initial" })
      );

      act(() => {
        result.current.updateField("className", "10A");
      });

      expect(result.current.formData.name).toBe("Initial");
      expect(result.current.formData.className).toBe("10A");
    });
  });

  describe("updateFields", () => {
    it("should update multiple fields at once", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.updateFields({
          name: "John",
          className: "10A",
          rollNumber: "15",
        });
      });

      expect(result.current.formData.name).toBe("John");
      expect(result.current.formData.className).toBe("10A");
      expect(result.current.formData.rollNumber).toBe("15");
    });

    it("should preserve existing fields when updating", () => {
      const { result } = renderHook(() =>
        useAuthFormState({ gender: "male" })
      );

      act(() => {
        result.current.updateFields({ name: "John" });
      });

      expect(result.current.formData.gender).toBe("male");
      expect(result.current.formData.name).toBe("John");
    });
  });

  describe("error management", () => {
    it("should set a field error", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.setFieldError("password", "Password is too short");
      });

      expect(result.current.errors.password).toBe("Password is too short");
      expect(result.current.hasErrors).toBe(true);
    });

    it("should set multiple errors at once", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.setFieldErrors({
          name: "Name is required",
          password: "Password is required",
        });
      });

      expect(result.current.errors.name).toBe("Name is required");
      expect(result.current.errors.password).toBe("Password is required");
    });

    it("should clear a specific field error", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.setFieldErrors({
          name: "Name is required",
          password: "Password is required",
        });
      });

      act(() => {
        result.current.clearFieldError("name");
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.password).toBe("Password is required");
    });

    it("should clear all errors", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.setFieldErrors({
          name: "Name is required",
          password: "Password is required",
        });
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.errors).toEqual({});
      expect(result.current.hasErrors).toBe(false);
    });
  });

  describe("getFieldValue", () => {
    it("should return field value", () => {
      const { result } = renderHook(() =>
        useAuthFormState({ name: "John" })
      );

      expect(result.current.getFieldValue("name")).toBe("John");
    });

    it("should return empty string for undefined field", () => {
      const { result } = renderHook(() => useAuthFormState());

      expect(result.current.getFieldValue("nonexistent")).toBe("");
    });
  });

  describe("getFieldError", () => {
    it("should return field error", () => {
      const { result } = renderHook(() => useAuthFormState());

      act(() => {
        result.current.setFieldError("name", "Required");
      });

      expect(result.current.getFieldError("name")).toBe("Required");
    });

    it("should return undefined for field without error", () => {
      const { result } = renderHook(() => useAuthFormState());

      expect(result.current.getFieldError("name")).toBeUndefined();
    });
  });

  describe("reset", () => {
    it("should reset to initial data", () => {
      const initialData = { name: "Initial" };
      const { result } = renderHook(() => useAuthFormState(initialData));

      // Modify form
      act(() => {
        result.current.updateField("name", "Modified");
        result.current.setFieldError("name", "Error");
        result.current.setIsSubmitting(true);
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.formData.name).toBe("Initial");
      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should reset to new initial data if provided", () => {
      const { result } = renderHook(() =>
        useAuthFormState({ name: "Initial" })
      );

      act(() => {
        result.current.reset({ name: "New Initial", className: "10A" });
      });

      expect(result.current.formData.name).toBe("New Initial");
      expect(result.current.formData.className).toBe("10A");
    });
  });

  describe("isSubmitting", () => {
    it("should toggle submitting state", () => {
      const { result } = renderHook(() => useAuthFormState());

      expect(result.current.isSubmitting).toBe(false);

      act(() => {
        result.current.setIsSubmitting(true);
      });

      expect(result.current.isSubmitting).toBe(true);

      act(() => {
        result.current.setIsSubmitting(false);
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });
});
