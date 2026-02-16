/**
 * Tests for Learning Profile Database Queries
 * Tests CRUD operations for learning style profiles
 */

import {
  fetchLearningStyleProfile,
  createDefaultProfile,
  updateLearningStyleProfile,
  getOrCreateLearningProfile,
} from "@/lib/database/learning-profile-queries";

// Mock auth-logger
jest.mock("@/lib/auth-logger", () => ({
  authLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock supabase-server
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockMaybeSingle = jest.fn();
const mockInsert = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createClient: () =>
    Promise.resolve({
      from: mockFrom,
    }),
}));

describe("Learning Profile Database Queries", () => {
  const studentId = "student-123-uuid";

  const mockProfile = {
    id: "profile-123",
    student_id: studentId,
    visual_score: 40,
    text_score: 35,
    auditory_score: 25,
    preferred_style: "visual",
    images_viewed: 100,
    voice_replays: 50,
    text_read_time_seconds: 3600,
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up chain mocks
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ maybeSingle: mockMaybeSingle, eq: mockEq });
    mockInsert.mockReturnValue({ select: mockSelect });
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  describe("fetchLearningStyleProfile", () => {
    it("should return profile when found", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await fetchLearningStyleProfile(studentId);

      expect(result).toEqual(mockProfile);
      expect(mockFrom).toHaveBeenCalledWith("learning_style_profile");
      expect(mockEq).toHaveBeenCalledWith("student_id", studentId);
    });

    it("should return null when profile not found", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await fetchLearningStyleProfile(studentId);

      expect(result).toBeNull();
    });

    it("should return null on database error", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });

      const result = await fetchLearningStyleProfile(studentId);

      expect(result).toBeNull();
    });

    it("should return null on exception", async () => {
      mockMaybeSingle.mockRejectedValue(new Error("Network failure"));

      const result = await fetchLearningStyleProfile(studentId);

      expect(result).toBeNull();
    });
  });

  describe("createDefaultProfile", () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({ single: mockSingle });
    });

    it("should create default profile with equal distribution", async () => {
      mockSingle.mockResolvedValue({
        data: {
          ...mockProfile,
          visual_score: 33.33,
          text_score: 33.33,
          auditory_score: 33.33,
        },
        error: null,
      });

      const result = await createDefaultProfile(studentId);

      expect(result).toBeDefined();
      expect(mockFrom).toHaveBeenCalledWith("learning_style_profile");
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          student_id: studentId,
          visual_score: 33.33,
          text_score: 33.33,
          auditory_score: 33.33,
          images_viewed: 0,
          voice_replays: 0,
          text_read_time_seconds: 0,
        })
      );
    });

    it("should return null on database error", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Duplicate entry" },
      });

      const result = await createDefaultProfile(studentId);

      expect(result).toBeNull();
    });

    it("should return null on exception", async () => {
      mockSingle.mockRejectedValue(new Error("Connection timeout"));

      const result = await createDefaultProfile(studentId);

      expect(result).toBeNull();
    });
  });

  describe("updateLearningStyleProfile", () => {
    it("should successfully update profile scores", async () => {
      mockEq.mockResolvedValue({ error: null });

      const updates = {
        visual_score: 45,
        text_score: 30,
        auditory_score: 25,
      };

      const result = await updateLearningStyleProfile(studentId, updates);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith("learning_style_profile");
      expect(mockUpdate).toHaveBeenCalledWith(updates);
      expect(mockEq).toHaveBeenCalledWith("student_id", studentId);
    });

    it("should update preferred style", async () => {
      mockEq.mockResolvedValue({ error: null });

      const updates = {
        preferred_style: "auditory" as const,
      };

      const result = await updateLearningStyleProfile(studentId, updates);

      expect(result).toBe(true);
    });

    it("should update interaction counts", async () => {
      mockEq.mockResolvedValue({ error: null });

      const updates = {
        images_viewed: 150,
        voice_replays: 75,
        text_read_time_seconds: 7200,
      };

      const result = await updateLearningStyleProfile(studentId, updates);

      expect(result).toBe(true);
    });

    it("should return false on database error", async () => {
      mockEq.mockResolvedValue({
        error: { message: "Update failed" },
      });

      const result = await updateLearningStyleProfile(studentId, {
        visual_score: 50,
      });

      expect(result).toBe(false);
    });

    it("should return false on exception", async () => {
      mockEq.mockRejectedValue(new Error("Network error"));

      const result = await updateLearningStyleProfile(studentId, {
        visual_score: 50,
      });

      expect(result).toBe(false);
    });
  });

  describe("getOrCreateLearningProfile", () => {
    beforeEach(() => {
      mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle,
      });
    });

    it("should return existing profile when found", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: mockProfile,
        error: null,
      });

      const result = await getOrCreateLearningProfile(studentId);

      expect(result).toEqual(mockProfile);
      // Should only fetch, not create
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it("should create profile when not found", async () => {
      // First call returns null (profile not found)
      mockMaybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Second call for insert returns new profile
      mockSingle.mockResolvedValue({
        data: {
          ...mockProfile,
          visual_score: 33.33,
          text_score: 33.33,
          auditory_score: 33.33,
        },
        error: null,
      });

      const result = await getOrCreateLearningProfile(studentId);

      expect(result).toBeDefined();
      expect(mockInsert).toHaveBeenCalled();
    });

    it("should return null when both fetch and create fail", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Creation failed" },
      });

      const result = await getOrCreateLearningProfile(studentId);

      expect(result).toBeNull();
    });
  });
});
