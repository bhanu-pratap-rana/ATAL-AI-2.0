# SECTION 70: OFFLINE SYNC QUEUE INFRASTRUCTURE
**Status:** ✅ COMPLETE | **Date:** 2025-12-30 | **Tests:** 17

## Test Cases
- **TC-70.1.1:** Service Worker Registration
- **TC-70.1.2:** Service Worker Scope
- **TC-70.1.3:** Service Worker Activation
- **TC-70.2.1:** Go Offline
- **TC-70.2.2:** API Caching (NetworkFirst)
- **TC-70.2.3:** Asset Caching (CacheFirst)
- **TC-70.3.1:** Sync Event Handler
- **TC-70.3.2:** Client Message Handling
- **TC-70.3.3:** Sync Status Update
- **TC-70.4.1:** SW to Client Messages
- **TC-70.4.2:** Client to SW Messages
- **TC-70.4.3:** Custom Event Dispatch
- **TC-70.5.1:** Go Offline → Come Online
- **TC-70.5.2:** Slow Connection
- **TC-70.5.3:** Connection Flaky
- **TC-70.6.1:** Cache Size
- **TC-70.6.2:** Cache Invalidation

## Implementation Details

### TC-70.1.1: Service Worker Registration
- **Component:** BackgroundSyncInitializer.tsx, public/worker/index.js
- **Purpose:** Verifies service worker is registered at application scope
- **Verification:**
  - Service worker registered at scope "/"
  - Status shows "activated and running"
  - Controller attached to navigator.serviceWorker
- **Features:**
  - Automatic registration on app load
  - Root scope for full app coverage
  - No errors during registration
  - Controller ready state

### TC-70.1.2: Service Worker Scope
- **Component:** BackgroundSyncInitializer.tsx
- **Purpose:** Verifies service worker scope covers entire application
- **Verification:**
  - Scope is "/" (root)
  - All pages in app can access SW
  - Scope accessible from all routes
- **Features:**
  - Root-level scope
  - Full app coverage
  - Proper scope hierarchy

### TC-70.1.3: Service Worker Activation
- **Component:** public/worker/index.js
- **Purpose:** Verifies service worker activates immediately
- **Verification:**
  - Status: "activated and running"
  - No "waiting" status
  - skipWaiting() enabled
  - Immediate activation
- **Features:**
  - skipWaiting() for immediate activation
  - No waiting period
  - Clients claimed
  - Immediate cache control

### TC-70.2.1: Go Offline
- **Component:** BackgroundSyncInitializer.tsx, public/worker/index.js
- **Purpose:** Verifies offline mode detection and cached content loading
- **Verification:**
  - Browser set to offline mode
  - Page refreshes in offline mode
  - Content loads from cache (not blank)
  - navigator.onLine = false
- **Features:**
  - DevTools offline simulation
  - Cache fallback
  - No errors in offline mode
  - Content availability

### TC-70.2.2: API Caching (NetworkFirst)
- **Component:** public/worker/index.js
- **Purpose:** Verifies API responses cached with NetworkFirst strategy
- **Strategy:**
  - Try network first
  - Fall back to cache if offline
  - Update cache with fresh response
- **Verification:**
  - API calls cached while online
  - Content loads from cache offline
  - Cache properly updated
- **Features:**
  - Network priority
  - Cache fallback
  - Fresh data preference
  - Background sync on reconnect

### TC-70.2.3: Asset Caching (CacheFirst)
- **Component:** public/worker/index.js
- **Purpose:** Verifies static assets cached with CacheFirst strategy
- **Strategy:**
  - Try cache first
  - Network for missing assets
  - Persistent caching
- **Verification:**
  - Images, CSS, fonts cached
  - Assets serve from cache offline
  - No broken images
  - Styles load correctly
- **Features:**
  - Cache priority
  - Fast loading
  - Offline asset availability
  - No network dependency

### TC-70.3.1: Sync Event Handler
- **Component:** public/worker/index.js
- **Purpose:** Verifies sync event triggers in service worker
- **Event listener:**
  - `sync` event listener registered
  - Event fires when triggered
  - Background sync event logged
- **Verification:**
  - Event triggered successfully
  - Logged in service worker console
  - Sync event processed
- **Features:**
  - Background Sync API
  - Event listening
  - Logging capability
  - Event handling

### TC-70.3.2: Client Message Handling
- **Component:** public/worker/index.js, BackgroundSyncInitializer.tsx
- **Purpose:** Verifies service worker processes client messages
- **Message type:**
  - Type: MANUAL_SYNC
  - Sent from client
  - SW receives and processes
- **Verification:**
  - Message received by SW
  - SW sends response
  - Sync completes
  - No message loss
- **Features:**
  - postMessage API
  - Request/response pattern
  - Message processing
  - Async handling

