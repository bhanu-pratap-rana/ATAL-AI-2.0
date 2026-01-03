# Phase 1 Rollback Procedure

**Status**: Emergency Procedure - Execute only if deployment failure detected
**Severity**: CRITICAL
**Expected Duration**: 30-60 minutes

---

## Critical Information

**BEFORE executing rollback**, verify with your team lead or engineering manager.

**Automatic Rollback Triggers:**
- Authentication success rate drops below 90% for 5+ minutes
- Profile save error rate exceeds 5% continuously
- Database connection pool exhausted (100%)
- upsert_student_profile RPC error rate > 10%
- Critical application crash detected

**Do NOT rollback if:**
- Issues are isolated to one region/user
- Error rates are < 2% (investigate first)
- Database is responding normally
- Issue is unrelated to deployed changes

---

## Section 1: Application Code Rollback

### Step 1.1: Identify the Deployment to Rollback

```bash
# Check recent deployment history
git log --oneline -10

# Expected output should show latest Phase 1 deployment
# Example: 1a2b3c4 (HEAD -> main) Phase 1: Security fixes
#          5d6e7f8 Previous stable version

# Identify commit to rollback to (the one before Phase 1 deployment)
ROLLBACK_COMMIT="5d6e7f8"  # Previous stable version
CURRENT_COMMIT=$(git rev-parse HEAD)

echo "Current commit: $CURRENT_COMMIT"
echo "Rolling back to: $ROLLBACK_COMMIT"
```

### Step 1.2: Code Rollback (Option A - Git Revert - Recommended)

```bash
# This creates a NEW commit that reverts Phase 1 changes
# Safer than hard reset because it maintains history

# 1. Create revert commit
git revert -m 1 $CURRENT_COMMIT -n
# -m 1: Mainline to revert to
# -n: Don't commit yet (so we can verify first)

# 2. Verify what will be reverted
git diff --cached

# 3. Review the changes
# Key changes that should appear in revert:
# - Removal of emailEnumeration rate limit from rate-limits.ts
# - Removal of checkEnumerationRateLimit from imports in auth.ts
# - Removal of enumeration rate limit check from requestOtp()
# - Removal of re-verification in getClassAssessmentResults()
# - Revert to old error message in student profile endpoint

# 4. If verified, commit
git commit -m "ROLLBACK: Phase 1 security fixes - $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 5. Force deployment of rollback commit
git push origin main --force-with-lease  # Force push with safety check
```

### Step 1.3: Code Rollback (Option B - Git Reset - Fast but dangerous)

**Only use if Option A fails and you need emergency rollback**

```bash
# WARNING: This rewrites history. Only do this as emergency measure.

# 1. Reset to previous commit (DESTRUCTIVE)
git reset --hard $ROLLBACK_COMMIT

# 2. Force push to main
git push origin main --force

# 3. Verify rollback
git log --oneline -5
# Expected: Old commits should be back, Phase 1 gone
```

### Step 1.4: Trigger Application Redeployment

```bash
# Method A: Manual deployment through CI/CD
# 1. Go to deployment dashboard
# 2. Trigger new deployment of reverted code
# 3. Wait for build to complete

# Method B: CLI deployment
# (Specific to your platform - Vercel, Netlify, etc.)
vercel deploy --prod  # For Vercel
# or
netlify deploy --prod  # For Netlify

# Method C: Direct restart if using container orchestration
kubectl rollout undo deployment/atal-web --to-revision=<previous-revision>
# or
docker restart atal-web-container

# Monitor deployment
tail -f deployment.log
# Expected: Build successful, 33 routes (same as before Phase 1)
```

### Step 1.5: Verify Application Rollback

```bash
# 1. Verify endpoints are responding
curl -I https://yourdomain.com/
# Expected: 200 OK

# 2. Verify old behavior restored (generic error message should be gone)
curl -X POST "https://yourdomain.com/api/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com"}'
# Expected: Now should get role-specific error (pre-rollback behavior)

# 3. Check Git status
git log --oneline -3
# Expected: HEAD should be at rollback commit

echo "✅ Application code rollback verified"
```

