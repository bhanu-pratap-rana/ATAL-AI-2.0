/**
 * Tests for validation-limits constants
 * Target: ~15 tests covering all validation limit categories
 */

import {
  AI_CONTENT_LIMITS,
  PROFILE_LIMITS,
  SCHOOL_LIMITS,
  ASSESSMENT_LIMITS,
  QUERY_LIMITS,
  PIN_LIMITS,
} from "@/lib/constants/validation-limits";

describe("validation-limits", () => {
  describe("AI_CONTENT_LIMITS", () => {
    it("should have question length limits", () => {
      expect(AI_CONTENT_LIMITS.questionMinLength).toBe(3);
      expect(AI_CONTENT_LIMITS.questionMaxLength).toBe(2000);
    });

    it("should have essay length limits", () => {
      expect(AI_CONTENT_LIMITS.essayMinLength).toBe(50);
      expect(AI_CONTENT_LIMITS.essayMaxLength).toBe(10000);
    });

    it("should have practice question count limits", () => {
      expect(AI_CONTENT_LIMITS.practiceQuestionsMin).toBe(1);
      expect(AI_CONTENT_LIMITS.practiceQuestionsMax).toBe(20);
    });

    it("should have content summarization limits", () => {
      expect(AI_CONTENT_LIMITS.contentMinLength).toBe(100);
      expect(AI_CONTENT_LIMITS.contentMaxLength).toBe(15000);
    });

    it("should have TTS max length", () => {
      expect(AI_CONTENT_LIMITS.ttsMaxLength).toBe(1000);
    });

    it("should have min less than max for all ranges", () => {
      expect(AI_CONTENT_LIMITS.questionMinLength).toBeLessThan(
        AI_CONTENT_LIMITS.questionMaxLength
      );
      expect(AI_CONTENT_LIMITS.essayMinLength).toBeLessThan(
        AI_CONTENT_LIMITS.essayMaxLength
      );
      expect(AI_CONTENT_LIMITS.contentMinLength).toBeLessThan(
        AI_CONTENT_LIMITS.contentMaxLength
      );
    });
  });

  describe("PROFILE_LIMITS", () => {
    it("should have name length limits", () => {
      expect(PROFILE_LIMITS.nameMinLength).toBe(2);
      expect(PROFILE_LIMITS.nameMaxLength).toBe(100);
    });

    it("should have email max length", () => {
      expect(PROFILE_LIMITS.emailMaxLength).toBe(255);
    });

    it("should have roll number max length", () => {
      expect(PROFILE_LIMITS.rollNumberMaxLength).toBe(50);
    });
  });

  describe("SCHOOL_LIMITS", () => {
    it("should have school code max length", () => {
      expect(SCHOOL_LIMITS.schoolCodeMaxLength).toBe(20);
    });

    it("should have class name max length", () => {
      expect(SCHOOL_LIMITS.classNameMaxLength).toBe(100);
    });

    it("should have subject max length", () => {
      expect(SCHOOL_LIMITS.subjectMaxLength).toBe(100);
    });

    it("should have search query max length", () => {
      expect(SCHOOL_LIMITS.searchQueryMaxLength).toBe(100);
    });
  });

  describe("ASSESSMENT_LIMITS", () => {
    it("should have item ID max length", () => {
      expect(ASSESSMENT_LIMITS.itemIdMaxLength).toBe(100);
    });

    it("should have module name max length", () => {
      expect(ASSESSMENT_LIMITS.moduleNameMaxLength).toBe(100);
    });

    it("should have focus blur count max", () => {
      expect(ASSESSMENT_LIMITS.focusBlurCountMax).toBe(10000);
    });

    it("should have responses max count", () => {
      expect(ASSESSMENT_LIMITS.responsesMaxCount).toBe(1000);
    });
  });

  describe("QUERY_LIMITS", () => {
    it("should have search results limits", () => {
      expect(QUERY_LIMITS.searchResultsDefault).toBe(20);
      expect(QUERY_LIMITS.searchResultsMax).toBe(100);
    });

    it("should have pagination default", () => {
      expect(QUERY_LIMITS.paginationDefault).toBe(25);
    });

    it("should have default less than max for search results", () => {
      expect(QUERY_LIMITS.searchResultsDefault).toBeLessThan(
        QUERY_LIMITS.searchResultsMax
      );
    });
  });

  describe("PIN_LIMITS", () => {
    it("should have 4-digit PIN range", () => {
      expect(PIN_LIMITS.min).toBe(1000);
      expect(PIN_LIMITS.max).toBe(9999);
    });

    it("should have PIN length of 4", () => {
      expect(PIN_LIMITS.length).toBe(4);
    });

    it("should have valid 4-digit range", () => {
      // 1000-9999 covers all 4-digit numbers
      expect(PIN_LIMITS.min.toString().length).toBe(PIN_LIMITS.length);
      expect(PIN_LIMITS.max.toString().length).toBe(PIN_LIMITS.length);
    });

    it("should have min less than max", () => {
      expect(PIN_LIMITS.min).toBeLessThan(PIN_LIMITS.max);
    });
  });
});
