/**
 * Database Test Manager
 * Manages test database operations, user creation, RPC execution, and cleanup
 *
 * Usage:
 * ```typescript
 * const dbTest = new DatabaseTestManager();
 *
 * // Create test user
 * const userId = await dbTest.createTestUser('student', 'test-student-1');
 *
 * // Execute RPC as user (with RLS enforcement)
 * const result = await dbTest.executeRPC('submit_assessment', {
 *   p_session_id: sessionId,
 *   p_user_id: userId,
 *   p_responses: responses,
 * }, userId);
 *
 * // Cleanup
 * await dbTest.cleanup();
 * ```
 */

import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { copycat } from '@snaplet/copycat';
import type { Database } from '@/types/supabase';

interface TestUser {
  email: string;
  password: string;
}

/**
 * Database Test Manager for RPC and RLS testing
 * Handles test user creation, session management, and RPC execution with proper user context
 */
export class DatabaseTestManager {
  private serviceRoleClient: SupabaseClient<Database>;
  private testUsers: Map<string, TestUser> = new Map();

  constructor() {
    // Create service role client for admin operations (bypasses RLS)
    this.serviceRoleClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );
  }

  /**
   * Create a test user with deterministic data
   * Uses Copycat for reproducible test data generation
   *
   * @param role - User role: 'student', 'teacher', 'admin'
   * @param seed - Optional seed for reproducibility
   * @returns User ID
   */
  async createTestUser(role: 'student' | 'teacher' | 'admin', seed?: string): Promise<string> {
    const userSeed = seed || `test-${role}-${Date.now()}`;
    const email = copycat.email(userSeed);
    const password = 'Test123!@#';

    try {
      const { data, error } = await this.serviceRoleClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
      });

      if (error || !data.user) {
        throw new Error(`Failed to create test user: ${error?.message || 'Unknown error'}`);
      }

      // Store credentials for later use (needed for session generation)
      this.testUsers.set(data.user.id, { email, password });

      console.log(`✅ Created ${role} test user: ${email}`);
      return data.user.id;
    } catch (error) {
      console.error(`❌ Failed to create test user:`, error);
      throw error;
    }
  }

  /**
   * Execute RPC function as a specific user (with RLS enforcement)
   * Generates a session for the user and executes the RPC with proper auth context
   *
   * @param functionName - RPC function name
   * @param params - RPC function parameters
   * @param userId - User ID to execute as
   * @returns RPC function result
   */
  async executeRPC<T>(
    functionName: string,
    params: Record<string, any>,
    userId: string
  ): Promise<T> {
    const user = this.testUsers.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found in test users`);
    }

    try {
      // Generate magic link for user authentication
      const { data, error } = await this.serviceRoleClient.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
      });

      if (error || !data.properties) {
        throw new Error(`Failed to generate session: ${error?.message || 'Unknown error'}`);
      }

      // Create user-scoped client with proper authentication
      const userClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Set user session (enables RLS enforcement)
      await userClient.auth.setSession({
        access_token: data.properties.access_token,
        refresh_token: data.properties.refresh_token,
      });

      // Execute RPC as the user (RLS policies will be enforced)
      const { data: rpcData, error: rpcError } = await userClient.rpc(
        functionName as any,
        params
      );

      if (rpcError) {
        throw new Error(`RPC error in ${functionName}: ${rpcError.message}`);
      }

      return rpcData as T;
    } catch (error) {
      console.error(`❌ RPC execution failed:`, error);
      throw error;
    }
  }

  /**
   * Get a user-scoped Supabase client for direct queries with RLS enforcement
   * Useful for testing RLS policies on direct table queries
   *
   * @param userId - User ID to create client for
   * @returns Authenticated Supabase client with user context
   */
  async getUserClient(userId: string): Promise<SupabaseClient<Database>> {
    const user = this.testUsers.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found in test users`);
    }

    try {
      const { data, error } = await this.serviceRoleClient.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email,
      });

      if (error || !data.properties) {
        throw new Error(`Failed to generate session: ${error?.message || 'Unknown error'}`);
      }

      const userClient = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      await userClient.auth.setSession({
        access_token: data.properties.access_token,
        refresh_token: data.properties.refresh_token,
      });

      return userClient;
    } catch (error) {
      console.error(`❌ Failed to get user client:`, error);
      throw error;
    }
  }

  /**
   * Get the service role client (bypasses RLS for admin operations)
   * Use this for setup/teardown operations
   *
   * @returns Service role Supabase client
   */
  getServiceRoleClient(): SupabaseClient<Database> {
    return this.serviceRoleClient;
  }

  /**
   * Get stored test user credentials
   * Useful for custom authentication scenarios
   *
   * @param userId - User ID
   * @returns Test user credentials or undefined
   */
  getTestUserCredentials(userId: string): TestUser | undefined {
    return this.testUsers.get(userId);
  }

  /**
   * Cleanup all test users (cascade deletes related data via RLS policies)
   * Should be called in afterEach/afterAll hooks
   */
  async cleanup(): Promise<void> {
    try {
      const userIds = Array.from(this.testUsers.keys());
      let successCount = 0;

      for (const userId of userIds) {
        const { error } = await this.serviceRoleClient.auth.admin.deleteUser(userId);
        if (!error) {
          successCount++;
        } else {
          console.warn(`Failed to delete test user ${userId}: ${error.message}`);
        }
      }

      this.testUsers.clear();
      console.log(`✅ Cleaned up ${successCount}/${userIds.length} test users`);
    } catch (error) {
      console.error(`❌ Cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Get count of created test users
   * @returns Number of test users
   */
  getTestUserCount(): number {
    return this.testUsers.size;
  }
}

/**
 * Create a shared test database manager instance for test suites
 * Reuse across multiple tests to optimize user creation
 */
let sharedDBTest: DatabaseTestManager | null = null;

export function getSharedDatabaseManager(): DatabaseTestManager {
  if (!sharedDBTest) {
    sharedDBTest = new DatabaseTestManager();
  }
  return sharedDBTest;
}

/**
 * Reset the shared database manager (for test cleanup)
 */
export async function resetSharedDatabaseManager(): Promise<void> {
  if (sharedDBTest) {
    await sharedDBTest.cleanup();
    sharedDBTest = null;
  }
}
