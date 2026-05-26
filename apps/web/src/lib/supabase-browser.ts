import { createBrowserClient } from "@supabase/ssr";

/**
 * F39: when the browser is offline and the Supabase auth client fires
 * its periodic refresh-token request, the native fetch throws
 * `TypeError: Failed to fetch`. Supabase auth-js re-wraps that into
 * the dev overlay and the same TypeError repeats every few seconds
 * until the network comes back, drowning out real errors.
 *
 * We return a synthetic 503 instead, which auth-js treats as a
 * transient server error: no TypeError, no overlay spam, and the
 * client recovers naturally on the next online tick. We only short-
 * circuit while `navigator.onLine === false` so this never masks a
 * real failure when the network is up.
 */
function offlineAwareFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (globalThis.navigator?.onLine === false) {
    return Promise.resolve(
      new Response(
        JSON.stringify({ error: "offline", message: "Network unavailable" }),
        {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }
  return fetch(input, init);
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: offlineAwareFetch } },
  );
}