---

## Section 2: Database Rollback

### Step 2.1: Verify Rollback Strategy

The database migration added only ONE new function (`upsert_student_profile`). Rollback options:

**Option A: Drop the new function (Recommended)**
```sql
-- This safely removes only what was added
-- Existing data is unaffected
DROP FUNCTION IF EXISTS upsert_student_profile(uuid, text, text, text, text, text, text, text, text);
```

**Option B: Full database restore from backup (Nuclear option)**
```bash
# Only if Option A fails or data corruption detected
pg_restore -d $DATABASE_URL < atal-production-backup-YYYYMMDD-HHMMSS.sql
```

### Step 2.2: Execute Database Rollback (Option A - Recommended)

```bash
# 1. Connect to production database
psql $DATABASE_URL

# 2. Execute rollback SQL (in psql or SQL Editor)
DROP FUNCTION IF EXISTS upsert_student_profile(uuid, text, text, text, text, text, text, text, text) CASCADE;

# 3. Verify function is removed
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'upsert_student_profile';
# Expected: No rows returned

# 4. Verify student_profiles table still exists with data intact
SELECT COUNT(*) FROM student_profiles;
# Expected: Same row count as before

# 5. Verify other functions not affected
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
# Expected: All other functions still present
```

### Step 2.3: Execute Database Rollback (Option B - Full Restore)

**⚠️ ONLY if Option A fails or data corruption detected**

```bash
# 1. Stop application
# Kill any active database connections

# 2. Restore from backup
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --role=$DB_ADMIN_ROLE \
  -d $DATABASE_URL \
  < atal-production-backup-20260101-120000.sql

# This will:
# - Drop all existing objects
# - Restore to backup state
# - Take 5-10 minutes depending on database size

# 3. Verify restore completed
SELECT COUNT(*) FROM student_profiles;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM classes;
# Verify row counts match expected values from backup
```

### Step 2.4: Verify Database Rollback

```bash
# 1. Verify migration 051 is removed/reversed
ls -la apps/db/migrations/ | grep 051
# If file exists, it's okay - it just won't be applied

# 2. Verify old upsert approach still works
-- Query to test old insert/update pattern (if client was changed)

# 3. Check database logs for errors
SELECT * FROM pg_stat_user_functions
WHERE funcname LIKE '%upsert%'
ORDER BY calls DESC;
# Expected: No results (function removed)

# 4. Verify data integrity
SELECT
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM student_profiles) as profile_count,
  (SELECT COUNT(*) FROM classes) as class_count;
# Expected: All counts should be reasonable
```

---

## Section 3: Code Changes Reversal (Manual Steps)

### Step 3.1: Verify Code Changes Are Reverted

If git rollback didn't work automatically, manually verify these files:

#### File 1: src/lib/constants/rate-limits.ts
```bash
# Check for emailEnumeration rate limit removal
grep -n "emailEnumeration" src/lib/constants/rate-limits.ts

# Expected: No matches
# If present, remove lines:
# emailEnumeration: {
#   maxTokens: 20,
#   refillRate: 20 / SECONDS_PER_HOUR,
#   refillInterval: 1000,
# } as RateLimitConfig,
```

#### File 2: src/lib/rate-limiter-distributed.ts
```bash
# Check for checkEnumerationRateLimit removal
grep -n "checkEnumerationRateLimit" src/lib/rate-limiter-distributed.ts

# Expected: No matches
# If present, remove:
# - enumerationLimiter constant
# - checkEnumerationRateLimit function export
```

#### File 3: src/app/actions/auth.ts
```bash
# Check that email enumeration enhancement is removed
grep -n "Email enumeration rate limit" src/app/actions/auth.ts

# Expected: No matches
# If present, remove the enumeration check block

# Verify import is removed
grep "checkEnumerationRateLimit" src/app/actions/auth.ts
# Expected: No matches
```

