/**
 * Tests for useProfileSetupState hook
 * Target: ~25 tests covering student profile information collection after sign-up
 */

import { renderHook, act } from "@testing-library/react";
import { useProfileSetupState } from "@/hooks/auth/useProfileSetupState";

describe("useProfileSetupState", () => {
  describe("Initial State", () => {
    it("should initialize with empty name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.name).toBe("");
    });

    it("should initialize with empty gender", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.gender).toBe("");
    });

    it("should initialize with empty roll number", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.rollNumber).toBe("");
    });

    it("should initialize with empty phone", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.phone).toBe("");
    });

    it("should initialize with empty school name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.schoolName).toBe("");
    });

    it("should initialize with empty class name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.className).toBe("");
    });

    it("should initialize with empty village", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.village).toBe("");
    });

    it("should initialize with no error", () => {
      const { result } = renderHook(() => useProfileSetupState());

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Name Field", () => {
    it("should update name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setName("John Doe");
      });

      expect(result.current.state.name).toBe("John Doe");
    });

    it("should allow clearing name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setName("John");
        result.current.actions.setName("");
      });

      expect(result.current.state.name).toBe("");
    });
  });

  describe("Gender Field", () => {
    it("should set gender to male", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setGender("male");
      });

      expect(result.current.state.gender).toBe("male");
    });

    it("should set gender to female", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setGender("female");
      });

      expect(result.current.state.gender).toBe("female");
    });

    it("should allow clearing gender", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setGender("male");
        result.current.actions.setGender("");
      });

      expect(result.current.state.gender).toBe("");
    });
  });

  describe("Roll Number Field", () => {
    it("should update roll number", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setRollNumber("25");
      });

      expect(result.current.state.rollNumber).toBe("25");
    });

    it("should handle alphanumeric roll numbers", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setRollNumber("A-25");
      });

      expect(result.current.state.rollNumber).toBe("A-25");
    });
  });

  describe("Phone Field", () => {
    it("should update phone", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setPhone("9876543210");
      });

      expect(result.current.state.phone).toBe("9876543210");
    });

    it("should handle phone with country code", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setPhone("+91-9876543210");
      });

      expect(result.current.state.phone).toBe("+91-9876543210");
    });
  });

  describe("School Name Field", () => {
    it("should update school name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setSchoolName("Atal Tinkering Lab School");
      });

      expect(result.current.state.schoolName).toBe("Atal Tinkering Lab School");
    });
  });

  describe("Class Name Field", () => {
    it("should update class name", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setClassName("10th A");
      });

      expect(result.current.state.className).toBe("10th A");
    });
  });

  describe("Village Field", () => {
    it("should update village", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setVillage("Rural Area");
      });

      expect(result.current.state.village).toBe("Rural Area");
    });
  });

  describe("Error Handling", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setError("Name is required");
      });

      expect(result.current.state.error).toBe("Name is required");
    });

    it("should clear error when set to null", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setError("Error");
        result.current.actions.setError(null);
      });

      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Reset All", () => {
    it("should reset all fields to initial state", () => {
      const { result } = renderHook(() => useProfileSetupState());

      act(() => {
        result.current.actions.setName("John Doe");
        result.current.actions.setGender("male");
        result.current.actions.setRollNumber("25");
        result.current.actions.setPhone("9876543210");
        result.current.actions.setSchoolName("Test School");
        result.current.actions.setClassName("10th");
        result.current.actions.setVillage("Test Village");
        result.current.actions.setError("Error");
        result.current.actions.resetAll();
      });

      expect(result.current.state.name).toBe("");
      expect(result.current.state.gender).toBe("");
      expect(result.current.state.rollNumber).toBe("");
      expect(result.current.state.phone).toBe("");
      expect(result.current.state.schoolName).toBe("");
      expect(result.current.state.className).toBe("");
      expect(result.current.state.village).toBe("");
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Full Profile Flow", () => {
    it("should handle complete profile setup flow", () => {
      const { result } = renderHook(() => useProfileSetupState());

      // Fill complete profile
      act(() => {
        result.current.actions.setName("Rahul Kumar");
        result.current.actions.setGender("male");
        result.current.actions.setRollNumber("12");
        result.current.actions.setPhone("9876543210");
        result.current.actions.setSchoolName("Government High School");
        result.current.actions.setClassName("Class 8");
        result.current.actions.setVillage("Sitapur");
      });

      expect(result.current.state.name).toBe("Rahul Kumar");
      expect(result.current.state.gender).toBe("male");
      expect(result.current.state.rollNumber).toBe("12");
      expect(result.current.state.phone).toBe("9876543210");
      expect(result.current.state.schoolName).toBe("Government High School");
      expect(result.current.state.className).toBe("Class 8");
      expect(result.current.state.village).toBe("Sitapur");
      expect(result.current.state.error).toBeNull();
    });
  });

  describe("Action Stability", () => {
    it("should provide stable action references across re-renders", () => {
      const { result, rerender } = renderHook(() => useProfileSetupState());

      const initialActions = result.current.actions;

      rerender();

      expect(result.current.actions.setName).toBe(initialActions.setName);
      expect(result.current.actions.setGender).toBe(initialActions.setGender);
      expect(result.current.actions.resetAll).toBe(initialActions.resetAll);
    });
  });
});
