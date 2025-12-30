# ⚡ QUICK TEST EXECUTION GUIDE
## Copy-Paste Commands for Running Tests

---

## 🚀 FASTEST START (15 minutes - TIER 1 ONLY)

```bash
# Run just the foundation tests to validate auth is working
cd apps/web

# Set env vars
export PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
export TEST_STUDENT_EMAIL=test$(date +%s)@example.com
export TEST_STUDENT_PASSWORD=TestPass123!

# Start dev server (in another terminal)
npm run dev

# Wait 5 seconds, then run tests
sleep 5 && npx playwright test \
  tests/e2e-automated/section-001-authentication/ \
  tests/e2e-automated/section-002-student-pages/ \
  tests/e2e-automated/section-018-phone-signup/ \
  tests/e2e-automated/section-019-guest-username-signup/ \
  tests/e2e-automated/section-020-forgot-password/ \
  tests/e2e-automated/section-021-teacher-authentication/ \
  tests/e2e-automated/section-022-admin-authentication/ \
  --workers=4 \
  --reporter=list

# View results
npx playwright show-report
```

**Time:** 15 minutes
**Tests:** 41 tests
**Expected Result:** ✅ All pass (100% = critical)

---

## ⏱️ MODERATE DEPTH (45 minutes - TIER 1 + TIER 2)

```bash
cd apps/web

# Set env vars
export PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
export TEST_STUDENT_EMAIL=test$(date +%s)@example.com
export TEST_STUDENT_PASSWORD=TestPass123!

# Start dev server
npm run dev &
sleep 5

# Run TIER 1 + TIER 2
npx playwright test \
  tests/e2e-automated/section-001-* \
  tests/e2e-automated/section-002-* \
  tests/e2e-automated/section-003-* \
  tests/e2e-automated/section-00[4-9]-* \
  tests/e2e-automated/section-0[1-2][0-9]-* \
  tests/e2e-automated/section-03[0-6]-* \
  --workers=6 \
  --reporter=list

# View results
npx playwright show-report
```

**Time:** 45 minutes
**Tests:** 221 tests (41 + 180)
**Expected Result:** ✅ 95%+ pass rate

---

## 🎯 FULL COMPREHENSIVE (75 minutes - ALL 3 TIERS)