#### File 4: src/app/actions/teacher.ts
```bash
# Check that class ownership re-verification is removed
grep -n "Access denied: Class no longer owned by user" src/app/actions/teacher.ts

# Expected: No matches
# If present, remove the re-verification block
```

---

## Section 4: Verification & Monitoring

### Step 4.1: Comprehensive Rollback Verification

```bash
# 1. Build verification
npm run build
# Expected: Successful build with 0 errors

# 2. Type checking
npx tsc --noEmit
# Expected: No TypeScript errors

# 3. Database verification
psql $DATABASE_URL << 'EOF'
  SELECT COUNT(*) as function_count FROM information_schema.routines
  WHERE routine_schema = 'public';

  SELECT COUNT(*) as table_count FROM information_schema.tables
  WHERE table_schema = 'public';
EOF

# 4. Endpoint verification
curl -X POST "https://yourdomain.com/api/auth/request-otp" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
# Verify response format (may differ from Phase 1)
```

### Step 4.2: Monitoring During Rollback

```bash
# Monitor these metrics during rollback (first 30 minutes):
- Authentication success rate (should recover to >99%)
- Error rate (should drop significantly)
- API latency (should normalize)
- Database connection pool (should return to normal)

# Critical alerts to watch:
grep -r "ERROR" logs/ | tail -20
# Should show recovery (fewer errors over time)

# Database logs
SELECT level, message, query_start
FROM pg_stat_statements
WHERE query LIKE '%student_profile%'
ORDER BY query_start DESC
LIMIT 10;
```

### Step 4.3: Success Criteria for Rollback

Rollback is successful if within 10 minutes:

- [ ] Application deployed successfully
- [ ] Database migration rolled back (function removed)
- [ ] Build passes with 0 errors
- [ ] All endpoints responding normally
- [ ] No new errors in logs
- [ ] Authentication success rate > 99%
- [ ] API latency returned to pre-Phase1 levels
- [ ] No alerts triggered in last 5 minutes
- [ ] Team confirms systems are stable

---

## Section 5: Post-Rollback Actions

### Step 5.1: Incident Documentation

```bash
# Create incident report
cat > ROLLBACK-INCIDENT-REPORT.md << 'EOF'
# Phase 1 Rollback Incident Report

## Timeline
- Deployment Time: [Time]
- Issue Detected: [Time]
- Rollback Started: [Time]
- Rollback Completed: [Time]
- Systems Stable: [Time]

## Root Cause
[Document what went wrong]

## What Was Reverted
1. Email enumeration rate limiting
2. Student profile UPSERT RPC
3. Multi-step signup atomicity changes
4. Class ownership re-verification

## Actions Taken
1. Git revert of commit [hash]
2. Database function dropped
3. Application redeployed
4. Monitoring verified

## Lessons Learned
[Notes for future improvements]

## Next Steps
1. Root cause analysis
2. Fix the underlying issue
3. Enhanced testing before re-deployment
4. Team training if needed
EOF

# Store incident report
git add ROLLBACK-INCIDENT-REPORT.md
git commit -m "docs: Add rollback incident report"
```

### Step 5.2: Investigation & Fix

```bash
# 1. Investigate what caused the issue
# Review logs from deployment window
journalctl --since "2 hours ago" | grep -E "ERROR|WARN"

# 2. Run tests to identify problem
npm run test:e2e:quick
npm run test:coverage

# 3. Identify which of the 4 fixes caused the problem
# A. Email enumeration rate limiting
# B. Student profile UPSERT
# C. Multi-step signup atomicity
# D. Class ownership re-verification

# 4. Fix identified issue
# (Specific to which fix caused problem)

# 5. Re-test thoroughly
npm run test:e2e:comprehensive
npm run test:coverage
```

### Step 5.3: Plan Redeployment

```bash
# 1. Address root cause
git commit -am "fix: Resolve Phase 1 deployment issue"

# 2. Create new tag for re-deployment
git tag -a v1.0.0-phase1-security-fixes-v2 \
  -m "Phase 1 fixes - v2 after rollback and analysis"

# 3. Enhanced pre-deployment verification
npm run verify  # Build + quick e2e tests
npm run verify:full  # Build + comprehensive e2e tests

# 4. Schedule re-deployment with team review
# - Code review of fixes
# - Additional testing
# - Gradual rollout (canary/staging first)
```

