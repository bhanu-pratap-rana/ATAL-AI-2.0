# Phase 1 Monitoring Setup Guide

**Purpose**: Configure monitoring and alerting for Phase 1 security fixes
**Duration**: 30-45 minutes setup, then continuous monitoring
**Criticality**: ESSENTIAL for production deployment

---

## Overview

This guide configures monitoring for the 4 Phase 1 security fixes to ensure they're working correctly in production and to detect any issues immediately.

**Key Metrics to Monitor:**
1. **Email Enumeration Rate Limiting** - Detecting abuse attempts
2. **Student Profile UPSERT** - Ensuring race condition is fixed
3. **Multi-Step Signup Atomicity** - Verifying no orphaned records
4. **Class Ownership TOCTOU** - Confirming access control

---

## Part 1: Logging Setup

### 1.1 Application Logging Configuration

Ensure structured logging is configured in your application:

```typescript
// src/lib/logger.ts or similar
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'atal-ai',
    environment: process.env.NODE_ENV,
    version: '1.0.0-phase1',
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
    // File output
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
})

export default logger
```

### 1.2 Key Logging Points for Phase 1

Add logging at these critical points:

#### Email Enumeration Rate Limiting
```typescript
// In src/app/actions/auth.ts requestOtp()
if (!(await checkEnumerationRateLimit(enumerationKey))) {
  authLogger.warn('[requestOtp] Email enumeration rate limit exceeded', {
    email: maskedEmail,  // Don't log full email
    limitType: 'enumeration',
    timestamp: new Date().toISOString(),
    ip: req.ip || 'unknown',
  })
}
```

#### Student Profile UPSERT
```typescript
// In src/app/actions/student.ts saveStudentProfile()
try {
  const result = await supabase.rpc('upsert_student_profile', {...})
  authLogger.info('[saveStudentProfile] Profile upserted successfully', {
    userId: user.id,
    timestamp: new Date().toISOString(),
  })
} catch (error) {
  authLogger.error('[saveStudentProfile] UPSERT failed', {
    userId: user.id,
    error: error.message,
    errorCode: error.code,
    timestamp: new Date().toISOString(),
  })
}
```

#### Class Ownership Re-verification
```typescript
// In src/app/actions/teacher.ts getClassAssessmentResults()
if (classData.teacher_id !== auth.user!.id) {
  authLogger.warn('[getClassAssessmentResults] Access denied: Class ownership changed', {
    userId: auth.user!.id,
    classId: validatedClassId,
    timestamp: new Date().toISOString(),
  })
}
```

---

## Part 2: Metrics Setup (Datadog/Cloudwatch/New Relic)

### 2.1 Custom Metrics to Create

Create these custom metrics in your monitoring platform:

#### Authentication Metrics
```
atal.auth.otp.requested (counter) - Total OTP requests
atal.auth.otp.verified (counter) - Successful OTP verifications
atal.auth.otp.failed (counter) - Failed OTP attempts
atal.auth.enumeration.rate_limited (counter) - Email enumeration rate limit hits
atal.auth.enumeration.blocked_emails (counter) - Unique emails blocked
atal.auth.login.success (counter) - Successful logins
atal.auth.login.failed (counter) - Failed login attempts
```

#### Student Profile Metrics
```
atal.student.profile.save.attempts (counter) - Profile save attempts
atal.student.profile.save.success (counter) - Successful saves
atal.student.profile.save.failed (counter) - Failed saves
atal.student.profile.upsert.race_condition (counter) - Race condition detections
atal.student.profile.save.latency (histogram) - Save latency in ms
```

#### Teacher Metrics
```
atal.teacher.analytics.requests (counter) - Analytics requests
atal.teacher.analytics.success (counter) - Successful queries
atal.teacher.analytics.denied (counter) - Access denied
atal.teacher.analytics.toctou_detected (counter) - TOCTOU blocks
atal.teacher.analytics.latency (histogram) - Query latency in ms
```

#### Database Metrics
```
atal.db.upsert_student_profile.calls (counter) - Total calls
atal.db.upsert_student_profile.errors (counter) - Error count
atal.db.upsert_student_profile.duration (histogram) - Execution time
atal.db.connection_pool.utilization (gauge) - % of pool used
```

### 2.2 Implementation Example (Datadog)