### TC-70.3.3: Sync Status Update
- **Component:** public/worker/index.js
- **Purpose:** Verifies sync status messages sent to client
- **Message type:**
  - Type: SYNC_COMPLETE
  - Includes processed count
  - Status updates
- **Verification:**
  - Message sent after sync
  - Client receives status
  - Processed count included
- **Features:**
  - Status notification
  - Completion confirmation
  - Item count tracking
  - Client notification

### TC-70.4.1: SW to Client Messages
- **Component:** public/worker/index.js, BackgroundSyncInitializer.tsx
- **Purpose:** Verifies service worker sends messages to client
- **Message types:**
  - BACKGROUND_SYNC: Sync event occurred
  - SW_NOTIFICATION: Sync notifications
- **Verification:**
  - Client receives SW messages
  - Message includes correct tag
  - Message data complete
- **Features:**
  - Bidirectional communication
  - Message passing
  - Event notification
  - Data inclusion

### TC-70.4.2: Client to SW Messages
- **Component:** BackgroundSyncInitializer.tsx, public/worker/index.js
- **Purpose:** Verifies client sends messages to service worker
- **Message types:**
  - MANUAL_SYNC: Trigger manual sync
  - Data: Message payload
- **Verification:**
  - SW receives client messages
  - Message includes data
  - Response sent back
  - Message handling confirmed
- **Features:**
  - Client-initiated actions
  - Message data passing
  - Response handling
  - Bidirectional flow

### TC-70.4.3: Custom Event Dispatch
- **Component:** BackgroundSyncInitializer.tsx
- **Purpose:** Verifies custom events dispatched on sync trigger
- **Event:**
  - Name: SW_SYNC_TRIGGERED
  - Detail: Sync tag
- **Verification:**
  - Event fired on sync
  - Event includes sync tag
  - Client can listen
- **Features:**
  - Custom event dispatch
  - Event detail passing
  - Window event listener
  - Sync notification

### TC-70.5.1: Go Offline → Come Online
- **Component:** public/worker/index.js
- **Purpose:** Verifies automatic sync triggers on reconnection
- **Scenario:**
  - Page online → offline → online
  - Actions performed offline
  - Auto-sync on reconnection
- **Verification:**
  - Offline mode simulated
  - Actions queued offline
  - Sync triggers automatically
  - Items synced on reconnect
- **Features:**
  - Online/offline detection
  - Queue persists offline
  - Auto-sync on reconnect
  - Background Sync API

### TC-70.5.2: Slow Connection
- **Component:** public/worker/index.js
- **Purpose:** Verifies app functions on slow connections (3G)
- **Throttling:**
  - Download: 400 kbps
  - Upload: 400 kbps
  - Latency: 400ms
- **Verification:**
  - Page loads despite slowness
  - No errors occur
  - Content available
  - Sync functions
- **Features:**
  - Network adaptation
  - Graceful degradation
  - Timeout handling
  - Retry logic

### TC-70.5.3: Connection Flaky
- **Component:** public/worker/index.js
- **Purpose:** Verifies app functions on flaky connections (Edge)
- **Throttling:**
  - Download: 240 kbps
  - Upload: 240 kbps
  - Latency: 840ms
- **Verification:**
  - Content loads despite flakiness
  - Sync retries on failure
  - App remains usable
  - No crashes
- **Features:**
  - Retry logic
  - Exponential backoff
  - Error recovery
  - Connection resilience

### TC-70.6.1: Cache Size
- **Component:** public/worker/index.js
- **Purpose:** Verifies cache sizes remain reasonable
- **Verification:**
  - Cache Storage API access
  - Cache size tracking
  - No unbounded growth
  - Old entries removed
- **Features:**
  - Cache size monitoring
  - LRU eviction
  - Storage limits
  - Automatic cleanup

### TC-70.6.2: Cache Invalidation
- **Component:** public/worker/index.js
- **Purpose:** Verifies stale cache invalidated appropriately
- **Verification:**
  - Cache loads initially
  - Server content updated
  - Offline/online cycle
  - Fresh content loads
- **Features:**
  - Version tracking
  - Cache busting
  - Stale content detection
  - Update refresh

## Service Worker Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser                                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Page/BackgroundSyncInitializer.tsx          │  │
│  │ - Registers SW                              │  │
│  │ - Sends messages to SW                      │  │
│  │ - Listens for SW messages                   │  │
│  │ - Dispatches custom events                  │  │
│  └────────────────┬────────────────────────────┘  │
│                   │ postMessage()                  │
│                   ▼                                │
│  ┌─────────────────────────────────────────────┐  │
│  │ Service Worker (public/worker/index.js)     │  │
│  │ - Listens for message events                │  │
│  │ - Handles sync events                       │  │
│  │ - Manages caches (NetworkFirst, CacheFirst) │  │
│  │ - Responds to client messages               │  │
│  │ - Syncs offline queue on reconnect          │  │
│  └────────────────┬────────────────────────────┘  │
│                   │ postMessage()                  │
│                   ▼                                │
│  ┌─────────────────────────────────────────────┐  │
│  │ Cache API                                   │  │
│  │ - Stores API responses (NetworkFirst)       │  │
│  │ - Stores assets (CacheFirst)                │  │
│  │ - Manages storage quota                     │  │
│  │ - Expires old entries                       │  │
│  └─────────────────────────────────────────────┘  │
│                   │                                │
│                   ▼                                │
│  ┌─────────────────────────────────────────────┐  │
│  │ IndexedDB (Sync Queue)                      │  │
│  │ - Persists offline actions                  │  │
│  │ - Queues for sync on reconnect              │  │
│  │ - Tracks sync status                        │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Cache Strategies