---

## Section 6: Emergency Contacts & Escalation

### Step 6.1: Notify Team During Rollback

```bash
# Send notifications
# Message to: #deployments or appropriate channel
echo "🚨 ROLLBACK IN PROGRESS: Phase 1 security fixes"
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Reason: [Brief explanation]"
echo "ETA to recovery: 30 minutes"
echo "On-call: [Contact info]"

# Escalation path
# 1. Notify on-call engineer immediately
# 2. Alert engineering manager within 5 minutes
# 3. Notify customer support within 10 minutes
# 4. Post-incident: Brief entire team on what happened
```

### Step 6.2: Customer Communication

```bash
# If rollback causes visible downtime/impact:

# For public status page:
"We detected an issue with our latest security update.
We have rolled back the changes and services are being restored.
We apologize for any inconvenience and will provide a full incident report within 24 hours."

# For direct communication:
"Your data is safe. We reverted a recent update that caused performance issues.
Services should be fully restored within [timeframe]."

# Do NOT share:
- Technical details of the vulnerability
- Security fix specifics
- Root cause analysis (until after investigation)
```

---

## Appendix A: Rollback Decision Matrix

| Symptom | Severity | Action |
|---------|----------|--------|
| Auth failure rate 5-10% | HIGH | Monitor 5 mins, then rollback if persists |
| Auth failure rate > 10% | CRITICAL | Immediate rollback |
| Profile save errors 1-2% | MEDIUM | Investigate first, don't rollback yet |
| Profile save errors > 5% | HIGH | Rollback immediately |
| Database errors in RPC | HIGH | Rollback database only first |
| Performance degradation | MEDIUM | Investigate, may not need rollback |
| Data corruption | CRITICAL | Full database restore from backup |
| No errors but users report issues | LOW | Gather more data before deciding |

---

## Appendix B: Pre-Rollback Verification Checklist

Before executing ANY rollback:

- [ ] Confirmed with engineering manager or team lead
- [ ] Collected evidence of the actual problem
- [ ] Verified it's not a false alarm
- [ ] Identified root cause if possible
- [ ] Notified team and stakeholders
- [ ] Prepared incident report template
- [ ] Verified backup exists and is valid
- [ ] Have monitoring ready to watch recovery
- [ ] Test rollback procedure is understood
- [ ] Emergency contacts are available

---

## Appendix C: Partial Rollback (If Only One Fix Failed)

If only one of the 4 fixes is problematic, you can selectively revert:

### Scenario: Only Email Enumeration Fix is causing issues

```bash
# Revert only the email enumeration changes:

# 1. Remove from rate-limits.ts
# 2. Remove checkEnumerationRateLimit function
# 3. Remove enumeration rate limit check from auth.ts
# Keep the other 3 fixes (UPSERT, signup atomicity, TOCTOU)

# This requires:
git revert --no-commit [specific-commit-hash]
# Then manually remove only the problematic changes
# Then: git commit -m "PARTIAL ROLLBACK: Email enumeration rate limiting"
```

---

## Emergency Rollback (Fastest possible)

**If you have < 5 minutes, do this:**

```bash
# 1. Hard reset code (lose commit history)
git reset --hard HEAD~1
git push origin main --force

# 2. Drop database function immediately
psql $DATABASE_URL -c "DROP FUNCTION IF EXISTS upsert_student_profile(...) CASCADE;"

# 3. Restart application
docker restart atal-web  # or your deployment command
systemctl restart atal-web

# 4. Verify in simple test
curl https://yourdomain.com/

# 5. Then do proper investigation after systems stabilize
```

---

**End of Rollback Procedure**

Keep this document printed and available during production deployments.

**Next Step**: Once rollback is complete and verified, begin root cause analysis before re-attempting Phase 1 deployment.