```bash
#!/bin/bash
# Complete test execution script

set -e  # Exit on first error

cd apps/web

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set environment
export PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000
export TEST_STUDENT_EMAIL=test$(date +%s)@example.com
export TEST_STUDENT_PASSWORD=TestPass123!

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🧪 ATAL AI E2E AUTOMATED TEST SUITE${NC}"
echo -e "${GREEN}📊 Full Execution: 391 Tests | 3 Tiers | ~75 minutes${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""

# Start dev server
echo -e "${YELLOW}[1/4] Starting dev server...${NC}"
npm run dev &
DEV_PID=$!
sleep 5
echo -e "${GREEN}✅ Dev server running (PID: $DEV_PID)${NC}"
echo ""

# TIER 1
echo -e "${YELLOW}[2/4] TIER 1: Foundation Tests (41 tests)${NC}"
echo -e "${YELLOW}     Authentication & User Signup Flows${NC}"
start_tier1=$(date +%s)

npx playwright test \
  tests/e2e-automated/section-001-* \
  tests/e2e-automated/section-002-* \
  tests/e2e-automated/section-018-* \
  tests/e2e-automated/section-019-* \
  tests/e2e-automated/section-020-* \
  tests/e2e-automated/section-021-* \
  tests/e2e-automated/section-022-* \
  --workers=4 \
  --reporter=list

tier1_exit=$?
tier1_duration=$(($(date +%s) - start_tier1))

if [ $tier1_exit -eq 0 ]; then
  echo -e "${GREEN}✅ TIER 1 PASSED (${tier1_duration}s)${NC}"
else
  echo -e "${RED}❌ TIER 1 FAILED - Cannot proceed${NC}"
  kill $DEV_PID
  exit 1
fi
echo ""

# TIER 2
echo -e "${YELLOW}[3/4] TIER 2: Core Features (180 tests)${NC}"
echo -e "${YELLOW}     Pages, Assessment, AI, Database${NC}"
start_tier2=$(date +%s)

npx playwright test \
  tests/e2e-automated/section-003-* \
  tests/e2e-automated/section-00[4-9]-* \
  tests/e2e-automated/section-0[1-2][0-9]-* \
  tests/e2e-automated/section-03[0-6]-* \
  --workers=6 \
  --reporter=list

tier2_exit=$?
tier2_duration=$(($(date +%s) - start_tier2))

if [ $tier2_exit -eq 0 ]; then
  echo -e "${GREEN}✅ TIER 2 PASSED (${tier2_duration}s)${NC}"
else
  echo -e "${YELLOW}⚠️  TIER 2 had failures (review results)${NC}"
fi
echo ""

# TIER 3
echo -e "${YELLOW}[4/4] TIER 3: Advanced Features (170 tests)${NC}"
echo -e "${YELLOW}     Integration, Gaps, Analytics, Offline${NC}"
start_tier3=$(date +%s)

npx playwright test \
  tests/e2e-automated/section-03[7-9]-* \
  tests/e2e-automated/section-04[0-9]-* \
  tests/e2e-automated/section-05[0-9]-* \
  tests/e2e-automated/section-06[0-9]-* \
  tests/e2e-automated/section-07[0-2]-* \
  --workers=8 \
  --reporter=list

tier3_exit=$?
tier3_duration=$(($(date +%s) - start_tier3))

if [ $tier3_exit -eq 0 ]; then
  echo -e "${GREEN}✅ TIER 3 PASSED (${tier3_duration}s)${NC}"
else
  echo -e "${YELLOW}⚠️  TIER 3 had failures (review results)${NC}"
fi
echo ""

# Summary
total_duration=$((tier1_duration + tier2_duration + tier3_duration))

echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 ALL TIERS COMPLETED${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "TIER 1: ${tier1_duration}s | TIER 2: ${tier2_duration}s | TIER 3: ${tier3_duration}s"
echo -e "Total Duration: ${total_duration}s (~$((total_duration/60)) minutes)"
echo ""
echo -e "${YELLOW}📊 Viewing test report...${NC}"
npx playwright show-report

echo ""
echo -e "${GREEN}✅ Test execution complete!${NC}"

# Cleanup
kill $DEV_PID 2>/dev/null || true

exit 0
```

**Time:** 75 minutes
**Tests:** 391 tests (all sections)
**Expected Result:** ✅ 95%+ pass rate overall

---

## 🎯 SPECIFIC SECTION TESTING

### Single Section
```bash
npx playwright test tests/e2e-automated/section-001-authentication/
```

### Specific Test Case
```bash
npx playwright test -g "TC-1.1.1"  # Email Input Validation
npx playwright test -g "TC-29.1.1" # Database Functions
npx playwright test -g "TC-72.1.1" # Analytics Export
```

### With Visual Mode (See Browser)
```bash
npx playwright test tests/e2e-automated/section-001-* --headed
```

### With Debug Mode (Step Through)
```bash
npx playwright test tests/e2e-automated/section-001-* --debug
```

---

## 📊 VIEWING RESULTS

```bash
# HTML Report (Best for analysis)
npx playwright show-report

# JSON Results for all sections
cat tests/e2e-automated/section-*/results/*.json | jq .

# Count pass/fail by section
for dir in tests/e2e-automated/section-*/results/; do
  section=$(basename $(dirname "$dir"))
  passed=$(grep -c '"status": "PASS"' "$dir"/*.json 2>/dev/null || echo 0)
  failed=$(grep -c '"status": "FAIL"' "$dir"/*.json 2>/dev/null || echo 0)
  echo "$section: $passed passed, $failed failed"
done

# List failed tests only
grep '"status": "FAIL"' tests/e2e-automated/section-*/results/*.json | \
  jq '.testCase, .error'
```

