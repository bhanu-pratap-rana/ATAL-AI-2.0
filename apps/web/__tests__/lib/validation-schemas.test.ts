/**
 * Tests for validation-schemas.ts
 * Tests all Zod validation schemas
 */

import {
  JoinClassSchema,
  StudentProfileSchema,
  CreateClassSchema,
  SearchQuerySchema,
  SchoolCodeSchema,
  StaffPinSchema,
  TeacherNameSchema,
  PhoneSchema,
  AssessmentResponseSchema,
  AssessmentSubmitSchema,
  AdminEmailSchema,
  AdminPasswordSchema,
  ClassIdSchema,
  UserIdSchema,
  StudentIdSchema,
  UpdateClassSchema,
  EnrollmentSchema,
  AuthEmailSchema,
  AuthPasswordSchema,
  OtpTokenSchema,
  UsernameSchema,
} from "@/lib/validation-schemas";

describe("validation-schemas", () => {
  describe("JoinClassSchema", () => {
    it("should validate correct class code and PIN", () => {
      const result = JoinClassSchema.safeParse({
        classCode: "ABC-123",
        pin: "1234",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty class code", () => {
      const result = JoinClassSchema.safeParse({
        classCode: "",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid class code format", () => {
      const result = JoinClassSchema.safeParse({
        classCode: "abc_lowercase",
        pin: "1234",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid PIN length", () => {
      const result = JoinClassSchema.safeParse({
        classCode: "ABC-123",
        pin: "123", // Too short
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-digit PIN", () => {
      const result = JoinClassSchema.safeParse({
        classCode: "ABC-123",
        pin: "abcd",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("StudentProfileSchema", () => {
    it("should validate correct profile", () => {
      const result = StudentProfileSchema.safeParse({
        name: "John Doe",
        gender: "male",
      });
      expect(result.success).toBe(true);
    });

    it("should validate female gender", () => {
      const result = StudentProfileSchema.safeParse({
        name: "Jane Doe",
        gender: "female",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = StudentProfileSchema.safeParse({
        name: "",
        gender: "male",
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid gender", () => {
      const result = StudentProfileSchema.safeParse({
        name: "Test",
        gender: "other",
      });
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const result = StudentProfileSchema.safeParse({
        name: "Test Student",
        gender: "male",
        phone: "1234567890",
        rollNumber: "101",
        schoolName: "Test School",
        className: "Grade 5",
        village: "Test Village",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("CreateClassSchema", () => {
    it("should validate class creation data", () => {
      const result = CreateClassSchema.safeParse({
        name: "Math Class",
        subject: "Mathematics",
      });
      expect(result.success).toBe(true);
    });

    it("should allow optional subject", () => {
      const result = CreateClassSchema.safeParse({
        name: "Science Class",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty class name", () => {
      const result = CreateClassSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("SearchQuerySchema", () => {
    it("should validate simple search query", () => {
      const result = SearchQuerySchema.safeParse("test school");
      expect(result.success).toBe(true);
    });

    it("should reject empty search", () => {
      const result = SearchQuerySchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject special characters", () => {
      const result = SearchQuerySchema.safeParse("test@school<script>");
      expect(result.success).toBe(false);
    });

    it("should allow apostrophes and hyphens", () => {
      const result = SearchQuerySchema.safeParse("St. Mary's High-School");
      expect(result.success).toBe(true);
    });
  });

  describe("SchoolCodeSchema", () => {
    it("should validate valid school code", () => {
      const result = SchoolCodeSchema.safeParse("SCHOOL123");
      expect(result.success).toBe(true);
    });

    it("should reject empty school code", () => {
      const result = SchoolCodeSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("StaffPinSchema", () => {
    it("should validate 4-digit PIN", () => {
      const result = StaffPinSchema.safeParse("1234");
      expect(result.success).toBe(true);
    });

    it("should validate 8-digit PIN", () => {
      const result = StaffPinSchema.safeParse("12345678");
      expect(result.success).toBe(true);
    });

    it("should reject 3-digit PIN", () => {
      const result = StaffPinSchema.safeParse("123");
      expect(result.success).toBe(false);
    });

    it("should reject 9-digit PIN", () => {
      const result = StaffPinSchema.safeParse("123456789");
      expect(result.success).toBe(false);
    });

    it("should reject non-digit PIN", () => {
      const result = StaffPinSchema.safeParse("abcd");
      expect(result.success).toBe(false);
    });
  });

  describe("TeacherNameSchema", () => {
    it("should validate simple name", () => {
      const result = TeacherNameSchema.safeParse("John Doe");
      expect(result.success).toBe(true);
    });

    it("should validate name with apostrophe", () => {
      const result = TeacherNameSchema.safeParse("O'Brien");
      expect(result.success).toBe(true);
    });

    it("should validate hyphenated name", () => {
      const result = TeacherNameSchema.safeParse("Mary-Jane");
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = TeacherNameSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject numbers in name", () => {
      const result = TeacherNameSchema.safeParse("John123");
      expect(result.success).toBe(false);
    });
  });

  describe("PhoneSchema", () => {
    it("should validate phone number", () => {
      const result = PhoneSchema.safeParse("+1-555-555-5555");
      expect(result.success).toBe(true);
    });

    it("should accept undefined (optional)", () => {
      const result = PhoneSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it("should reject too short phone", () => {
      const result = PhoneSchema.safeParse("123");
      expect(result.success).toBe(false);
    });
  });

  describe("AssessmentResponseSchema", () => {
    it("should validate correct response", () => {
      const result = AssessmentResponseSchema.safeParse({
        itemId: "item-1",
        module: "math",
        isCorrect: true,
        rtMs: 1500,
        focusBlurCount: 2,
        chosenOption: "A",
      });
      expect(result.success).toBe(true);
    });

    it("should reject negative response time", () => {
      const result = AssessmentResponseSchema.safeParse({
        itemId: "item-1",
        module: "math",
        isCorrect: true,
        rtMs: -100,
        focusBlurCount: 0,
        chosenOption: "A",
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative focus blur count", () => {
      const result = AssessmentResponseSchema.safeParse({
        itemId: "item-1",
        module: "math",
        isCorrect: true,
        rtMs: 1500,
        focusBlurCount: -1,
        chosenOption: "A",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AssessmentSubmitSchema", () => {
    it("should validate correct submission", () => {
      const result = AssessmentSubmitSchema.safeParse({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        responses: [
          {
            itemId: "item-1",
            module: "math",
            isCorrect: true,
            rtMs: 1500,
            focusBlurCount: 0,
            chosenOption: "A",
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid session ID (not UUID)", () => {
      const result = AssessmentSubmitSchema.safeParse({
        sessionId: "not-a-uuid",
        responses: [
          {
            itemId: "item-1",
            module: "math",
            isCorrect: true,
            rtMs: 1500,
            focusBlurCount: 0,
            chosenOption: "A",
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("should reject empty responses array", () => {
      const result = AssessmentSubmitSchema.safeParse({
        sessionId: "550e8400-e29b-41d4-a716-446655440000",
        responses: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AdminEmailSchema", () => {
    it("should validate and transform email to lowercase", () => {
      const result = AdminEmailSchema.safeParse("Admin@Example.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("admin@example.com");
      }
    });

    it("should reject invalid email", () => {
      const result = AdminEmailSchema.safeParse("not-an-email");
      expect(result.success).toBe(false);
    });

    it("should reject empty email", () => {
      const result = AdminEmailSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });

  describe("AdminPasswordSchema", () => {
    it("should validate 8+ character password", () => {
      const result = AdminPasswordSchema.safeParse("password123");
      expect(result.success).toBe(true);
    });

    it("should reject short password", () => {
      const result = AdminPasswordSchema.safeParse("short");
      expect(result.success).toBe(false);
    });
  });

  describe("UUID Schemas", () => {
    const validUuid = "550e8400-e29b-41d4-a716-446655440000";
    const invalidUuid = "not-a-uuid";

    it("ClassIdSchema should validate UUID", () => {
      expect(ClassIdSchema.safeParse(validUuid).success).toBe(true);
      expect(ClassIdSchema.safeParse(invalidUuid).success).toBe(false);
    });

    it("UserIdSchema should validate UUID", () => {
      expect(UserIdSchema.safeParse(validUuid).success).toBe(true);
      expect(UserIdSchema.safeParse(invalidUuid).success).toBe(false);
    });

    it("StudentIdSchema should validate UUID", () => {
      expect(StudentIdSchema.safeParse(validUuid).success).toBe(true);
      expect(StudentIdSchema.safeParse(invalidUuid).success).toBe(false);
    });
  });

  describe("UpdateClassSchema", () => {
    it("should validate update class data", () => {
      const result = UpdateClassSchema.safeParse({
        classId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Updated Class",
        subject: "Science",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid class ID", () => {
      const result = UpdateClassSchema.safeParse({
        classId: "invalid",
        name: "Updated Class",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("EnrollmentSchema", () => {
    it("should validate enrollment data", () => {
      const result = EnrollmentSchema.safeParse({
        classId: "550e8400-e29b-41d4-a716-446655440000",
        studentId: "550e8400-e29b-41d4-a716-446655440001",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid UUIDs", () => {
      const result = EnrollmentSchema.safeParse({
        classId: "invalid",
        studentId: "invalid",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("AuthEmailSchema", () => {
    it("should validate and transform email to lowercase", () => {
      const result = AuthEmailSchema.safeParse("USER@Example.COM");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("user@example.com");
      }
    });

    it("should reject invalid email", () => {
      const result = AuthEmailSchema.safeParse("not-valid");
      expect(result.success).toBe(false);
    });
  });

  describe("AuthPasswordSchema", () => {
    it("should validate strong password", () => {
      const result = AuthPasswordSchema.safeParse("Password1!");
      expect(result.success).toBe(true);
    });

    it("should reject password without uppercase", () => {
      const result = AuthPasswordSchema.safeParse("password1!");
      expect(result.success).toBe(false);
    });

    it("should reject password without lowercase", () => {
      const result = AuthPasswordSchema.safeParse("PASSWORD1!");
      expect(result.success).toBe(false);
    });

    it("should reject password without number", () => {
      const result = AuthPasswordSchema.safeParse("Password!");
      expect(result.success).toBe(false);
    });

    it("should reject password without special character", () => {
      const result = AuthPasswordSchema.safeParse("Password1");
      expect(result.success).toBe(false);
    });

    it("should reject short password", () => {
      const result = AuthPasswordSchema.safeParse("Pass1!");
      expect(result.success).toBe(false);
    });
  });

  describe("OtpTokenSchema", () => {
    it("should validate digit-only OTP", () => {
      const result = OtpTokenSchema.safeParse("123456");
      expect(result.success).toBe(true);
    });

    it("should reject empty OTP", () => {
      const result = OtpTokenSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("should reject non-digit OTP", () => {
      const result = OtpTokenSchema.safeParse("abc123");
      expect(result.success).toBe(false);
    });
  });

  describe("UsernameSchema", () => {
    it("should validate and transform username to lowercase", () => {
      const result = UsernameSchema.safeParse("JohnDoe");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("johndoe");
      }
    });

    it("should allow underscores", () => {
      const result = UsernameSchema.safeParse("john_doe");
      expect(result.success).toBe(true);
    });

    it("should allow numbers after first character", () => {
      const result = UsernameSchema.safeParse("john123");
      expect(result.success).toBe(true);
    });

    it("should reject username starting with number", () => {
      const result = UsernameSchema.safeParse("123john");
      expect(result.success).toBe(false);
    });

    it("should reject short username", () => {
      const result = UsernameSchema.safeParse("ab");
      expect(result.success).toBe(false);
    });

    it("should reject username with special characters", () => {
      const result = UsernameSchema.safeParse("john@doe");
      expect(result.success).toBe(false);
    });
  });
});
