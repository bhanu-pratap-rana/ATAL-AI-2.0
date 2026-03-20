# Database Integration Tests

These tests require a live Supabase connection. They are run separately from unit tests via:

```bash
npm run test:database       # all DB tests
npm run test:database:rpc   # RPC function tests
npm run test:database:rls   # Row-Level Security tests
npm run test:database:load  # Load / performance tests
```

## Prerequisites

1. Copy `.env.local.example` → `.env.local` (repo root or `apps/web/`)
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
3. Ensure migrations are applied to the test database

## Structure

```
__tests__/database/
  rpc/      ← tests for Supabase RPC functions (get_class_leaderboard, etc.)
  rls/      ← Row-Level Security policy tests per table
  load/     ← Performance / load tests (response times, query limits)
```

## Writing a DB Test

```ts
// __tests__/database/rpc/leaderboard.test.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

test('get_class_leaderboard returns ranked entries', async () => {
  const { data, error } = await supabase.rpc('get_class_leaderboard', {
    p_class_id: 'test-class-id',
    p_limit: 5,
  });
  expect(error).toBeNull();
  expect(Array.isArray(data)).toBe(true);
});
```