---

## 🔧 TROUBLESHOOTING

### Tests Timeout or Hang
```bash
# Reduce worker count
npx playwright test section-001-* --workers=2

# Increase timeout
npx playwright test section-001-* --timeout=60000
```

### Auth Failures
```bash
# Reset database
npx supabase db reset

# Create fresh test user
export TEST_STUDENT_EMAIL=testuser$(date +%s)@example.com
```

### Port Already in Use
```bash
# Kill existing dev server
lsof -ti:3000 | xargs kill -9

# Start fresh
npm run dev
```

### Out of Memory
```bash
# Reduce workers and check system
npx playwright test section-001-* --workers=1
free -h  # Check available memory
```

---

## ✅ SUCCESS CHECKLIST

Before running tests:
- [ ] Dev server running: `npm run dev`
- [ ] Database seeded: `npx supabase db reset` (if needed)
- [ ] Environment variables set: `PLAYWRIGHT_TEST_BASE_URL`, credentials
- [ ] Node modules installed: `npm install`
- [ ] Playwright installed: `npx playwright install`
- [ ] Port 3000 available: `lsof -i:3000`
- [ ] Port 5432 available: `lsof -i:5432`
- [ ] Disk space: 1GB+
- [ ] Network stable: No VPN issues

---

## 📈 EXPECTED RESULTS BY TIER

| Tier | Duration | Tests | Pass Rate | Status |
|------|----------|-------|-----------|--------|
| **TIER 1** | 10-15m | 41 | 100% ✅ | CRITICAL |
| **TIER 2** | 20-25m | 180 | 95%+ ✅ | GOOD |
| **TIER 3** | 25-30m | 170 | 95%+ ✅ | GOOD |
| **OVERALL** | 60-75m | 391 | 90%+ ✅ | PASSING |

---

## 🚨 WHAT IF TESTS FAIL?

1. **TIER 1 fails (Auth)** → STOP immediately, fix auth issues
2. **TIER 2 fails (Core)** → Acceptable if 95%+, continue to TIER 3
3. **TIER 3 fails (Advanced)** → Acceptable if 95%+, review specific failures

---

## 📞 QUICK COMMANDS

```bash
# Full suite
npm run test:e2e:full

# Quick smoke (TIER 1 only)
npm run test:e2e:smoke

# Specific section
npm run test:e2e:section -- section-001

# Debug mode
npm run test:e2e:debug -- section-001

# View report
npm run test:e2e:report
```

**Add these to your `package.json` scripts:**
```json
{
  "test:e2e:full": "npx playwright test tests/e2e-automated/",
  "test:e2e:smoke": "npx playwright test tests/e2e-automated/section-001-*",
  "test:e2e:tier1": "npx playwright test tests/e2e-automated/section-00[1-2]* section-018-* section-019-* section-020-* section-021-* section-022-* --workers=4",
  "test:e2e:report": "npx playwright show-report",
  "test:e2e:debug": "npx playwright test --debug"
}
```

---

## 🎯 MY RECOMMENDATION

**For First Run:**
1. Start with TIER 1 (15 min) - Validate auth works
2. If TIER 1 passes → Run TIER 2 (25 min) - Validate core features
3. If TIER 2 passes → Run TIER 3 (30 min) - Validate everything

**For CI/CD:**
- Use full script on each commit
- Check pass rate > 90%
- Alert if TIER 1 < 100%

**For Daily Testing:**
- Morning smoke test: TIER 1 only (15 min)
- Evening full suite: All 3 tiers (75 min)

---

**Status:** ✅ Ready to Execute
**Confidence:** 95%+ pass rate expected
**Next Step:** Choose your command above and run it! 🚀