```typescript
// src/lib/metrics.ts
import StatsD from 'node-dogstatsd'

const dogstatsd = new StatsD.StatsD({
  host: process.env.DATADOG_AGENT_HOST || 'localhost',
  port: parseInt(process.env.DATADOG_AGENT_PORT || '8125'),
  prefix: 'atal.',
  tags: [`env:${process.env.NODE_ENV}`, `version:1.0.0-phase1`],
})

export const metrics = {
  // Authentication
  recordOtpRequest: () => dogstatsd.increment('auth.otp.requested'),
  recordOtpVerified: () => dogstatsd.increment('auth.otp.verified'),
  recordOtpFailed: () => dogstatsd.increment('auth.otp.failed'),
  recordEnumerationRateLimit: (email: string) => {
    dogstatsd.increment('auth.enumeration.rate_limited')
    dogstatsd.set('auth.enumeration.blocked_emails', email)
  },

  // Student Profile
  recordProfileSaveAttempt: () => dogstatsd.increment('student.profile.save.attempts'),
  recordProfileSaveSuccess: () => dogstatsd.increment('student.profile.save.success'),
  recordProfileSaveFailed: () => dogstatsd.increment('student.profile.save.failed'),
  recordProfileSaveLatency: (ms: number) => dogstatsd.histogram('student.profile.save.latency', ms),
  recordRaceCondition: () => dogstatsd.increment('student.profile.upsert.race_condition'),

  // Teacher Analytics
  recordAnalyticsRequest: () => dogstatsd.increment('teacher.analytics.requests'),
  recordAnalyticsSuccess: () => dogstatsd.increment('teacher.analytics.success'),
  recordAnalyticsDenied: () => dogstatsd.increment('teacher.analytics.denied'),
  recordToctouDetected: () => dogstatsd.increment('teacher.analytics.toctou_detected'),
  recordAnalyticsLatency: (ms: number) => dogstatsd.histogram('teacher.analytics.latency', ms),
}
```

---

## Part 3: Alert Configuration

### 3.1 Critical Alerts (Immediate Notification)

Set up these alerts to trigger immediately:

```
Alert: Authentication Rate Limited
Condition: auth.otp.failed > 10 in 5 minutes
Severity: CRITICAL
Action: Page on-call engineer, notify Slack #alerts

Alert: Email Enumeration Attack
Condition: auth.enumeration.rate_limited > 20 in 10 minutes
Severity: CRITICAL
Action: Page security team, notify Slack #security

Alert: Database RPC Errors
Condition: db.upsert_student_profile.errors > 0 in 5 minutes
Severity: CRITICAL
Action: Page database admin, notify Slack #database

Alert: Access Control Failure
Condition: teacher.analytics.denied > 5 in 5 minutes
Severity: HIGH
Action: Notify Slack #security, create incident
```

### 3.2 High-Priority Alerts (Review within 5 minutes)

```
Alert: High Profile Save Error Rate
Condition: student.profile.save.failed / student.profile.save.attempts > 0.05
Duration: 5 minutes
Severity: HIGH
Action: Notify Slack #alerts

Alert: Elevated API Latency
Condition: student.profile.save.latency p95 > 1000ms
Duration: 10 minutes
Severity: HIGH
Action: Notify Slack #performance

Alert: Database Connection Pool Nearly Full
Condition: db.connection_pool.utilization > 80%
Duration: 2 minutes
Severity: HIGH
Action: Notify database team

Alert: Repeated Authorization Failures
Condition: auth.login.failed / auth.login.success > 0.1
Duration: 10 minutes
Severity: HIGH
Action: Investigate potential auth issues
```

### 3.3 Medium-Priority Alerts (Review within 30 minutes)

```
Alert: Profile Save Latency Increasing
Condition: student.profile.save.latency p95 > 500ms
Duration: 15 minutes
Severity: MEDIUM
Action: Notify #performance channel

Alert: Email Enumeration Rate Limiting Triggered
Condition: auth.enumeration.rate_limited > 5 in 30 minutes
Severity: MEDIUM
Action: Investigate pattern, may be legitimate

Alert: API Error Rate Elevated
Condition: Error count > normal baseline by 50%
Duration: 10 minutes
Severity: MEDIUM
Action: Check error logs for patterns
```

### 3.4 Alert Implementation (Datadog example)

```
POST https://api.datadoghq.com/api/v1/monitor

{
  "type": "metric alert",
  "query": "avg(last_5m):avg:atal.student.profile.save.failed{*} > 50",
  "name": "[CRITICAL] Phase 1: High profile save error rate",
  "message": "High error rate in student profile saves.\nReview: {{host.name}} logs\nRunbook: PHASE-1-TROUBLESHOOTING.md",
  "tags": ["phase1", "critical", "auth"],
  "options": {
    "thresholds": {
      "critical": 50,
      "warning": 25
    },
    "notify_no_data": true,
    "no_data_timeframe": 10,
    "require_full_window": true,
    "timeout_h": 0
  },
  "priority": 1,
  "escalation_message": "Escalating to on-call engineer"
}
```

---

## Part 4: Dashboard Setup

### 4.1 Main Phase 1 Dashboard

Create a dashboard showing real-time status of all Phase 1 fixes:

