/**
 * Supabase Client Mock for Testing
 *
 * Provides a fully mockable Supabase client for unit tests.
 * Use this to test server actions and hooks that interact with Supabase.
 */

import { jest } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;
type MockFn = ReturnType<typeof jest.fn<AnyFunction>>;

// Type for mock query builder
interface MockQueryBuilder {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  delete: MockFn;
  upsert: MockFn;
  eq: MockFn;
  neq: MockFn;
  gt: MockFn;
  gte: MockFn;
  lt: MockFn;
  lte: MockFn;
  like: MockFn;
  ilike: MockFn;
  is: MockFn;
  in: MockFn;
  contains: MockFn;
  containedBy: MockFn;
  range: MockFn;
  order: MockFn;
  limit: MockFn;
  single: MockFn;
  maybeSingle: MockFn;
  csv: MockFn;
  then: MockFn;
}

// Type for mock auth
interface MockAuth {
  getUser: MockFn;
  getSession: MockFn;
  signInWithPassword: MockFn;
  signInWithOtp: MockFn;
  signUp: MockFn;
  signOut: MockFn;
  verifyOtp: MockFn;
  resetPasswordForEmail: MockFn;
  updateUser: MockFn;
  admin: {
    createUser: MockFn;
    deleteUser: MockFn;
    listUsers: MockFn;
    updateUserById: MockFn;
  };
}

// Type for mock RPC - using MockFn for compatibility
type MockRpc = MockFn;

// Create a chainable mock query builder
export function createMockQueryBuilder(): MockQueryBuilder {
  const builder: Partial<MockQueryBuilder> = {};

  // All chainable methods return the builder
  const chainableMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'range', 'order', 'limit'
  ];

  for (const method of chainableMethods) {
    builder[method as keyof MockQueryBuilder] = jest.fn().mockReturnThis() as MockFn;
  }

  // Terminal methods return promises
  builder.single = jest.fn<AnyFunction>().mockResolvedValue({ data: null, error: null });
  builder.maybeSingle = jest.fn<AnyFunction>().mockResolvedValue({ data: null, error: null });
  builder.csv = jest.fn<AnyFunction>().mockResolvedValue({ data: '', error: null });
  builder.then = jest.fn<AnyFunction>().mockImplementation((resolve: AnyFunction) => resolve({ data: [], error: null }));

  return builder as MockQueryBuilder;
}

// Create mock auth object
export function createMockAuth(): MockAuth {
  return {
    getUser: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null }, error: null }),
    getSession: jest.fn<AnyFunction>().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithOtp: jest.fn<AnyFunction>().mockResolvedValue({ data: {}, error: null }),
    signUp: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: jest.fn<AnyFunction>().mockResolvedValue({ error: null }),
    verifyOtp: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    resetPasswordForEmail: jest.fn<AnyFunction>().mockResolvedValue({ data: {}, error: null }),
    updateUser: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null }, error: null }),
    admin: {
      createUser: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null }, error: null }),
      deleteUser: jest.fn<AnyFunction>().mockResolvedValue({ data: {}, error: null }),
      listUsers: jest.fn<AnyFunction>().mockResolvedValue({ data: { users: [] }, error: null }),
      updateUserById: jest.fn<AnyFunction>().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };
}

// Create full Supabase client mock
export function createMockSupabaseClient() {
  const queryBuilder = createMockQueryBuilder();
  const auth = createMockAuth();

  const mockRpc: MockRpc = jest.fn<AnyFunction>().mockResolvedValue({ data: null, error: null });

  return {
    from: jest.fn<AnyFunction>().mockReturnValue(queryBuilder),
    auth,
    rpc: mockRpc,
    storage: {
      from: jest.fn<AnyFunction>().mockReturnValue({
        upload: jest.fn<AnyFunction>().mockResolvedValue({ data: { path: '' }, error: null }),
        download: jest.fn<AnyFunction>().mockResolvedValue({ data: new Blob(), error: null }),
        remove: jest.fn<AnyFunction>().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn<AnyFunction>().mockReturnValue({ data: { publicUrl: '' } }),
      }),
    },
    // Helper to reset all mocks
    __resetMocks: () => {
      jest.clearAllMocks();
    },
    // Helper to get the query builder for assertions
    __getQueryBuilder: () => queryBuilder,
  };
}

// Default mock instance
export const mockSupabaseClient = createMockSupabaseClient();

// Mock for createClient functions
export const createServerClient = jest.fn<AnyFunction>().mockReturnValue(mockSupabaseClient);
export const createBrowserClient = jest.fn<AnyFunction>().mockReturnValue(mockSupabaseClient);

// Test user factory
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    phone: null,
    role: 'authenticated',
    email_confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    ...overrides,
  };
}

// Test session factory
export function createMockSession(user = createMockUser()) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  };
}
