// This file configures the initialization of Sentry on the browser.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? "production",
  tracesSampleRate: Number.parseFloat(process.env.NEXT_PUBLIC_SENTRY_SAMPLE_RATE ?? "0.1"),
  enableLogs: true,
  sendDefaultPii: false,
  // Replay captures user sessions on errors — useful for debugging
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  integrations: [Sentry.replayIntegration()],
});