### NetworkFirst Strategy (API Calls)
1. Try to fetch from network
2. If successful, cache response and return
3. If network fails, return cached response
4. If neither available, return error

### CacheFirst Strategy (Static Assets)
1. Check cache first
2. If found, return immediately
3. If not found, fetch from network
4. Cache the response for future use

## Message Flow

### Offline Action Detection
```
User Action (offline)
    ↓
Action queued in IndexedDB
    ↓
Queue persisted
```

### Reconnection Sync Flow
```
Online event triggered
    ↓
SW detects connection
    ↓
SW reads sync queue
    ↓
SW retries failed items
    ↓
Items synced to server
    ↓
SW sends SYNC_COMPLETE message
    ↓
Client receives status update
    ↓
UI updated with sync results
```

## Performance Baselines

| Test | Duration | Threshold |
|------|----------|-----------|
| TC-70.1.1 | 1-2 sec | 5 sec |
| TC-70.1.2 | 1-2 sec | 5 sec |
| TC-70.1.3 | 1-2 sec | 5 sec |
| TC-70.2.1 | 2-3 sec | 8 sec |
| TC-70.2.2 | 2-3 sec | 8 sec |
| TC-70.2.3 | 2-3 sec | 8 sec |
| TC-70.3.1 | 1-2 sec | 5 sec |
| TC-70.3.2 | 1-2 sec | 5 sec |
| TC-70.3.3 | 1-2 sec | 5 sec |
| TC-70.4.1 | 1-2 sec | 5 sec |
| TC-70.4.2 | 1-2 sec | 5 sec |
| TC-70.4.3 | 1-2 sec | 5 sec |
| TC-70.5.1 | 2-3 sec | 8 sec |
| TC-70.5.2 | 3-4 sec | 10 sec |
| TC-70.5.3 | 3-4 sec | 10 sec |
| TC-70.6.1 | 1-2 sec | 5 sec |
| TC-70.6.2 | 2-3 sec | 8 sec |
| **Total** | 35-50 sec | 120 sec |

## Key Features Tested
- Service Worker lifecycle (registration, activation)
- Offline detection and handling
- Cache strategies (NetworkFirst, CacheFirst)
- Background Sync API
- Client-SW message passing
- Custom event dispatch
- Network state transitions (offline ↔ online)
- Network throttling (3G, Edge)
- Cache size management
- Cache invalidation and expiration
- Automatic sync on reconnection
- Manual sync triggering
- Sync status reporting
- Error handling and retry logic
- Performance under adverse conditions

## Expected Results
- Service worker registers and activates
- Content loads from cache when offline
- APIs cached with NetworkFirst strategy
- Assets cached with CacheFirst strategy
- Background sync triggers on reconnection
- Client-SW message passing works bidirectionally
- Custom events dispatch correctly
- App functions on slow connections
- App handles flaky connections gracefully
- Cache sizes remain bounded
- Stale cache properly invalidated
- All operations within performance thresholds

## Storage Specifications

### Cache Storage
- **API Cache:** Responses from Supabase calls
- **Asset Cache:** Images, CSS, fonts, JS bundles
- **Total Quota:** 50MB per app (browser limited)
- **Expiration:** Configurable TTL per cache

### IndexedDB
- **Database:** SyncQueue
- **Object Stores:**
  - `pendingItems`: Offline actions waiting to sync
  - `failedItems`: Items that failed sync
  - `syncMetadata`: Sync status and metadata
- **Indexes:** timestamp, status, itemId

## Network Conditions Tested

### 3G (Slow Connection)
- Download: 400 kbps
- Upload: 400 kbps
- Latency: 400ms
- Use case: Rural areas, poor signal

### Edge (Flaky Connection)
- Download: 240 kbps
- Upload: 240 kbps
- Latency: 840ms
- Use case: Moving between coverage areas, congestion

## Security Considerations
- Service Worker scope limited to app domain
- Cache isolation per domain
- No cross-origin cache sharing
- IndexedDB access controlled
- Message validation for client-SW communication
- HTTPS required for production SW

**Status:** ✅ READY FOR TESTING