**Dashboard Name**: "Phase 1 Security Fixes - Production Monitoring"

#### Section 1: Authentication Health
- Chart 1: OTP Request Success Rate (gauge, target >99%)
- Chart 2: Email Enumeration Rate Limit Hits (timeseries)
- Chart 3: Login Success Rate (gauge, target >99%)
- Chart 4: Failed Logins (heatmap by time)

#### Section 2: Student Profile Health
- Chart 1: Profile Save Success Rate (gauge, target >99.9%)
- Chart 2: Profile Save Latency (histogram p50, p95, p99)
- Chart 3: Race Condition Detections (counter, target 0)
- Chart 4: UPSERT Function Calls (timeseries)

#### Section 3: Teacher Analytics Health
- Chart 1: Analytics Query Success Rate (gauge, target >99%)
- Chart 2: TOCTOU Blocks (counter, expected 0-5 per day)
- Chart 3: Access Denied Events (timeseries)
- Chart 4: Query Latency (histogram)

#### Section 4: Database Health
- Chart 1: Connection Pool Utilization (gauge, target <70%)
- Chart 2: upsert_student_profile Errors (timeseries)
- Chart 3: Query Performance (histogram)
- Chart 4: Database Health Status (text)

### 4.2 Dashboard JSON Template

```json
{
  "title": "Phase 1 Security Fixes - Production Monitoring",
  "description": "Real-time monitoring of Phase 1 critical security fixes",
  "widgets": [
    {
      "type": "gauge",
      "title": "OTP Request Success Rate",
      "query": "100*(atal.auth.otp.verified{*}/atal.auth.otp.requested{*})",
      "thresholds": {
        "ok": 99,
        "warning": 95,
        "critical": 90
      }
    },
    {
      "type": "timeseries",
      "title": "Email Enumeration Rate Limit Hits",
      "query": "sum:atal.auth.enumeration.rate_limited{*}"
    },
    {
      "type": "gauge",
      "title": "Profile Save Success Rate",
      "query": "100*(atal.student.profile.save.success{*}/atal.student.profile.save.attempts{*})",
      "thresholds": {
        "ok": 99.9,
        "warning": 99,
        "critical": 95
      }
    },
    {
      "type": "gauge",
      "title": "Analytics Query Success Rate",
      "query": "100*(atal.teacher.analytics.success{*}/atal.teacher.analytics.requests{*})",
      "thresholds": {
        "ok": 99,
        "warning": 95,
        "critical": 90
      }
    }
  ]
}
```

---

## Part 5: Log Analysis Queries

### 5.1 Splunk/ELK Queries

#### Find all email enumeration attempts:
```
source="auth" "Email enumeration rate limit exceeded"
| stats count as attempts, values(email) as emails by hour
| where attempts > 5
```

#### Track profile UPSERT success/failure:
```
source="student" "Profile upsert"
| stats count by status, error_code
| eval error_rate=errors/(errors+success)*100
```

#### Monitor TOCTOU detections:
```
source="teacher" "Access denied: Class ownership changed"
| stats count as toctou_blocks, values(user_id) as users
```

#### Find database errors:
```
source="database" "upsert_student_profile error"
| stats count by SQLERROR, SQLSTATE
| sort - count
```

### 5.2 Query Implementation (Datadog Logs)

```
# Email enumeration attacks
service:auth status:warn "enumeration rate limit exceeded"
| stats count by ip_address
| where count > 10

# Profile UPSERT errors
service:student "UPSERT failed" status:error
| stats count, avg(duration), max(duration) by user_id

# Access control violations
service:teacher "Access denied" status:warn
| stats count by class_id, user_id

# Database performance
service:database "upsert_student_profile"
| stats avg(@duration), max(@duration), pct(@duration, 95)
```

---

## Part 6: Ongoing Monitoring Tasks

### 6.1 Immediate Post-Deployment (First 2 hours)

```
Every 5 minutes:
- Check dashboard for critical alerts
- Verify no spike in error rates
- Monitor database connection pool

Every 15 minutes:
- Review error logs for anomalies
- Verify all endpoints responding
- Check email enumeration attempts

Every 30 minutes:
- Generate interim status report
- Review auth flow metrics
- Verify database health
```

### 6.2 Continuous Monitoring (Daily)

```
Daily tasks:
- Review summary of Phase 1 metrics
- Check for trending issues
- Verify alert rule effectiveness
- Update status in team wiki

Weekly tasks:
- Analyze 7-day trends
- Compare before/after metrics
- Review false positive alerts
- Optimize thresholds if needed

Monthly tasks:
- Generate comprehensive report
- Assess security fix effectiveness
- Plan optimization if issues found
- Update documentation
```

### 6.3 Baseline Metrics (Before & After Comparison)

Collect these metrics for 1 week before and after Phase 1:

