/**
 * Gamification Service Tests
 *
 * Tests for badge system, points, achievements, and leaderboards.
 * Coverage: ~50 tests for GamificationService class
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Mock modules before importing
const mockCreateClient = jest.fn();
const mockAuthLoggerError = jest.fn();
const mockAuthLoggerWarn = jest.fn();
const mockAuthLoggerInfo = jest.fn();

jest.mock('@/lib/supabase-server', () => ({
  createClient: mockCreateClient,
}));

jest.mock('@/lib/auth-logger', () => ({
  authLogger: {
    error: mockAuthLoggerError,
    warn: mockAuthLoggerWarn,
    info: mockAuthLoggerInfo,
  },
}));

// Import after mocks are set up
import { GamificationService, gamificationService } from '@/lib/services/gamification-service';

// Test data factories
const createMockBadge = (overrides = {}) => ({
  id: 'badge-123',
  name_en: 'First Steps',
  name_hi: 'पहला कदम',
  name_as: 'প্ৰথম খোজ',
  description: 'Complete your first lesson',
  icon: 'star',
  unlock_criteria: { type: 'first_lesson' },
  cultural_note: 'Begin your journey',
  rarity: 'common',
  points_value: 10,
  ...overrides,
});

const createMockPointsEntry = (overrides = {}) => ({
  id: 'points-123',
  student_id: 'student-123',
  points: 10,
  source: 'lesson',
  description: 'Completed lesson',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockStudentBadge = (overrides = {}) => ({
  id: 'sb-123',
  student_id: 'student-123',
  badge_id: 'badge-123',
  earned_at: '2024-01-01T00:00:00Z',
  badge: createMockBadge(),
  ...overrides,
});

const createMockEnrollment = (overrides = {}) => ({
  id: 'enrollment-123',
  student_id: 'student-123',
  class_id: 'class-123',
  ...overrides,
});

// Helper to create mock Supabase query builder
const createMockQueryBuilder = (data: unknown[] = [], error: Error | null = null) => {
  const builder: Record<string, jest.Mock> = {};

  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit'];

  methods.forEach(method => {
    builder[method] = jest.fn().mockReturnValue(builder);
  });

  // Terminal methods
  builder.single = jest.fn().mockResolvedValue({ data: data[0] || null, error });
  builder.maybeSingle = jest.fn().mockResolvedValue({ data: data[0] || null, error });

  // Make thenable - return data and count
  builder.then = jest.fn().mockImplementation((resolve) =>
    resolve({ data, error, count: data.length })
  );

  return builder;
};

describe('GamificationService', () => {
  let service: GamificationService;
  let mockSupabase: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new GamificationService();

    // Setup default mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnValue(createMockQueryBuilder()),
      rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // =====================================================
  // checkAndAwardBadges Tests
  // =====================================================
  describe('checkAndAwardBadges', () => {
    it('should return awarded badges from RPC', async () => {
      const mockAwardedBadges = [
        {
          badge_id: 'badge-1',
          badge_name_en: 'First Steps',
          badge_name_hi: 'पहला कदम',
          badge_name_as: 'প্ৰথম খোজ',
          points_awarded: 10,
        },
      ];
      mockSupabase.rpc.mockResolvedValue({ data: mockAwardedBadges, error: null });

      const result = await service.checkAndAwardBadges('student-123');

      expect(result.length).toBe(1);
      expect(result[0].id).toBe('badge-1');
      expect(result[0].name_en).toBe('First Steps');
    });

    it('should return empty array when no badges awarded', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await service.checkAndAwardBadges('student-123');

      expect(result).toEqual([]);
    });

    it('should return empty array on RPC error', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } });

      const result = await service.checkAndAwardBadges('student-123');

      expect(result).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should handle null response from RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

      const result = await service.checkAndAwardBadges('student-123');

      expect(result).toEqual([]);
    });

    it('should handle exceptions gracefully', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Network error'));

      const result = await service.checkAndAwardBadges('student-123');

      expect(result).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should call batch_check_and_award_badges RPC', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.checkAndAwardBadges('student-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'batch_check_and_award_badges',
        { p_student_id: 'student-123' }
      );
    });
  });

  // =====================================================
  // awardPoints Tests
  // =====================================================
  describe('awardPoints', () => {
    it('should insert points into points_history table', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await service.awardPoints('student-123', 10, 'lesson', 'Completed lesson');

      expect(mockSupabase.from).toHaveBeenCalledWith('points_history');
      expect(insertMock).toHaveBeenCalledWith({
        student_id: 'student-123',
        points: 10,
        source: 'lesson',
        description: 'Completed lesson',
      });
    });

    it('should handle insert errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Insert error')),
      });

      await service.awardPoints('student-123', 10, 'lesson');

      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should allow optional description', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue({
        insert: insertMock,
      });

      await service.awardPoints('student-123', 10, 'lesson');

      expect(insertMock).toHaveBeenCalledWith({
        student_id: 'student-123',
        points: 10,
        source: 'lesson',
        description: undefined,
      });
    });
  });

  // =====================================================
  // getTotalPoints Tests
  // =====================================================
  describe('getTotalPoints', () => {
    it('should sum all points for a student', async () => {
      const mockPoints = [
        { points: 10 },
        { points: 20 },
        { points: 15 },
      ];
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockPoints));

      const result = await service.getTotalPoints('student-123');

      expect(result).toBe(45);
    });

    it('should return 0 when no points exist', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      const result = await service.getTotalPoints('student-123');

      expect(result).toBe(0);
    });

    it('should return 0 on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockRejectedValue(new Error('Query error')),
      });

      const result = await service.getTotalPoints('student-123');

      expect(result).toBe(0);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should query points_history table', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      await service.getTotalPoints('student-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('points_history');
    });
  });

  // =====================================================
  // getStudentBadges Tests
  // =====================================================
  describe('getStudentBadges', () => {
    it('should return student badges with badge details', async () => {
      const mockBadges = [
        createMockStudentBadge(),
        createMockStudentBadge({ id: 'sb-456', badge_id: 'badge-456' }),
      ];
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockBadges));

      const result = await service.getStudentBadges('student-123');

      expect(result.length).toBe(2);
      expect(result[0].badge).toBeDefined();
    });

    it('should return empty array when no badges earned', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      const result = await service.getStudentBadges('student-123');

      expect(result).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockRejectedValue(new Error('Query error')),
      });

      const result = await service.getStudentBadges('student-123');

      expect(result).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should order badges by earned_at descending', async () => {
      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
      });

      await service.getStudentBadges('student-123');

      expect(orderMock).toHaveBeenCalledWith('earned_at', { ascending: false });
    });
  });

  // =====================================================
  // getPointsHistory Tests
  // =====================================================
  describe('getPointsHistory', () => {
    it('should return points history for a student', async () => {
      const mockHistory = [
        createMockPointsEntry(),
        createMockPointsEntry({ id: 'points-456', points: 20 }),
      ];
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockHistory));

      const result = await service.getPointsHistory('student-123');

      expect(result.length).toBe(2);
    });

    it('should respect limit parameter', async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      });

      await service.getPointsHistory('student-123', 5);

      expect(limitMock).toHaveBeenCalledWith(5);
    });

    it('should use default limit of 20', async () => {
      const limitMock = jest.fn().mockResolvedValue({ data: [], error: null });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: limitMock,
      });

      await service.getPointsHistory('student-123');

      expect(limitMock).toHaveBeenCalledWith(20);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Query error')),
      });

      const result = await service.getPointsHistory('student-123');

      expect(result).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should order by created_at descending', async () => {
      const orderMock = jest.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: orderMock,
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      });

      await service.getPointsHistory('student-123');

      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  // =====================================================
  // getClassLeaderboard Tests
  // =====================================================
  describe('getClassLeaderboard', () => {
    it('should return leaderboard with rankings', async () => {
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-1' }),
        createMockEnrollment({ student_id: 'student-2' }),
      ];
      const mockPoints = [
        { student_id: 'student-1', points: 100 },
        { student_id: 'student-1', points: 50 },
        { student_id: 'student-2', points: 200 },
      ];

      // Mock multiple queries
      let queryCount = 0;
      mockSupabase.from.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          // Enrollments query
          return createMockQueryBuilder(mockEnrollments);
        } else {
          // Points query
          return createMockQueryBuilder(mockPoints);
        }
      });

      const result = await service.getClassLeaderboard('class-123');

      expect(result.length).toBe(2);
      expect(result[0].rank).toBe(1);
      expect(result[0].points).toBe(200); // student-2 has highest
      expect(result[1].rank).toBe(2);
      expect(result[1].points).toBe(150); // student-1 has 100+50
    });

    it('should return empty array when no enrollments', async () => {
      mockSupabase.from.mockReturnValue(createMockQueryBuilder([]));

      const result = await service.getClassLeaderboard('class-123');

      expect(result).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-1' }),
        createMockEnrollment({ student_id: 'student-2' }),
        createMockEnrollment({ student_id: 'student-3' }),
      ];
      const mockPoints = [
        { student_id: 'student-1', points: 100 },
        { student_id: 'student-2', points: 200 },
        { student_id: 'student-3', points: 150 },
      ];

      let queryCount = 0;
      mockSupabase.from.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return createMockQueryBuilder(mockEnrollments);
        } else {
          return createMockQueryBuilder(mockPoints);
        }
      });

      const result = await service.getClassLeaderboard('class-123', 2);

      expect(result.length).toBe(2);
    });

    it('should return empty array on error', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockRejectedValue(new Error('Query error')),
      });

      const result = await service.getClassLeaderboard('class-123');

      expect(result).toEqual([]);
      expect(mockAuthLoggerError).toHaveBeenCalled();
    });

    it('should sort by points descending', async () => {
      const mockEnrollments = [
        createMockEnrollment({ student_id: 'student-low' }),
        createMockEnrollment({ student_id: 'student-high' }),
      ];
      const mockPoints = [
        { student_id: 'student-low', points: 10 },
        { student_id: 'student-high', points: 500 },
      ];

      let queryCount = 0;
      mockSupabase.from.mockImplementation(() => {
        queryCount++;
        if (queryCount === 1) {
          return createMockQueryBuilder(mockEnrollments);
        } else {
          return createMockQueryBuilder(mockPoints);
        }
      });

      const result = await service.getClassLeaderboard('class-123');

      expect(result[0].studentId).toBe('student-high');
      expect(result[1].studentId).toBe('student-low');
    });
  });

  // =====================================================
  // triggerActivityCheck Tests
  // =====================================================
  describe('triggerActivityCheck', () => {
    it('should award points for lesson activity', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.triggerActivityCheck('student-123', 'lesson');

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        points: 10,
        source: 'lesson',
      }));
    });

    it('should award points for question activity', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.triggerActivityCheck('student-123', 'question');

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        points: 5,
        source: 'question',
      }));
    });

    it('should award points for assessment activity', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.triggerActivityCheck('student-123', 'assessment');

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        points: 20,
        source: 'assessment',
      }));
    });

    it('should award points for voice activity', async () => {
      const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
      mockSupabase.from.mockReturnValue({ insert: insertMock });
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.triggerActivityCheck('student-123', 'voice');

      expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
        points: 15,
        source: 'voice',
      }));
    });

    it('should check and return awarded badges', async () => {
      const mockAwardedBadges = [
        {
          badge_id: 'badge-1',
          badge_name_en: 'First Steps',
          badge_name_hi: 'पहला कदम',
          badge_name_as: 'প্ৰথম খোজ',
          points_awarded: 10,
        },
      ];
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      mockSupabase.rpc.mockResolvedValue({ data: mockAwardedBadges, error: null });

      const result = await service.triggerActivityCheck('student-123', 'lesson');

      expect(result.length).toBe(1);
      expect(result[0].name_en).toBe('First Steps');
    });
  });

  // =====================================================
  // Singleton Export Test
  // =====================================================
  describe('Singleton export', () => {
    it('should export a singleton instance', () => {
      expect(gamificationService).toBeInstanceOf(GamificationService);
    });
  });

  // =====================================================
  // Points Aggregation Tests
  // =====================================================
  describe('Points Aggregation', () => {
    it('should aggregate multiple points entries correctly', async () => {
      const mockPoints = [
        { points: 10 },
        { points: -5 }, // Negative points (penalties)
        { points: 25 },
        { points: 10 },
      ];
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockPoints));

      const result = await service.getTotalPoints('student-123');

      expect(result).toBe(40); // 10 - 5 + 25 + 10
    });

    it('should handle single point entry', async () => {
      const mockPoints = [{ points: 100 }];
      mockSupabase.from.mockReturnValue(createMockQueryBuilder(mockPoints));

      const result = await service.getTotalPoints('student-123');

      expect(result).toBe(100);
    });
  });

  // =====================================================
  // Edge Cases Tests
  // =====================================================
  describe('Edge Cases', () => {
    it('should handle null data from database', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      const result = await service.getTotalPoints('student-123');

      expect(result).toBe(0);
    });

    it('should handle empty student ID', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      const result = await service.checkAndAwardBadges('');

      expect(result).toEqual([]);
    });

    it('should handle special characters in student ID', async () => {
      mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

      await service.checkAndAwardBadges('student-with-special-chars_123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'batch_check_and_award_badges',
        { p_student_id: 'student-with-special-chars_123' }
      );
    });
  });

  // =====================================================
  // Activity Points Mapping Tests
  // =====================================================
  describe('Activity Points Mapping', () => {
    const activityTests = [
      { activity: 'lesson' as const, expectedPoints: 10 },
      { activity: 'question' as const, expectedPoints: 5 },
      { activity: 'assessment' as const, expectedPoints: 20 },
      { activity: 'voice' as const, expectedPoints: 15 },
    ];

    activityTests.forEach(({ activity, expectedPoints }) => {
      it(`should award ${expectedPoints} points for ${activity} activity`, async () => {
        const insertMock = jest.fn().mockResolvedValue({ data: null, error: null });
        mockSupabase.from.mockReturnValue({ insert: insertMock });
        mockSupabase.rpc.mockResolvedValue({ data: [], error: null });

        await service.triggerActivityCheck('student-123', activity);

        expect(insertMock).toHaveBeenCalledWith(
          expect.objectContaining({ points: expectedPoints })
        );
      });
    });
  });
});
