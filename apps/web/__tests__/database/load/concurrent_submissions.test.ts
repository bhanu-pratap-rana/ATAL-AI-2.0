/**
 * Load Testing: Concurrent Assessment Submissions
 * Tests system capacity with multiple concurrent users
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { DatabaseTestManager } from '../setup/database-manager';

describe('Load Test: Concurrent Assessment Submissions', () => {
  let dbTest: DatabaseTestManager;

  beforeEach(async () => {
    dbTest = new DatabaseTestManager();
  });

  afterEach(async () => {
    await dbTest.cleanup();
  });

  it('should handle 50 concurrent submissions', async () => {
    const CONCURRENT_USERS = 50;

    const userSessions: Array<{ userId: string; sessionId: string }> = [];
    const serviceClient = dbTest.getServiceRoleClient();

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const userId = await dbTest.createTestUser('student', `load-user-${i}`);
      const { data: session, error } = await serviceClient
        .from('assessment_sessions')
        .insert({
          user_id: userId,
          assessment_type: 'diagnostic',
          status: 'in_progress',
        })
        .select()
        .single();

      if (error || !session) {
        throw new Error(`Failed to create session for user ${userId}`);
      }

      userSessions.push({ userId, sessionId: session.id });
    }

    const startTime = Date.now();

    const submissionPromises = userSessions.map(({ userId, sessionId }) => {
      const responses = [
        {
          item_id: 'test-item-1',
          user_response: 'A',
          is_correct: true,
          rt_ms: 45,
          focus_blur_count: 0,
          chosen_option: 'A',
        },
      ];

      return dbTest.executeRPC(
        'submit_assessment',
        {
          p_session_id: sessionId,
          p_user_id: userId,
          p_responses: responses,
        },
        userId
      );
    });

    const results = await Promise.allSettled(submissionPromises);
    const duration = Date.now() - startTime;

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const throughput = (CONCURRENT_USERS / duration) * 1000;

    expect(successCount).toBe(CONCURRENT_USERS);
    expect(duration).toBeLessThan(30000);
    expect(throughput).toBeGreaterThan(0.5);
  }, 60000);

  it('should handle 100 concurrent submissions', async () => {
    const CONCURRENT_USERS = 100;

    const userSessions: Array<{ userId: string; sessionId: string }> = [];
    const serviceClient = dbTest.getServiceRoleClient();

    for (let i = 0; i < CONCURRENT_USERS; i++) {
      const userId = await dbTest.createTestUser('student', `load-100-user-${i}`);
      const { data: session, error } = await serviceClient
        .from('assessment_sessions')
        .insert({
          user_id: userId,
          assessment_type: 'diagnostic',
          status: 'in_progress',
        })
        .select()
        .single();

      if (error || !session) {
        throw new Error(`Failed to create session for user ${userId}`);
      }

      userSessions.push({ userId, sessionId: session.id });
    }

    const startTime = Date.now();

    const submissionPromises = userSessions.map(({ userId, sessionId }) => {
      const responses = [
        {
          item_id: 'test-item-1',
          user_response: 'A',
          is_correct: true,
          rt_ms: 45,
          focus_blur_count: 0,
          chosen_option: 'A',
        },
      ];

      return dbTest.executeRPC(
        'submit_assessment',
        {
          p_session_id: sessionId,
          p_user_id: userId,
          p_responses: responses,
        },
        userId
      );
    });

    const results = await Promise.allSettled(submissionPromises);
    const duration = Date.now() - startTime;

    const successCount = results.filter((r) => r.status === 'fulfilled').length;

    expect(successCount).toBeGreaterThanOrEqual(CONCURRENT_USERS * 0.95);
    expect(duration).toBeLessThan(60000);
  }, 90000);

  it('should not have race conditions', async () => {
    const userId = await dbTest.createTestUser('student', 'race-test-user');
    const serviceClient = dbTest.getServiceRoleClient();

    const { data: session } = await serviceClient
      .from('assessment_sessions')
      .insert({
        user_id: userId,
        assessment_type: 'diagnostic',
        status: 'in_progress',
      })
      .select()
      .single();

    if (!session) throw new Error('Failed to create session');

    const responses = [
      {
        item_id: 'test-item-1',
        user_response: 'A',
        is_correct: true,
        rt_ms: 45,
        focus_blur_count: 0,
        chosen_option: 'A',
      },
    ];

    const submissionPromises = Array.from({ length: 5 }, () =>
      dbTest.executeRPC(
        'submit_assessment',
        {
          p_session_id: session.id,
          p_user_id: userId,
          p_responses: responses,
        },
        userId
      )
    );

    const results = await Promise.allSettled(submissionPromises);
    const successfulResults = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value);

    const scores = successfulResults.map((r) => r.score);

    expect(successfulResults.length).toBe(5);
    expect(new Set(scores).size).toBe(1);
  }, 30000);
});
