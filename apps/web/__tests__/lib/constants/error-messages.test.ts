/**
 * Tests for error-messages constants
 * Target: ~20 tests covering all error message categories
 */

import {
  AUTH_ERRORS,
  DATABASE_ERRORS,
  SCHOOL_ERRORS,
  ADMIN_ERRORS,
  STUDENT_ERRORS,
  TEACHER_ERRORS,
  ASSESSMENT_ERRORS,
  AI_ERRORS,
  FILE_ERRORS,
  OPERATIONAL_ERRORS,
  SUCCESS_MESSAGES,
  VALIDATION_ERRORS,
  getErrorMessage,
} from "@/lib/constants/error-messages";

describe("error-messages", () => {
  describe("AUTH_ERRORS", () => {
    it("should have UNAUTHORIZED message", () => {
      expect(AUTH_ERRORS.UNAUTHORIZED).toBe(
        "You are not authorized to perform this action"
      );
    });

    it("should have SESSION_EXPIRED message", () => {
      expect(AUTH_ERRORS.SESSION_EXPIRED).toBe(
        "Your session has expired. Please log in again"
      );
    });

    it("should have all required auth error keys", () => {
      expect(AUTH_ERRORS.INVALID_CREDENTIALS).toBeDefined();
      expect(AUTH_ERRORS.USER_NOT_FOUND).toBeDefined();
      expect(AUTH_ERRORS.EMAIL_ALREADY_EXISTS).toBeDefined();
      expect(AUTH_ERRORS.PHONE_ALREADY_EXISTS).toBeDefined();
    });
  });

  describe("DATABASE_ERRORS", () => {
    it("should have QUERY_FAILED message", () => {
      expect(DATABASE_ERRORS.QUERY_FAILED).toBe(
        "Failed to fetch data from database"
      );
    });

    it("should have all CRUD operation messages", () => {
      expect(DATABASE_ERRORS.INSERT_FAILED).toBeDefined();
      expect(DATABASE_ERRORS.UPDATE_FAILED).toBeDefined();
      expect(DATABASE_ERRORS.DELETE_FAILED).toBeDefined();
    });

    it("should have NOT_FOUND message", () => {
      expect(DATABASE_ERRORS.NOT_FOUND).toBe(
        "The requested record was not found"
      );
    });
  });

  describe("SCHOOL_ERRORS", () => {
    it("should have school-related error messages", () => {
      expect(SCHOOL_ERRORS.SCHOOL_NOT_FOUND).toBeDefined();
      expect(SCHOOL_ERRORS.SCHOOL_CODE_INVALID).toBeDefined();
      expect(SCHOOL_ERRORS.CLASS_NOT_FOUND).toBeDefined();
      expect(SCHOOL_ERRORS.CLASS_CODE_INVALID).toBeDefined();
    });

    it("should have PIN_INVALID message", () => {
      expect(SCHOOL_ERRORS.PIN_INVALID).toBe("Invalid PIN");
    });

    it("should have STUDENT_ALREADY_IN_CLASS message", () => {
      expect(SCHOOL_ERRORS.STUDENT_ALREADY_IN_CLASS).toBe(
        "Student is already enrolled in this class"
      );
    });
  });

  describe("ADMIN_ERRORS", () => {
    it("should have admin-related error messages", () => {
      expect(ADMIN_ERRORS.ADMIN_NOT_FOUND).toBeDefined();
      expect(ADMIN_ERRORS.INVALID_ADMIN_CODE).toBeDefined();
      expect(ADMIN_ERRORS.ADMIN_ALREADY_EXISTS).toBeDefined();
    });

    it("should have CANNOT_DELETE_SELF message", () => {
      expect(ADMIN_ERRORS.CANNOT_DELETE_SELF).toBe(
        "You cannot delete your own account"
      );
    });

    it("should have INSUFFICIENT_PERMISSIONS message", () => {
      expect(ADMIN_ERRORS.INSUFFICIENT_PERMISSIONS).toBe(
        "Insufficient permissions for this operation"
      );
    });
  });

  describe("STUDENT_ERRORS", () => {
    it("should have student-related error messages", () => {
      expect(STUDENT_ERRORS.STUDENT_NOT_FOUND).toBeDefined();
      expect(STUDENT_ERRORS.PROFILE_UPDATE_FAILED).toBeDefined();
      expect(STUDENT_ERRORS.PROGRESS_NOT_FOUND).toBeDefined();
    });
  });

  describe("TEACHER_ERRORS", () => {
    it("should have teacher-related error messages", () => {
      expect(TEACHER_ERRORS.TEACHER_NOT_FOUND).toBeDefined();
      expect(TEACHER_ERRORS.CLASS_NOT_OWNED).toBeDefined();
    });

    it("should have class deletion restriction message", () => {
      expect(TEACHER_ERRORS.CANNOT_DELETE_CLASS_WITH_STUDENTS).toBe(
        "Cannot delete class with enrolled students"
      );
    });
  });

  describe("ASSESSMENT_ERRORS", () => {
    it("should have assessment-related error messages", () => {
      expect(ASSESSMENT_ERRORS.QUESTION_NOT_FOUND).toBeDefined();
      expect(ASSESSMENT_ERRORS.ANSWER_INVALID).toBeDefined();
      expect(ASSESSMENT_ERRORS.SUBMISSION_FAILED).toBeDefined();
      expect(ASSESSMENT_ERRORS.TIME_EXCEEDED).toBeDefined();
    });
  });

  describe("AI_ERRORS", () => {
    it("should have AI-related error messages", () => {
      expect(AI_ERRORS.AI_REQUEST_FAILED).toBeDefined();
      expect(AI_ERRORS.TEXT_TO_SPEECH_FAILED).toBeDefined();
      expect(AI_ERRORS.CURRICULUM_NOT_FOUND).toBeDefined();
    });

    it("should have RATE_LIMIT_EXCEEDED message", () => {
      expect(AI_ERRORS.RATE_LIMIT_EXCEEDED).toBe(
        "Rate limit exceeded. Please try again later"
      );
    });
  });

  describe("FILE_ERRORS", () => {
    it("should have file-related error messages", () => {
      expect(FILE_ERRORS.FILE_TOO_LARGE).toBeDefined();
      expect(FILE_ERRORS.INVALID_FILE_TYPE).toBeDefined();
      expect(FILE_ERRORS.UPLOAD_FAILED).toBeDefined();
      expect(FILE_ERRORS.EXPORT_FAILED).toBeDefined();
    });
  });

  describe("OPERATIONAL_ERRORS", () => {
    it("should have generic operational error messages", () => {
      expect(OPERATIONAL_ERRORS.OPERATION_FAILED).toBeDefined();
      expect(OPERATIONAL_ERRORS.NETWORK_ERROR).toBeDefined();
      expect(OPERATIONAL_ERRORS.SERVER_ERROR).toBeDefined();
    });
  });

  describe("SUCCESS_MESSAGES", () => {
    it("should have CRUD success messages", () => {
      expect(SUCCESS_MESSAGES.CREATED_SUCCESSFULLY).toBe("Created successfully");
      expect(SUCCESS_MESSAGES.UPDATED_SUCCESSFULLY).toBe("Updated successfully");
      expect(SUCCESS_MESSAGES.DELETED_SUCCESSFULLY).toBe("Deleted successfully");
    });

    it("should have action completion messages", () => {
      expect(SUCCESS_MESSAGES.SAVED_SUCCESSFULLY).toBeDefined();
      expect(SUCCESS_MESSAGES.SUBMITTED_SUCCESSFULLY).toBeDefined();
      expect(SUCCESS_MESSAGES.ACTION_COMPLETED).toBeDefined();
    });
  });

  describe("VALIDATION_ERRORS", () => {
    it("should have validation error messages", () => {
      expect(VALIDATION_ERRORS.INVALID_EMAIL).toBeDefined();
      expect(VALIDATION_ERRORS.INVALID_PHONE).toBeDefined();
      expect(VALIDATION_ERRORS.PASSWORD_TOO_SHORT).toBeDefined();
    });

    it("should mention minimum password length", () => {
      expect(VALIDATION_ERRORS.PASSWORD_TOO_SHORT).toContain("8 characters");
    });
  });

  describe("getErrorMessage", () => {
    it("should return string error directly", () => {
      expect(getErrorMessage("Custom error")).toBe("Custom error");
    });

    it("should return Error message", () => {
      const error = new Error("Error message");
      expect(getErrorMessage(error)).toBe("Error message");
    });

    it("should return fallback for unknown types", () => {
      expect(getErrorMessage(null)).toBe(OPERATIONAL_ERRORS.OPERATION_FAILED);
      expect(getErrorMessage(undefined)).toBe(OPERATIONAL_ERRORS.OPERATION_FAILED);
      expect(getErrorMessage(123)).toBe(OPERATIONAL_ERRORS.OPERATION_FAILED);
    });

    it("should use custom fallback", () => {
      expect(getErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
    });
  });
});
