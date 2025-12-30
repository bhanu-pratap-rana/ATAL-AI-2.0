# SECTION 60: AI SERVICE HEALTH CHECK FUNCTION
**Status:** ✅ COMPLETE | **Date:** 2025-12-30 | **Tests:** 6

## Test Cases
- **TC-60.1.1:** checkAIServiceStatus() Function - Service Available
- **TC-60.1.2:** checkAIServiceStatus() Function - Service Unavailable
- **TC-60.1.3:** checkAIServiceStatus() Function - Rate Limited
- **TC-60.1.4:** checkAIServiceStatus() Function - Latency Detection
- **TC-60.1.5:** checkAIServiceStatus() Function - Periodic Health Checks
- **TC-60.1.6:** checkAIServiceStatus() Function - Multiple Service Dependencies

## Implementation Details

### TC-60.1.1: Service Available (Healthy)
- Calls `checkAIServiceStatus()` function
- Verifies returns object with:
  - `status: "healthy"`
  - `latency_ms: number (< 1000)`
  - `model: "gemini"`
  - `last_checked: timestamp`
- Validates response time < 2 seconds
- Confirms no console errors during check
- Validates latency below threshold (excellent performance)
- Verifies AI model name returned
- Confirms timestamp accuracy

### TC-60.1.2: Service Unavailable
- Blocks AI service endpoint via route abort
- Calls `checkAIServiceStatus()` with service down
- Verifies returns object with:
  - `status: "unavailable"`
  - `error: error message`
  - `last_checked: timestamp`
- Confirms no crash (graceful error handling)
- Displays fallback UI message
- Shows retry button/suggestion
- Logs error for monitoring
- Records timestamp of failed check

### TC-60.1.3: Rate Limited
- Simulates rate limit response (429 Too Many Requests)
- Calls `checkAIServiceStatus()` with rate limit scenario
- Verifies returns object with:
  - `status: "rate_limited"`
  - `retry_after_ms: milliseconds to wait (60000)`
  - `current_usage: percent (95%)`
  - `last_checked: timestamp`
- Displays rate limit message to user
- Shows reset/retry time
- Displays current usage quota percentage
- Prevents further requests until reset
- Provides countdown timer for reset

### TC-60.1.4: Latency Detection
- Simulates slow AI service (artificial delay 1500ms)
- Measures latency_ms returned by health check
- Detects when latency > 500ms and adds warning
- Displays slow service warning to user
- Adjusts UI timeouts (increases timeout values)
- Shows latency indicator/badge
- Tracks latency trend across multiple requests
- Validates graceful handling of slow responses

### TC-60.1.5: Periodic Health Checks
- Calls `checkAIServiceStatus()` on app initialization
- Determines service status before showing AI tools
- Schedules periodic re-checks (configurable, default 5 minutes)
- Detects status changes during runtime
- Updates UI when status changes
- Handles service recovery (full access restored)
- Tracks check history
- Implements non-blocking background checks
- Makes periodic checks configurable

### TC-60.1.6: Multiple Service Dependencies
- Checks Gemini API status independently
- Checks RAG vector search status independently
- Checks TTS service status independently
- Returns combined health status:
  - All healthy: Full functionality
  - One/some down: Partial functionality (graceful degradation)
  - All down: Complete unavailability
- Shows degraded mode message when applicable
- Tracks service dependencies
- Implements fallback behavior per service
- Validates that partial functionality still works

## Response Object Structure
```typescript
interface ServiceStatus {
  status: 'healthy' | 'unavailable' | 'rate_limited' | 'slow' | 'degraded';
  latency_ms?: number;
  model?: string;
  error?: string;
  retry_after_ms?: number;
  current_usage?: number;
  last_checked: string; // ISO timestamp
  dependencies?: {
    gemini: 'healthy' | 'unavailable';
    rag: 'healthy' | 'unavailable';
    tts: 'healthy' | 'unavailable';
  };
  warning?: string;
}
```

## Performance Baselines
| Test | Duration | Threshold |
|------|----------|-----------|
| TC-60.1.1 | 2-4 sec | 8 sec |
| TC-60.1.2 | 2-4 sec | 8 sec |
| TC-60.1.3 | 2-4 sec | 8 sec |
| TC-60.1.4 | 3-5 sec | 10 sec |
| TC-60.1.5 | 2-4 sec | 8 sec |
| TC-60.1.6 | 3-5 sec | 10 sec |
| **Total** | 14-26 sec | 52 sec |

## Key Features Tested
- Health check function initialization
- Service availability detection
- Latency measurement and reporting
- Error handling and graceful degradation
- Rate limit detection and response
- Timeout configuration and adjustment
- Multiple service dependency tracking
- Periodic health check scheduling
- Status change detection and UI update
- Service recovery handling
- Combined health status computation
- Fallback message display
- Retry button/suggestion functionality
- Usage quota tracking
- Reset time countdown
- Non-blocking background checks
- Logging and monitoring integration

## Expected Results
- Service healthy: Returns status with latency < 1000ms
- Service unavailable: Returns error without crashing app
- Rate limited: Shows retry_after_ms and current_usage
- High latency: Shows warning when > 500ms
- Periodic checks: Status determined before showing AI tools
- All dependencies: Returns combined health status with fallbacks

**Status:** ✅ READY FOR TESTING