```
Before Phase 1:
- Average profile save latency: ___ ms
- Profile save error rate: ___%
- Authentication success rate: ___%
- Database queries per second: ___
- Email enumeration attempts: ___

After Phase 1:
- Average profile save latency: ___ ms (target: same or faster)
- Profile save error rate: __% (target: <0.1%)
- Authentication success rate: __% (target: >99%)
- Database queries per second: ___ (target: same)
- Email enumeration attempts: ___ (target: blocked)
- Race condition detection: ___ (target: 0)
- TOCTOU detections: ___ (target: 0-5)
```

---

## Part 7: Troubleshooting Guide

### Issue 1: High Email Enumeration Rate Limit Triggers

**Symptoms:**
- Alert: "Email enumeration rate limit exceeded"
- Many users reporting they can't request OTP

**Investigation:**
```sql
-- Check rate limit configuration
SELECT maxTokens, refillRate FROM rate_limits WHERE type='enumeration';

-- Identify what's triggering limits
SELECT email, COUNT(*) as attempts, MAX(timestamp) as last_attempt
FROM auth_logs
WHERE event='enumeration_limit_hit'
GROUP BY email
ORDER BY attempts DESC;
```

**Solution:**
1. Check if it's legitimate (peak hours, bulk signup event)
2. If legitimate, increase rate limit: `maxTokens: 30`
3. If attack, implement IP-based rate limiting
4. Contact security team for further action

### Issue 2: Profile UPSERT Errors

**Symptoms:**
- Alert: "Profile save error rate > 5%"
- Users complaining they can't save profiles

**Investigation:**
```sql
-- Check UPSERT function status
SELECT * FROM pg_stat_user_functions
WHERE funcname='upsert_student_profile';

-- Review error logs
SELECT error, COUNT(*) as count
FROM student_profile_errors
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY error
ORDER BY count DESC;
```

**Solution:**
1. Check database logs for constraint violations
2. Verify `student_profiles` table structure hasn't changed
3. Check RLS policies aren't blocking writes
4. Rollback if needed (see PHASE-1-ROLLBACK-PROCEDURE.md)

### Issue 3: TOCTOU False Positives

**Symptoms:**
- TOCTOU blocks detected for users who own the class
- Users getting "Class not found" errors

**Investigation:**
```sql
-- Check for class ownership changes
SELECT class_id, teacher_id, updated_at
FROM classes
WHERE id = 'problematic-class-id'
ORDER BY updated_at DESC;

-- Check for rapid ownership transfers
SELECT class_id, COUNT(*) as transfers
FROM audit_log
WHERE event='class_ownership_changed'
AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY class_id;
```

**Solution:**
1. Add logging to see which users are affected
2. Increase timeout before re-verification if transfers expected
3. Notify users of issues
4. Rollback if causing widespread impact

---

## Part 8: Maintenance & Optimization

### 8.1 Alert Threshold Tuning (Week 2 onwards)

After Phase 1 is stable for 1 week:

1. Review false positive rate for each alert
2. Adjust thresholds based on actual baseline
3. Reduce alert noise while maintaining coverage
4. Document final thresholds

### 8.2 Metrics Retention

```
High-resolution metrics (1 second): 1 day
Regular metrics (5 minute): 30 days
Aggregated metrics (1 hour): 1 year
Logs: 30 days (configurable)
```

### 8.3 Dashboard Optimization

- Remove metrics not providing actionable insight
- Add metrics for emerging issues
- Improve visualization for quick understanding
- Create drill-down dashboards for troubleshooting

---

## Appendix A: Required Environment Variables

```bash
# Datadog (if using)
DATADOG_API_KEY=your_api_key
DATADOG_AGENT_HOST=localhost
DATADOG_AGENT_PORT=8125

# Sentry (if using for error tracking)
SENTRY_DSN=https://...

# Splunk (if using for logging)
SPLUNK_TOKEN=your_token
SPLUNK_HOST=your-splunk-instance.com

# Custom monitoring
LOG_LEVEL=info
MONITORING_ENABLED=true
```

---

## Appendix B: Monitoring Tools Checklist

Choose and configure appropriate tools:

- [ ] Logs: Datadog / Splunk / ELK / CloudWatch
- [ ] Metrics: Datadog / New Relic / Prometheus / CloudWatch
- [ ] Uptime: Statuspage / Opsgenie / PagerDuty
- [ ] Tracing: Datadog APM / Jaeger / Zipkin
- [ ] Alerts: Slack / PagerDuty / Opsgenie
- [ ] Dashboards: Datadog / Grafana / CloudWatch

---

**End of Monitoring Setup Guide**

This setup ensures Phase 1 fixes are monitored comprehensively in production. Adjust thresholds and tools based on your actual production environment and observability stack.
