#!/bin/bash
echo "=== PHASE 2 FIX VERIFICATION ==="
echo ""

# Fix 1: EmailSubmitResponse & PasswordSubmitResponse types
echo "✓ Fix 1: EmailSubmitResponse type in form-handler-factory.ts"
grep -q "export interface EmailSubmitResponse" src/lib/form-handler-factory.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

echo "✓ Fix 2: PasswordSubmitResponse type in form-handler-factory.ts"
grep -q "export interface PasswordSubmitResponse" src/lib/form-handler-factory.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Fix 2: RedisClient interface
echo "✓ Fix 3: RedisClient interface in rate-limiter-distributed.ts"
grep -q "interface RedisClient" src/lib/rate-limiter-distributed.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Fix 3: Window interface in button.tsx
echo "✓ Fix 4: Window interface in button.tsx (no @ts-ignore)"
! grep -q "@ts-ignore" src/components/ui/button.tsx && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Fix 4: ChatRequestSchema in tutor/chat/route.ts
echo "✓ Fix 5: ChatRequestSchema Zod validation in tutor/chat/route.ts"
grep -q "ChatRequestSchema" src/app/api/tutor/chat/route.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Fix 5: createMiddlewareSupabaseClient
echo "✓ Fix 6: createMiddlewareSupabaseClient() in middleware.ts"
grep -q "createMiddlewareSupabaseClient" src/middleware.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Fix 6: CORS production validation
echo "✓ Fix 7: getAllowedOrigins() in cors.ts"
grep -q "getAllowedOrigins" src/lib/cors.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Fix 7: Pagination in admin-management.ts
echo "✓ Fix 8: Pagination (perPage: 1000) in admin-management.ts"
grep -c "perPage: 1000" src/app/actions/admin-management.ts | grep -q "4" && echo "  ✅ PASS (4 occurrences)" || echo "  ❌ FAIL"

# Fix 8: getRoleDisplayName re-export
echo "✓ Fix 9: getRoleDisplayName re-export in ternary-utils.ts"
grep -q "export { getRoleDisplayName } from '@/lib/auth/role-utils'" src/lib/ternary-utils.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

echo ""
echo "=== CLEANUP TASK VERIFICATION ==="
echo ""

# Admin-roles.ts deletion
echo "✓ Cleanup 1: admin-roles.ts deletion"
! test -f src/app/actions/admin-roles.ts && echo "  ✅ PASS (File deleted)" || echo "  ❌ FAIL (File still exists)"

# AdminRole type in types/auth.ts
echo "✓ Cleanup 2: AdminRole type moved to types/auth.ts"
grep -q "export type AdminRole" src/types/auth.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# RoleGuard imports updated
echo "✓ Cleanup 3: RoleGuard.tsx imports updated"
grep -q "import type { AdminRole } from '@/types/auth'" src/components/admin/RoleGuard.tsx && echo "  ✅ PASS" || echo "  ❌ FAIL"

# role-utils-client consolidation
echo "✓ Cleanup 4: role-utils-client.ts consolidated"
grep -q "export const isTeacherOrHigherClient = isTeacherOrHigher" src/lib/auth/role-utils-client.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

# Error logging in check-auth-config
echo "✓ Cleanup 5: Error logging in check-auth-config/route.ts"
grep -q "authLogger.error" src/app/api/check-auth-config/route.ts && echo "  ✅ PASS" || echo "  ❌ FAIL"

