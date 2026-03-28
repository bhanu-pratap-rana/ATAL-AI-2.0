// ATAL AI Service Worker — lightweight, no build tooling required
// Works with Next.js 16 edge runtime (no next-pwa dependency)

const CACHE_NAME = "atal-ai-v2";

// Static assets to precache on install
// v2: authenticated pages removed from precache — they are cached at runtime
// after a successful authenticated fetch, not at install time
const PRECACHE_URLS = ["/offline", "/icon-192.png", "/icon-512.png"];

// App shell routes that benefit from runtime offline caching.
// Only same-origin, non-redirected, successful navigation responses are stored.
// Uses trailing-slash boundary check to avoid matching partial path prefixes.
const RUNTIME_CACHE_ROUTES = ["/app/student/dashboard", "/app/learn"];

// Install: precache critical assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for pages/API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip Supabase auth endpoints (never cache tokens)
  if (url.hostname.includes("supabase.co") && url.pathname.includes("/auth/"))
    return;

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|otf)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Google Fonts: cache-first
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Pages: network-first with runtime caching + cached-page-first offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful, same-origin, non-redirected navigation responses
          // for routes that benefit from offline access.
          // Path check uses trailing-slash boundary to avoid matching partial prefixes.
          const isRuntimeCacheRoute = RUNTIME_CACHE_ROUTES.some(
            (r) => url.pathname === r || url.pathname.startsWith(r + "/")
          );

          if (
            response.status === 200 &&
            response.type === "basic" &&
            !response.redirected &&
            isRuntimeCacheRoute
          ) {
            // Clone before touching the body, then reconstruct with RSC Vary headers
            // removed. Next.js sets Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch
            // which would prevent caches.match() from returning entries for offline
            // navigate requests (which lack those headers). We preserve Cookie-related
            // Vary entries so personalized content is correctly scoped per user session.
            const responseToCache = response.clone();
            const headers = new Headers(responseToCache.headers);
            const vary = headers.get("Vary") || "";
            const filteredVary = vary
              .split(",")
              .map((v) => v.trim())
              .filter(
                (v) =>
                  !["RSC", "Next-Router-State-Tree", "Next-Router-Prefetch"].includes(v)
              )
              .join(", ");
            if (filteredVary) {
              headers.set("Vary", filteredVary);
            } else {
              headers.delete("Vary");
            }
            responseToCache.blob().then((body) => {
              const sanitized = new Response(body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers,
              });
              caches.open(CACHE_NAME).then((cache) => cache.put(request, sanitized));
            });
          }
          return response;
        })
        .catch((err) => {
          // Network failed — serve cached version of this page first,
          // then generic /offline page, then a minimal 503 text response.
          // (Previous bug: `caches.match("/offline") || caches.match(request)`
          //  always short-circuited because caches.match() returns a Promise
          //  (always truthy), so the cached page was never tried.)
          console.warn("[SW] fetch failed, serving offline fallback", err);
          return caches
            .match(request)
            .then((cached) => cached || caches.match("/offline"))
            .then(
              (response) =>
                response ||
                new Response("You are offline", {
                  status: 503,
                  headers: { "Content-Type": "text/plain" },
                })
            );
        })
    );
    return;
  }
});

// Background Sync: relay event to main thread (which owns Dexie + Supabase client)
//
// Architecture: mutation replay logic lives in sync-queue.ts (main thread).
// The SW can't import Dexie, so we message all open windows and let them call
// triggerMutationSync(). If no windows are open the sync happens on next open.
self.addEventListener("sync", (event) => {
  if (!event.tag.startsWith("sync-")) return;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: false })
      .then((clients) => {
        clients.forEach((client) =>
          client.postMessage({ type: "BACKGROUND_SYNC", tag: event.tag })
        );
      })
  );
});

// Handle push notifications (for future use)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: data.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Open app on notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(self.clients.openWindow(url));
});
